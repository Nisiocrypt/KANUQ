import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, RefreshCcw, Trophy } from "lucide-react";

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const rankStyleMap = {
  CHALLENGER: "border-rank-challenger text-rank-challenger",
  GRANDMASTER: "border-rank-grandmaster text-rank-grandmaster",
  MASTER: "border-rank-master text-rank-master",
  DIAMOND: "border-rank-diamond text-rank-diamond",
  PLATINUM: "border-rank-platinum text-rank-platinum",
  GOLD: "border-rank-gold text-rank-gold",
  SILVER: "border-rank-silver text-rank-silver",
  BRONZE: "border-rank-bronze text-rank-bronze",
  IRON: "border-rank-iron text-rank-iron",
};

const formatLp = (value) => (value >= 0 ? `+${value}` : `${value}`);
const formatUpdatedAt = (value) =>
  value ? new Date(value).toLocaleString("es-CL") : "--";

const Leaderboard = () => {
  const [summoners, setSummoners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummoners = async (refresh = true) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${API_BASE}/summoners?refresh=${refresh}`,
      );
      setSummoners(response.data || []);
    } catch (err) {
      setError("No pudimos actualizar el ranking. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummoners(true);
  }, []);

  const topGainer = useMemo(() => {
    if (!summoners.length) return null;
    return summoners.reduce((best, current) =>
      current.lp_gained > best.lp_gained ? current : best,
    );
  }, [summoners]);

  const azthiels = useMemo(() => {
    return summoners.find(
      (summoner) => summoner.riot_id?.toLowerCase() === "azthiels#exest",
    );
  }, [summoners]);

  return (
    <div className="space-y-10" data-testid="leaderboard-page">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-6" data-testid="leaderboard-hero">
          <p
            className="text-xs uppercase tracking-[0.4em] text-gold-300"
            data-testid="leaderboard-eyebrow"
          >
            LAS · Temporada activa
          </p>
          <h1
            className="font-heading text-4xl md:text-6xl uppercase tracking-tight text-gold-100"
            data-testid="leaderboard-title"
          >
            KanuQ Challenge
          </h1>
          <p
            className="text-base md:text-lg text-gold-300/80 max-w-xl"
            data-testid="leaderboard-subtitle"
          >
            Seguimos el progreso de cada invocador desde el día en que se agregó
            al ranking. El orden se actualiza según los LP ganados en Ranked
            Solo/Duo.
          </p>
          <div
            className="flex flex-wrap gap-4"
            data-testid="leaderboard-actions"
          >
            <Button
              onClick={() => fetchSummoners(true)}
              className="clip-path-hextech bg-obsidian-600 border border-gold-400 text-gold-100 hover:bg-gold-400 hover:text-obsidian-900"
              data-testid="refresh-leaderboard-button"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualizar ranking
            </Button>
            <Button
              asChild
              className="bg-transparent border border-hextech-400 text-hextech-400 hover:bg-hextech-400/10"
              data-testid="view-summoners-button"
            >
              <Link to="/gestion">Ver invocadores</Link>
            </Button>
          </div>
        </div>
        <div
          className="bg-obsidian-700/70 border border-gold-500/30 p-6 md:p-8 space-y-6"
          data-testid="leaderboard-summary-card"
        >
          <div className="flex items-center gap-3">
            <Trophy className="text-gold-400" />
            <h2
              className="font-heading text-xl uppercase tracking-widest text-gold-100"
              data-testid="leaderboard-summary-title"
            >
              Estado del circuito
            </h2>
          </div>
          <div className="grid gap-4" data-testid="leaderboard-stats">
            <div
              className="bg-obsidian-900/70 border border-hextech-400/30 p-4"
              data-testid="stats-total-summoners"
            >
              <p
                className="text-xs uppercase tracking-widest text-hextech-400"
                data-testid="stats-total-label"
              >
                Invocadores activos
              </p>
              <p
                className="font-ui text-3xl text-gold-100"
                data-testid="stats-total-value"
              >
                {summoners.length}
              </p>
            </div>
            <div
              className="bg-obsidian-900/70 border border-gold-400/30 p-4"
              data-testid="stats-top-gainer"
            >
              <p
                className="text-xs uppercase tracking-widest text-gold-300"
                data-testid="stats-top-gainer-label"
              >
                Mayor progreso
              </p>
              <p
                className="font-ui text-2xl text-gold-100"
                data-testid="stats-top-gainer-name"
              >
                {topGainer ? topGainer.riot_id : "Sin datos"}
              </p>
              <p
                className="text-sm text-gold-300"
                data-testid="stats-top-gainer-lp"
              >
                {topGainer ? `${formatLp(topGainer.lp_gained)} LP` : "--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="bg-obsidian-700/70 border border-gold-500/20 p-6 md:p-8"
        data-testid="leaderboard-table-section"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="text-hextech-400" />
            <h2
              className="font-heading text-2xl uppercase tracking-widest text-gold-100"
              data-testid="leaderboard-table-title"
            >
              Tabla de ranking
            </h2>
          </div>
        </div>

        {loading && (
          <div
            className="animate-pulse text-gold-300"
            data-testid="leaderboard-loading"
          >
            Consultando la grieta...
          </div>
        )}

        {error && (
          <div
            className="text-sm text-red-300"
            data-testid="leaderboard-error"
          >
            {error}
          </div>
        )}

        {!loading && !summoners.length && !error && (
          <div
            className="text-sm text-gold-300"
            data-testid="leaderboard-empty"
          >
            Aún no hay invocadores agregados.
          </div>
        )}

        {!!summoners.length && (
          <div className="overflow-x-auto" data-testid="leaderboard-table-wrapper">
            <Table data-testid="leaderboard-table">
              <TableHeader>
                <TableRow data-testid="leaderboard-table-header">
                  <TableHead
                    className="text-gold-300"
                    data-testid="leaderboard-header-position"
                  >
                    #
                  </TableHead>
                  <TableHead
                    className="text-gold-300"
                    data-testid="leaderboard-header-summoner"
                  >
                    Invocador
                  </TableHead>
                  <TableHead
                    className="text-gold-300"
                    data-testid="leaderboard-header-rank"
                  >
                    Rango actual
                  </TableHead>
                  <TableHead
                    className="text-gold-300"
                    data-testid="leaderboard-header-current-lp"
                  >
                    LP actual
                  </TableHead>
                  <TableHead
                    className="text-gold-300"
                    data-testid="leaderboard-header-lp-gained"
                  >
                    LP ganados
                  </TableHead>
                  <TableHead
                    className="text-gold-300"
                    data-testid="leaderboard-header-wins"
                  >
                    Victorias
                  </TableHead>
                  <TableHead
                    className="text-gold-300"
                    data-testid="leaderboard-header-updated"
                  >
                    Actualizado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summoners.map((summoner, index) => {
                  const rankClass =
                    rankStyleMap[summoner.current_tier] ||
                    "border-gold-300 text-gold-300";
                  const shouldMock =
                    azthiels &&
                    summoner.id !== azthiels.id &&
                    summoner.lp_gained < azthiels.lp_gained;
                  return (
                    <TableRow
                      key={summoner.id}
                      className="border-b border-gold-500/20 hover:bg-gold-400/5 transition-colors"
                      data-testid={`leaderboard-row-${summoner.id}`}
                    >
                      <TableCell
                        className="font-ui text-gold-100"
                        data-testid={`leaderboard-position-${summoner.id}`}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell data-testid={`leaderboard-name-${summoner.id}`}>
                        <Link
                          to={`/invocador/${summoner.id}`}
                          className="font-ui text-lg text-gold-100 hover:text-hextech-400 transition-colors"
                          data-testid={`leaderboard-name-link-${summoner.id}`}
                        >
                          {summoner.riot_id}
                        </Link>
                      </TableCell>
                      <TableCell
                        className="text-gold-100"
                        data-testid={`leaderboard-rank-${summoner.id}`}
                      >
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={`bg-transparent border ${rankClass} font-ui`}
                            data-testid={`leaderboard-rank-badge-${summoner.id}`}
                          >
                            {summoner.current_tier}
                            {summoner.current_rank
                              ? ` ${summoner.current_rank}`
                              : ""}
                          </Badge>
                          {summoner.rank_change ? (
                            <span
                              className={`text-xs font-ui ${
                                summoner.rank_change === "up"
                                  ? "text-hextech-400"
                                  : "text-red-300"
                              }`}
                              data-testid={`leaderboard-rank-change-${summoner.id}`}
                            >
                              {summoner.rank_change === "up"
                                ? "▲ Subió"
                                : "▼ Bajó"}
                            </span>
                          ) : (
                            <span
                              className="text-xs text-gold-300"
                              data-testid={`leaderboard-rank-change-${summoner.id}`}
                            >
                              Sin cambios
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="font-ui text-gold-100"
                        data-testid={`leaderboard-current-lp-${summoner.id}`}
                      >
                        {summoner.current_lp} LP
                      </TableCell>
                      <TableCell
                        className={`font-ui ${
                          summoner.lp_gained >= 0
                            ? "text-hextech-400"
                            : "text-red-300"
                        }`}
                        data-testid={`leaderboard-lp-gained-${summoner.id}`}
                      >
                        <span>{formatLp(summoner.lp_gained)} LP</span>
                        {shouldMock && (
                          <span
                            className="ml-2"
                            role="img"
                            aria-label="burlandose"
                            data-testid={`leaderboard-mock-${summoner.id}`}
                          >
                            😂
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-gold-100"
                        data-testid={`leaderboard-wins-${summoner.id}`}
                      >
                        {summoner.wins}
                      </TableCell>
                      <TableCell
                        className="text-xs text-gold-300 whitespace-nowrap"
                        data-testid={`leaderboard-updated-${summoner.id}`}
                      >
                        {formatUpdatedAt(summoner.updated_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Leaderboard;
