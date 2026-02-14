from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from bson import ObjectId
import httpx
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
summoners_collection = db["summoners"]

RIOT_API_KEY = os.environ.get("RIOT_API_KEY")
RIOT_PLATFORM = os.environ.get("RIOT_PLATFORM", "LA2")
RIOT_REGION_ROUTING = os.environ.get("RIOT_REGION_ROUTING", "americas")

app = FastAPI()
api_router = APIRouter(prefix="/api")


class SummonerCreate(BaseModel):
    riot_id: str = Field(..., description="Formato GameName#TAG")


class SummonerResponse(BaseModel):
    id: str
    riot_id: str
    game_name: str
    tag_line: str
    current_lp: int
    current_tier: str
    current_rank: str
    wins: int
    losses: int
    lp_gained: int
    baseline_lp: int
    baseline_set_at: datetime
    updated_at: datetime
    summoner_level: Optional[int] = None
    profile_icon_id: Optional[int] = None


class RiotApiClient:
    def __init__(self) -> None:
        if not RIOT_API_KEY:
            raise HTTPException(status_code=500, detail="Riot API key no configurada")
        self.headers = {
            "X-Riot-Token": RIOT_API_KEY,
            "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
        }

    async def _get(self, url: str) -> Optional[dict]:
        async with httpx.AsyncClient(timeout=10) as client_http:
            response = await client_http.get(url, headers=self.headers)
        if response.status_code == 404:
            return None
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit de Riot alcanzado")
        response.raise_for_status()
        return response.json()

    async def get_account_by_riot_id(self, game_name: str, tag_line: str) -> Optional[dict]:
        game_encoded = quote(game_name)
        tag_encoded = quote(tag_line)
        url = (
            f"https://{RIOT_REGION_ROUTING}.api.riotgames.com/"
            f"riot/account/v1/accounts/by-riot-id/{game_encoded}/{tag_encoded}"
        )
        return await self._get(url)

    async def get_summoner_by_puuid(self, puuid: str) -> Optional[dict]:
        url = (
            f"https://{RIOT_PLATFORM.lower()}.api.riotgames.com/"
            f"lol/summoner/v4/summoners/by-puuid/{puuid}"
        )
        return await self._get(url)

    async def get_league_entries(self, puuid: str) -> List[dict]:
        url = (
            f"https://{RIOT_PLATFORM.lower()}.api.riotgames.com/"
            f"lol/league/v4/entries/by-puuid/{puuid}"
        )
        data = await self._get(url)
        return data or []


def parse_riot_id(riot_id: str) -> Tuple[str, str]:
    if "#" not in riot_id:
        raise HTTPException(status_code=400, detail="Formato inválido. Usa GameName#TAG")
    game_name, tag_line = riot_id.split("#", 1)
    game_name = game_name.strip()
    tag_line = tag_line.strip()
    if not game_name or not tag_line:
        raise HTTPException(status_code=400, detail="GameName y TAG son obligatorios")
    return game_name, tag_line


def extract_ranked_data(league_entries: List[dict]) -> dict:
    for entry in league_entries:
        if entry.get("queueType") == "RANKED_SOLO_5x5":
            return {
                "current_lp": entry.get("leaguePoints", 0),
                "current_tier": entry.get("tier", "UNRANKED"),
                "current_rank": entry.get("rank", ""),
                "wins": entry.get("wins", 0),
                "losses": entry.get("losses", 0),
            }
    return {
        "current_lp": 0,
        "current_tier": "UNRANKED",
        "current_rank": "",
        "wins": 0,
        "losses": 0,
    }


def build_response(doc: dict) -> SummonerResponse:
    baseline_lp = doc.get("baseline_lp", 0)
    current_lp = doc.get("current_lp", 0)
    updated_at = doc.get("updated_at") or doc.get("created_at")
    return SummonerResponse(
        id=str(doc.get("_id")),
        riot_id=doc.get("riot_id"),
        game_name=doc.get("game_name"),
        tag_line=doc.get("tag_line"),
        current_lp=current_lp,
        current_tier=doc.get("current_tier", "UNRANKED"),
        current_rank=doc.get("current_rank", ""),
        wins=doc.get("wins", 0),
        losses=doc.get("losses", 0),
        lp_gained=current_lp - baseline_lp,
        baseline_lp=baseline_lp,
        baseline_set_at=doc.get("baseline_set_at") or updated_at,
        updated_at=updated_at,
        summoner_level=doc.get("summoner_level"),
        profile_icon_id=doc.get("profile_icon_id"),
    )


