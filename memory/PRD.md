# KanuQ Challenge – PRD

## Problem Statement
Necesito que hagas una página pública para rankear usuarios según el LP que ganen en LoL, consumiendo la API oficial de Riot. Debe consultar invocador, LPs y liga actual, y rankear por LP ganados desde que se agrega al sistema. Región soportada: LAS. Título: KanuQ Challenge.

## Architecture Decisions
- **Frontend:** React + Tailwind + shadcn/ui, rutas para Ranking, Invocadores y Detalle.
- **Backend:** FastAPI con integración Riot API (Account-V1 + Summoner-V4 + League-V4 by PUUID).
- **DB:** MongoDB (colección `summoners`) para baseline y estado actual.
- **Cálculo:** LP ganados = LP actual - baseline LP (baseline al momento de agregar).

## Implemented Features
- Alta de invocadores con Riot ID (GameName#TAG) desde UI.
- Ranking público por LP ganados con refresco desde Riot API.
- Detalle de invocador (LP actual, LP ganados, baseline, W/L, rango actual).
- Gestión de invocadores con lista y navegación.
- UI temática Hextech con data-testid en elementos críticos.

## Prioritized Backlog
### P0
- Manejo de errores avanzados para rate limits (UX + retries).
- Cache de respuestas de Riot para reducir llamadas.

### P1
- Historial de evolución de LP (gráfico por fecha).
- Exportar ranking (CSV).

### P2
- Notificaciones de hitos (LP ganados por día/semana).
- Filtros por rango o cola.
