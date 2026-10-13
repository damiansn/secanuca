"use client";

import { useEffect, useMemo, useState } from "react";

const styles = {
  input: {
    width: "min(180px, 24vw)",
    minWidth: "120px",
    height: "32px",
    padding: "0 9px",
    border: "1px solid #344154",
    background: "#141e2b",
    color: "#e2e8f0",
    fontSize: "11px",
  },
  panel: {
    maxHeight: "min(60vh, 420px)",
    overflow: "auto",
    border: "1px solid #263244",
    background: "#1a2535",
    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
  },
  option: {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    border: 0,
    borderBottom: "1px solid #1e2d3d",
    background: "transparent",
    color: "#e2e8f0",
    textAlign: "left",
    cursor: "pointer",
  },
};

function obtenerNombre(fixture) {
  return fixture?.opponent
    || fixture?.rival
    || fixture?.opponent_name
    || fixture?.rival_name
    || fixture?.vs
    || fixture?.team_opponent
    || fixture?.teamOpponent
    || "Rival por confirmar";
}

function obtenerCondicion(fixture) {
  const condicion = String(
    fixture?.condicion
      || fixture?.homeAway
      || fixture?.home_away
      || fixture?.condition
      || fixture?.local_visitante
      || fixture?.localVisitante
      || ""
  ).trim().toUpperCase();
  if (condicion === "L" || condicion.includes("LOCAL")) return "Local";
  if (condicion === "V" || condicion.includes("VISIT")) return "Visitante";
  return "";
}

function obtenerCompetencia(fixture) {
  return fixture?.competencia || fixture?.competition || fixture?.league || fixture?.tournament || "";
}

function obtenerFechaHora(fixture) {
  const fecha = fixture?.date || fixture?.fecha || fixture?.day || "--/--";
  const hora = fixture?.hora || fixture?.time || fixture?.hour || fixture?.start_time || "--:--";
  const fechaParts = String(fecha).trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  const horaParts = String(hora).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!fechaParts || !horaParts) return `${fecha} · ${hora}`;

  const year = Number(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
  }).format(new Date()));
  const corrected = new Date(Date.UTC(
    year,
    Number(fechaParts[2]) - 1,
    Number(fechaParts[1]),
    Number(horaParts[1]) + 2,
    Number(horaParts[2])
  ));
  const pad = value => String(value).padStart(2, "0");
  return `${pad(corrected.getUTCDate())}/${pad(corrected.getUTCMonth() + 1)} · ${pad(corrected.getUTCHours())}:${pad(corrected.getUTCMinutes())}`;
}

export default function TeamSearch() {
  const [teams, setTeams] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [teamListError, setTeamListError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadTeams() {
      try {
        const response = await fetch("/api/team-fixture?list=true", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudieron cargar los equipos.");
        if (!Array.isArray(result)) throw new Error("La lista de equipos recibida no es válida.");
        setTeams(result);
        setTeamListError("");
      } catch (requestError) {
        if (requestError.name !== "AbortError") setTeamListError(requestError.message);
      }
    }
    loadTeams();
    return () => controller.abort();
  }, []);

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    if (!normalizedQuery || selectedTeam) return [];
    return teams
      .filter(team => (team.name || team.nombre || "").toLocaleLowerCase("es").includes(normalizedQuery))
      .slice(0, 10);
  }, [query, teams, selectedTeam]);

  async function selectTeam(team) {
    setSelectedTeam(team);
    setQuery(team.name || team.nombre || "");
    setFixtures([]);
    setLoadingFixtures(true);
    setError("");
    try {
      const teamId = team.id || team.team_id || team.teamId;
      const response = await fetch(`/api/team-fixture?team=${encodeURIComponent(teamId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar el fixture.");
      const nextFixtures = Array.isArray(result)
        ? result
        : Array.isArray(result.fixtures)
          ? result.fixtures
          : Array.isArray(result.matches)
            ? result.matches
            : null;
      if (!nextFixtures) throw new Error("El fixture recibido no tiene un formato válido.");
      setFixtures(nextFixtures);
    } catch (requestError) {
      setError(requestError.message || "Error al cargar el fixture.");
    } finally {
      setLoadingFixtures(false);
    }
  }

  function clearSelection() {
    setSelectedTeam(null);
    setQuery("");
    setFixtures([]);
    setError("");
  }

  return (
    <div className="team-search">
      <input
        type="search"
        value={query}
        onChange={event => {
          setQuery(event.target.value);
          setSelectedTeam(null);
          setFixtures([]);
          setError("");
        }}
        onKeyDown={event => {
          if (event.key === "Escape") {
            setQuery("");
            setSelectedTeam(null);
            setFixtures([]);
            setError("");
          }
        }}
        placeholder="Buscar equipo..."
        aria-label="Buscar equipo"
        aria-controls={query.trim() || error || teamListError ? "team-search-panel" : undefined}
        style={styles.input}
      />
      {(query.trim() || error || teamListError) && (
        <div id="team-search-panel" className="team-search-panel" style={styles.panel}>
          {(teamListError || error) && <div role="alert" style={{ padding: 9, color: "#ef4444" }}>{teamListError || error}</div>}
          {!teamListError && !error && !selectedTeam && filteredTeams.length > 0 && (
            <div role="listbox" aria-label="Equipos encontrados">
              {filteredTeams.map(team => (
                <button
                  key={team.id || team.name}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => selectTeam(team)}
                  style={styles.option}
                >
                  {team.name || team.nombre}
                </button>
              ))}
            </div>
          )}
          {!teamListError && !error && !selectedTeam && query.trim() && filteredTeams.length === 0 && (
            <div role="status" style={{ padding: 9, color: "#94a3b8" }}>
              {teams.length === 0 ? "Cargando equipos..." : "No se encontraron equipos."}
            </div>
          )}
          {selectedTeam && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 9px", background: "#f59e0b", color: "#111", fontWeight: 700 }}>
                <span>PRÓXIMOS PARTIDOS: {(selectedTeam.name || selectedTeam.nombre).toUpperCase()}</span>
                <button type="button" onClick={clearSelection} aria-label="Cerrar fixture" style={{ border: 0, background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}>×</button>
              </div>
              {loadingFixtures ? (
                <div style={{ padding: 12, color: "#94a3b8" }}>Cargando fixture...</div>
              ) : fixtures.length === 0 ? (
                <div style={{ padding: 12, color: "#94a3b8" }}>Sin próximos partidos.</div>
              ) : (
                fixtures.map((fixture, index) => {
                  const homeAway = obtenerCondicion(fixture);
                  const teamName = selectedTeam.name || selectedTeam.nombre;
                  const opponent = obtenerNombre(fixture);
                  const local = homeAway === "Visitante" ? opponent : teamName;
                  const visitante = homeAway === "Visitante" ? teamName : opponent;
                  return (
                    <div key={fixture?.id || `${teamName}-${index}`} style={{ display: "grid", gridTemplateColumns: "66px minmax(0, 1fr)", gap: "2px 8px", padding: "7px 9px", borderTop: "1px solid #1e2d3d", background: index % 2 === 0 ? "#1a2535" : "#141e2b" }}>
                      <span style={{ color: "#94a3b8" }}>{obtenerFechaHora(fixture)}</span>
                      <strong style={{ color: "#e2e8f0" }}>{local} – {visitante}</strong>
                      <span style={{ gridColumn: "1 / -1", color: "#94a3b8" }}>{obtenerCompetencia(fixture)}</span>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
