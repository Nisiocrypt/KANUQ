import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCcw } from "lucide-react";

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SummonerDetail = () => {
  const { id } = useParams();
  const [summoner, setSummoner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetail = async (refresh = true) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${API_BASE}/summoners/${id}?refresh=${refresh}`,
      );
      setSummoner(response.data);
    } catch (err) {
      setError("No pudimos cargar el detalle del invocador.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail(true);
  }, [id]);

  const baselineDate = summoner?.baseline_set_at
    ? new Date(summoner.baseline_set_at).toLocaleString("es-CL")
    : "--";

  return (
    <div className="space-y-10" data-testid="summoner-detail-page">
      <div className="flex items-center justify-between" data-testid="detail-header">
        <Link
          to="/"
          className="text-sm text-gold-300 hover:text-gold-100"
          data-testid="back-to-leaderboard-link"
        >
          ← Volver al ranking
        </Link>
        <Button
          onClick={() => fetchDetail(true)}
          className="clip-path-hextech bg-obsidian-600 border border-gold-400 text-gold-100 hover:bg-gold-400 hover:text-obsidian-900"
          data-testid="refresh-detail-button"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refrescar datos
        </Button>
      </div>

      {loading && (
        <div className="text-gold-300" data-testid="summoner-detail-loading">
          Sincronizando con la grieta...
        </div>
      )}

      {error && (
        <div className="text-red-300" data-testid="summoner-detail-error">
          {error}
        </div>
      )}

      {summoner && !loading && (
        <div className="space-y-6" data-testid="summoner-detail-content">
          <section
            className="bg-obsidian-700/70 border border-gold-500/20 p-6 md:p-8"
            data-testid="summoner-detail-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-hextech-400" />
              <h1
                className="font-heading text-3xl uppercase tracking-widest text-gold-100"
                data-testid="summoner-detail-name"
              >
                {summoner.riot_id}
              </h1>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div data-testid="summoner-detail-rank-block">
                <p
                  className="text-xs uppercase tracking-widest text-gold-300"
                  data-testid="summoner-detail-rank-label"
                >
                  Rango actual
                </p>
                <Badge
                  className="mt-2 bg-transparent border border-hextech-400 text-hextech-400 font-ui"
                  data-testid="summoner-detail-rank"
                >
                  {summoner.current_tier}
                  {summoner.current_rank ? ` ${summoner.current_rank}` : ""}
                </Badge>
              </div>
              <div data-testid="summoner-detail-current-lp-block">
                <p
                  className="text-xs uppercase tracking-widest text-gold-300"
                  data-testid="summoner-detail-current-lp-label"
                >
                  LP actual
                </p>
                <p
                  className="font-ui text-3xl text-gold-100"
                  data-testid="summoner-detail-current-lp"
                >
                  {summoner.current_lp} LP
                </p>
              </div>
              <div data-testid="summoner-detail-lp-gained-block">
                <p
                  className="text-xs uppercase tracking-widest text-gold-300"
                  data-testid="summoner-detail-lp-gained-label"
                >
                  LP ganados
                </p>
                <p
                  className={`font-ui text-3xl ${
                    summoner.lp_gained >= 0
                      ? "text-hextech-400"
                      : "text-red-300"
                  }`}
                  data-testid="summoner-detail-lp-gained"
                >
                  {summoner.lp_gained >= 0
                    ? `+${summoner.lp_gained}`
                    : summoner.lp_gained} LP
                </p>
              </div>
            </div>
          </section>

          <section
            className="grid gap-4 md:grid-cols-2"
            data-testid="summoner-detail-stats"
          >
            <div
              className="bg-obsidian-700/70 border border-gold-500/20 p-6"
              data-testid="summoner-detail-baseline-card"
            >
              <p
                className="text-xs uppercase tracking-widest text-gold-300"
                data-testid="summoner-detail-baseline-label"
              >
                Baseline registrada
              </p>
              <p
                className="font-ui text-2xl text-gold-100"
                data-testid="summoner-detail-baseline-lp"
              >
                {summoner.baseline_lp} LP
              </p>
              <p
                className="text-sm text-gold-300"
                data-testid="summoner-detail-baseline-date"
              >
                {baselineDate}
              </p>
            </div>
            <div
              className="bg-obsidian-700/70 border border-gold-500/20 p-6"
              data-testid="summoner-detail-wins-card"
            >
              <p
                className="text-xs uppercase tracking-widest text-gold-300"
                data-testid="summoner-detail-performance-label"
              >
                Rendimiento actual
              </p>
              <p
                className="font-ui text-2xl text-gold-100"
                data-testid="summoner-detail-wins"
              >
                {summoner.wins} Victorias
              </p>
              <p
                className="text-sm text-gold-300"
                data-testid="summoner-detail-losses"
              >
                {summoner.losses} Derrotas
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SummonerDetail;
