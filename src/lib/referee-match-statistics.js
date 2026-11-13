function normalizeStatisticName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function sumValues(values) {
  if (!Array.isArray(values)) return null;

  const numbers = values
    .map(value => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
      return null;
    })
    .filter(value => Number.isInteger(value) && value >= 0);

  return numbers.length > 0 ? numbers.reduce((total, value) => total + value, 0) : null;
}

export function extractRefereeMatchStatistics(game) {
  const statistics = Array.isArray(game?.statistics) ? game.statistics : [];
  const result = {
    fouls: null,
    cards: null,
    reds: null,
    penalties: null,
  };

  for (const statistic of statistics) {
    const name = normalizeStatisticName(statistic?.name);
    let field = null;

    if (name.includes("falta") || name.includes("foul")) {
      field = "fouls";
    } else if (name.includes("amarilla") || name.includes("yellowcard")) {
      field = "cards";
    } else if (name.includes("roja") || name.includes("redcard")) {
      field = "reds";
    } else if (
      (name.includes("penal") || name.includes("penalty"))
      && !name.includes("atajad")
      && !name.includes("convertid")
    ) {
      field = "penalties";
    }

    if (field && result[field] === null) {
      result[field] = sumValues(statistic.values);
    }
  }

  if (result.penalties === null && Array.isArray(game?.events)) {
    const events = game.events.flatMap(stage => (
      Array.isArray(stage?.rows)
        ? stage.rows.flatMap(row => Array.isArray(row?.events) ? row.events : [])
        : []
    ));
    if (events.length > 0) {
      result.penalties = events.filter(event => [3, 10].includes(Number(event?.type))).length;
    }
  }

  return result;
}
