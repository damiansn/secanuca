export const REFEREE_MATCHES_REDIS_KEY = "chiquifutbol_referee_matches";

function parseMatchDate(value) {
  const match = String(value || "").match(/^(\d{2})-(\d{2})-(\d{2}|\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return 0;
  const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
  return new Date(year, Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0)).getTime();
}

export function toRefereeMatch(row) {
  if (!row?.id || !row.referee || !row.homeTeam || !row.awayTeam) return null;

  const homeGoals = Number(row.FTHG);
  const awayGoals = Number(row.FTAG);
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return null;

  return {
    id: String(row.id),
    date: row.matchDate,
    timestamp: parseMatchDate(row.matchDate),
    competition: row.League,
    season: row.Season,
    referee: row.referee,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    homeGoals,
    awayGoals,
  };
}