async def refresh_summoner_stats(doc: dict, riot_client: RiotApiClient) -> dict:
    league_entries = await riot_client.get_league_entries(doc["puuid"])
    ranked_data = extract_ranked_data(league_entries)
    update_payload = {
        **ranked_data,
        "updated_at": datetime.now(timezone.utc),
    }
    await summoners_collection.update_one(
        {"_id": doc["_id"]},
        {"$set": update_payload},
    )
    doc.update(update_payload)
    return doc


@api_router.get("/health")
async def health_check():
    return {"status": "ok"}


@api_router.post("/summoners", response_model=SummonerResponse)
async def add_summoner(payload: SummonerCreate):
    game_name, tag_line = parse_riot_id(payload.riot_id)
    riot_client = RiotApiClient()
    account_data = await riot_client.get_account_by_riot_id(game_name, tag_line)
    if not account_data:
        raise HTTPException(status_code=404, detail="Invocador no encontrado")

    puuid = account_data.get("puuid")
    summoner_data = await riot_client.get_summoner_by_puuid(puuid)
    if not summoner_data:
        raise HTTPException(status_code=404, detail="Invocador no encontrado")

    league_entries = await riot_client.get_league_entries(puuid)
    ranked_data = extract_ranked_data(league_entries)

    now = datetime.now(timezone.utc)
    riot_id_formatted = f"{game_name}#{tag_line}"

    existing = await summoners_collection.find_one({"puuid": puuid})
    if existing:
        update_payload = {
            "riot_id": riot_id_formatted,
            "game_name": game_name,
            "tag_line": tag_line,
            "platform": RIOT_PLATFORM,
            "summoner_level": summoner_data.get("summonerLevel"),
            "profile_icon_id": summoner_data.get("profileIconId"),
            **ranked_data,
            "updated_at": now,
        }
        await summoners_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": update_payload},
        )
        existing.update(update_payload)
        return build_response(existing)

    insert_payload = {
        "riot_id": riot_id_formatted,
        "game_name": game_name,
        "tag_line": tag_line,
        "puuid": puuid,
        "platform": RIOT_PLATFORM,
        "summoner_level": summoner_data.get("summonerLevel"),
        "profile_icon_id": summoner_data.get("profileIconId"),
        "baseline_lp": ranked_data["current_lp"],
        "baseline_set_at": now,
        "created_at": now,
        "updated_at": now,
        **ranked_data,
    }
    result = await summoners_collection.insert_one(insert_payload)
    insert_payload["_id"] = result.inserted_id
    return build_response(insert_payload)


@api_router.get("/summoners", response_model=List[SummonerResponse])
async def list_summoners(refresh: bool = Query(True)):
    docs = await summoners_collection.find({}).to_list(1000)
    riot_client = RiotApiClient()
    results = []
    for doc in docs:
        if refresh:
            try:
                doc = await refresh_summoner_stats(doc, riot_client)
            except HTTPException as exc:
                logger.warning("No se pudo refrescar %s: %s", doc.get("riot_id"), exc.detail)
            except Exception as exc:
                logger.warning("Error inesperado refrescando %s: %s", doc.get("riot_id"), exc)
        results.append(build_response(doc))
    results.sort(key=lambda item: item.lp_gained, reverse=True)
    return results


@api_router.get("/summoners/{summoner_id}", response_model=SummonerResponse)
async def get_summoner_detail(summoner_id: str, refresh: bool = Query(True)):
    try:
        object_id = ObjectId(summoner_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="ID inválido") from exc

    doc = await summoners_collection.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Invocador no encontrado")

    if refresh:
        riot_client = RiotApiClient()
        try:
            doc = await refresh_summoner_stats(doc, riot_client)
            summoner_data = await riot_client.get_summoner_by_puuid(doc["puuid"])
            if summoner_data:
                update_payload = {
                    "summoner_level": summoner_data.get("summonerLevel"),
                    "profile_icon_id": summoner_data.get("profileIconId"),
                }
                await summoners_collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": update_payload},
                )
                doc.update(update_payload)
        except HTTPException as exc:
            logger.warning("No se pudo refrescar detalle %s: %s", doc.get("riot_id"), exc.detail)
        except Exception as exc:
            logger.warning("Error inesperado refrescando detalle %s: %s", doc.get("riot_id"), exc)

    return build_response(doc)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()