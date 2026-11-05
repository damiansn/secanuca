export const REFEREE_MATCHES_REDIS_KEY = "chiquifutbol_referee_matches";

function parseMatchDate(value) {
  const date = String(value || "").trim();
  const dayFirst = date.match(/^(\d{2})[/-](\d{2})[/-](\d{2}|\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  const yearFirst = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (!dayFirst && !yearFirst) return null;

  const day = Number(dayFirst ? dayFirst[1] : yearFirst[3]);
  const month = Number(dayFirst ? dayFirst[2] : yearFirst[2]);
  const rawYear = Number(dayFirst ? dayFirst[3] : yearFirst[1]);
  const year = dayFirst && rawYear < 100 ? 2000 + rawYear : rawYear;
  const hours = Number((dayFirst || yearFirst)[4] || 0);
  const minutes = Number((dayFirst || yearFirst)[5] || 0);
  const parsed = new Date(year, month - 1, day, hours, minutes);

  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
    || hours > 23
    || minutes > 59
  ) {
    return null;
  }

  return {
    date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
    timestamp: parsed.getTime(),
  };
}

function parseInteger(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function getValue(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null) return row[key];
  }
  return "";
}

function normalizeIdPart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const TEAM_ALIASES = new Map([
  ["river", "River Plate"],
  ["riverplate", "River Plate"],
  ["boca", "Boca Juniors"],
  ["bocajuniors", "Boca Juniors"],
  ["independiente", "Independiente"],
  ["racing", "Racing Club"],
  ["racingclub", "Racing Club"],
  ["sanlorenzo", "San Lorenzo"],
  ["lanus", "Lanús"],
  ["estudiantes", "Estudiantes de La Plata"],
  ["estudiantesdelaplata", "Estudiantes de La Plata"],
  ["huracan", "Huracán"],
  ["argentinos", "Argentinos Juniors"],
  ["argentinosjuniors", "Argentinos Juniors"],
  ["talleres", "Talleres"],
  ["tallerescordoba", "Talleres"],
  ["union", "Unión"],
  ["unionsantaafe", "Unión"],
  ["sarmiento", "Sarmiento"],
  ["sarmientodejunin", "Sarmiento"],
  ["rosariocentral", "Rosario Central"],
  ["aldosivi", "Aldosivi"],
  ["defensayjusticia", "Defensa y Justicia"],
  ["velez", "Vélez Sarsfield"],
  ["velezsarsfield", "Vélez Sarsfield"],
  ["newells", "Newell's Old Boys"],
  ["newellsoldboys", "Newell's Old Boys"],
  ["riestra", "Deportivo Riestra"],
  ["deportivoriestra", "Deportivo Riestra"],
  ["centralcordoba", "Central Córdoba"],
  ["centralcordobasantiago", "Central Córdoba"],
  ["independientemendoza", "Independiente Rivadavia"],
  ["independienterivadavia", "Independiente Rivadavia"],
  ["atletico", "Atlético Tucumán"],
  ["atleticotucuman", "Atlético Tucumán"],
  ["gimnasiamendoza", "Gimnasia Mendoza"],
  ["estudiantesriocuarto", "Estudiantes Río Cuarto"],
  ["barracas", "Barracas Central"],
  ["barracascentral", "Barracas Central"],
]);

export function canonicalizeTeamName(value) {
  const team = String(value || "").trim();
  return TEAM_ALIASES.get(normalizeIdPart(team)) || team;
}

export function refereeMatchIdentity(match) {
  if (!match.homeTeam || !match.awayTeam) return match.id;
  return [
    match.date,
    match.country,
    canonicalizeTeamName(match.homeTeam),
    canonicalizeTeamName(match.awayTeam),
  ].map(normalizeIdPart).join("|");
}

export function toRefereeMatch(row) {
  const dateValue = getValue(row, "Date", "matchDate", "date");
  const parsedDate = parseMatchDate(dateValue);
  const referee = String(getValue(row, "Referee", "referee") || "").trim();
  const homeTeam = canonicalizeTeamName(getValue(row, "HomeTeam", "homeTeam"));
  const awayTeam = canonicalizeTeamName(getValue(row, "AwayTeam", "awayTeam"));
  const homeGoals = parseInteger(getValue(row, "FTHG"));
  const awayGoals = parseInteger(getValue(row, "FTAG"));

  if (!parsedDate || !referee || homeGoals === null || awayGoals === null) return null;

  const competition = String(getValue(row, "League", "league") || "").trim();
  const season = String(getValue(row, "Season", "season") || "").trim();
  const result = String(getValue(row, "FTR", "ftr") || "").trim().toUpperCase();
  const id = String(row?.id || [
    "csv",
    parsedDate.date,
    season,
    competition,
    homeTeam,
    awayTeam,
    referee,
    homeGoals,
    awayGoals,
  ].map(normalizeIdPart).join("-"));

  return {
    id,
    date: parsedDate.date,
    timestamp: parsedDate.timestamp,
    country: String(getValue(row, "Country", "country") || "").trim(),
    competition,
    season,
    referee,
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    fullTimeResult: ["H", "A", "D"].includes(result)
      ? result
      : homeGoals > awayGoals ? "H" : homeGoals < awayGoals ? "A" : "D",
    fouls: parseInteger(getValue(row, "Fouls", "fouls")),
    cards: parseInteger(getValue(row, "Cards", "YellowCards", "cards", "yellowCards")),
    reds: parseInteger(getValue(row, "Reds", "RedCards", "reds", "redCards")),
    penalties: parseInteger(getValue(row, "Penalties", "penalties")),
  };
}
