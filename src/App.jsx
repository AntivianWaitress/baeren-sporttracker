import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Dumbbell, Ruler, TrendingUp, Database, ListChecks, Plus, Minus, Trash2,
  Download, Upload, ChevronDown, ChevronUp, Check,
} from "lucide-react";

const STORAGE_KEY = "sport-tracker-v1";
const memoryStore = {};

function normalize(d) {
  return {
    workouts: Array.isArray(d?.workouts) ? d.workouts : [],
    measurements: Array.isArray(d?.measurements) ? d.measurements : [],
    exerciseLibrary: Array.isArray(d?.exerciseLibrary) ? d.exerciseLibrary : [],
  };
}

function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    if (memoryStore[STORAGE_KEY]) return normalize(JSON.parse(memoryStore[STORAGE_KEY]));
  }
  return normalize({});
}

function saveData(data) {
  const raw = JSON.stringify(data);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch (e) {
    memoryStore[STORAGE_KEY] = raw;
  }
}


const SUPABASE_URL = "https://lhfphavogdvnzwuvnyur.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_K_sJ6M5Enb7vfueJJvNN-Q_QvaDckvR";

const TOKEN_KEY = "sport-tracker-token";

function getToken() {
  let fromHash = null;
  try {
    const m = (window.location.hash || "").match(/k=([A-Za-z0-9_-]+)/);
    if (m) fromHash = m[1];
  } catch (e) {}
  if (fromHash) {
    try { window.localStorage.setItem(TOKEN_KEY, fromHash); } catch (e) {}
    return fromHash;
  }
  try { return window.localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

function syncConfigured() {
  return (
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("DEIN-PROJEKT") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    !SUPABASE_ANON_KEY.includes("DEIN-ANON-KEY")
  );
}

async function rpc(name, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const SYNC_LABELS = {
  lokal: "Nur auf diesem Gerät gespeichert",
  lade: "Synchronisiere …",
  ok: "Synchronisiert",
  offline: "Offline – Änderungen werden nachgetragen",
  fehler: "Sync-Fehler – Daten bleiben lokal gesichert",
};

/* ----------------------------- Konstanten ---------------------------- */

const WORKOUT_TYPES = [
  { id: "ok1", label: "Oberkörper I", color: "#3DF06C" },
  { id: "ok2", label: "Oberkörper II", color: "#9B5CFF" },
  { id: "uk", label: "Unterkörper", color: "#B6F542" },
  { id: "cardio", label: "Ausdauer", color: "#C9A7FF" },
];

const MEASURES = [
  { key: "bizeps", label: "Bizeps (Arm)" },
  { key: "unterarm", label: "Unterarm" },
  { key: "brust", label: "Brust" },
  { key: "bauch", label: "Bauch" },
  { key: "oberschenkel", label: "Oberschenkel" },
  { key: "unterschenkel", label: "Unterschenkel" },
];

const TOOLTIP_STYLE = {
  background: "#141418",
  border: "1px solid #26262C",
  borderRadius: 8,
  color: "#F2F4F1",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function monthLabel(ym) {
  const names = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const [y, m] = ym.split("-");
  return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function typeById(id) {
  return WORKOUT_TYPES.find((t) => t.id === id) || WORKOUT_TYPES[0];
}

/* ------------------------------- Styles ------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Outfit:wght@400;600;700;800&display=swap');

:root {
  --bg: #0B0B0D;
  --card: #141418;
  --ink: #F2F4F1;
  --muted: #8F979F;
  --line: #26262C;
  --green: #3DF06C;
  --green-soft: rgba(61, 240, 108, 0.12);
  --purple: #9B5CFF;
  --purple-deep: #5B21B6;
  --danger: #FF6B5E;
  --grad: linear-gradient(120deg, #2EE066 0%, #7A2FE0 100%);
}

* { box-sizing: border-box; }

.st-app {
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  max-width: 520px;
  margin: 0 auto;
  padding-bottom: 84px;
}

.st-header {
  padding: 20px 16px 8px;
}
.st-header h1 {
  font-family: 'Luckiest Guy', 'Outfit', sans-serif;
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 0.04em;
  margin: 0;
  color: var(--green);
  text-shadow: 2px 2px 0 var(--purple-deep), 0 0 16px rgba(61, 240, 108, 0.35);
}
.st-header .sub {
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}

.st-content { padding: 8px 12px 16px; }

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
}

.section-title {
  font-family: 'Luckiest Guy', 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--purple);
  text-shadow: 0 0 10px rgba(155, 92, 255, 0.35);
  margin: 18px 4px 8px;
}

button { font-family: inherit; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  background: var(--grad);
  color: #0B0B0D;
}
.btn:active { transform: scale(0.98); }
.btn.secondary {
  background: var(--green-soft);
  color: var(--green);
  border: 1px solid rgba(61, 240, 108, 0.35);
}
.btn.ghost {
  background: transparent;
  color: var(--muted);
  padding: 8px;
  border: none;
}
.btn.danger-ghost {
  background: transparent;
  color: var(--danger);
  padding: 8px;
}
.btn.full { width: 100%; justify-content: center; }

.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.type-btn {
  border: 1px solid var(--line);
  background: #1A1A1F;
  border-radius: 12px;
  padding: 14px 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  color: var(--ink);
  border-left-width: 5px;
}

input, select {
  font-family: inherit;
  font-size: 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  background: #1A1A1F;
  color: var(--ink);
  width: 100%;
}
input::placeholder { color: #5C636B; }
input:focus, select:focus, button:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}
input[type="date"] { color-scheme: dark; }

.row { display: flex; gap: 8px; align-items: center; }

.workout-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.type-pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  color: #0B0B0D;
}
.workout-date { font-weight: 800; font-size: 16px; }

.exercise-block {
  border-top: 1px solid var(--line);
  margin-top: 12px;
  padding-top: 10px;
}
.exercise-name {
  font-weight: 800;
  font-size: 15px;
}
.last-hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 1px;
}

.set-row {
  display: grid;
  grid-template-columns: 22px 1fr 1fr 34px;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.set-num {
  font-family: 'Luckiest Guy', sans-serif;
  font-size: 14px;
  color: var(--green);
  text-align: center;
}

.stepper {
  display: grid;
  grid-template-columns: 38px 1fr 38px;
  align-items: stretch;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: #1A1A1F;
}
.stepper button {
  border: none;
  background: var(--green-soft);
  color: var(--green);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
}
.stepper .val {
  text-align: center;
  font-weight: 800;
  font-size: 15px;
  border: none;
  border-radius: 0;
  padding: 6px 2px;
  width: 100%;
  background: transparent;
}
.stepper .val:focus { outline: none; background: rgba(155, 92, 255, 0.15); }
.stepper-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-align: center;
  margin-bottom: 2px;
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn.danger { color: var(--danger); }

.measure-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}
.measure-field label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 4px;
}

.chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.chip.on { color: #0B0B0D; }

.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 520px;
  margin: 0 auto;
  background: #101013;
  border-top: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 6px 2px calc(6px + env(safe-area-inset-bottom));
}
.tabbar button {
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  padding: 6px 0;
  border-radius: 10px;
}
.tabbar button.active {
  color: var(--green);
  text-shadow: 0 0 10px rgba(61, 240, 108, 0.5);
}

.sync-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  background: #5C636B;
  vertical-align: 1px;
}
.sync-dot.ok { background: var(--green); box-shadow: 0 0 8px rgba(61, 240, 108, 0.6); }
.sync-dot.lade { background: var(--purple); }
.sync-dot.offline { background: #F0B43D; }
.sync-dot.fehler { background: var(--danger); }

.empty {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  padding: 24px 12px;
}

.chart-card { height: 260px; }

.toast {
  position: fixed;
  bottom: 92px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--green);
  color: #0B0B0D;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  z-index: 50;
  box-shadow: 0 0 18px rgba(61, 240, 108, 0.4);
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
`;

/* ------------------------------ Stepper ------------------------------ */

function Stepper({ label, value, step, min, onChange, suffix }) {
  const dec = () => onChange(Math.max(min, round1(value - step)));
  const inc = () => onChange(round1(value + step));
  return (
    <div>
      <div className="stepper-label">{label}{suffix ? ` (${suffix})` : ""}</div>
      <div className="stepper">
        <button type="button" onClick={dec} aria-label={`${label} verringern`}>
          <Minus size={16} />
        </button>
        <input
          className="val"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = parseFloat(String(e.target.value).replace(",", "."));
            onChange(isNaN(v) ? 0 : v);
          }}
          aria-label={label}
        />
        <button type="button" onClick={inc} aria-label={`${label} erhöhen`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/* ------------------------------- App --------------------------------- */

export default function SportTracker() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState("training");
  const [toast, setToast] = useState(null);

  const token = useMemo(getToken, []);
  const canSync = syncConfigured() && !!token;
  const [sync, setSync] = useState(canSync ? "lade" : "lokal");

  const dataRef = useRef(data);
  dataRef.current = data;
  const readyRef = useRef(!canSync);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);

  const pushRemote = async () => {
    if (!canSync) return;
    try {
      await rpc("set_tracker_data", { p_secret: token, p_data: dataRef.current });
      dirtyRef.current = false;
      setSync("ok");
    } catch (e) {
      setSync("offline");
    }
  };

  const pullRemote = async () => {
    if (!canSync) return;
    try {
      const remote = normalize((await rpc("get_tracker_data", { p_secret: token })) || {});
      const hasRemote =
        remote.workouts.length || remote.measurements.length || remote.exerciseLibrary.length;
      const local = dataRef.current;
      if (hasRemote) {
        if (JSON.stringify(remote) !== JSON.stringify(local)) setData(remote);
      } else if (local.workouts.length || local.measurements.length || local.exerciseLibrary.length) {
        /* Server noch leer: lokalen Erststand hochladen */
        await rpc("set_tracker_data", { p_secret: token, p_data: local });
      }
      setSync("ok");
    } catch (e) {
      setSync("fehler");
    }
  };

  const syncNow = () => (dirtyRef.current ? pushRemote() : pullRemote());

  /* Beim Start Server-Stand holen; beim Zurückkehren in den Tab abgleichen */
  useEffect(() => {
    if (!canSync) return;
    pullRemote().finally(() => { readyRef.current = true; });
    const onVisible = () => {
      if (document.visibilityState === "visible") syncNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /* Bei Änderungen: lokal sofort sichern, Server mit kurzer Verzögerung */
  useEffect(() => {
    saveData(data);
    if (!canSync || !readyRef.current) return;
    dirtyRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(pushRemote, 1200);
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (fn) => setData((d) => fn(structuredClone(d)));

  /* Übungsnamen + letzte Leistung für Vorschläge/Hinweise */
  const exerciseIndex = useMemo(() => {
    const map = {};
    const sorted = [...data.workouts].sort((a, b) => a.date.localeCompare(b.date));
    for (const w of sorted) {
      for (const ex of w.exercises) {
        if (!ex.name) continue;
        if (w.type === "cardio") {
          map[ex.name] = { cardio: true, minutes: ex.minutes, km: ex.km, date: w.date };
        } else {
          const best = (ex.sets || []).reduce(
            (acc, s) => (s.weight > acc.weight ? { weight: s.weight, reps: s.reps } : acc),
            { weight: -1, reps: 0 }
          );
          if (best.weight >= 0) map[ex.name] = { ...best, date: w.date };
        }
      }
    }
    return map;
  }, [data.workouts]);

  return (
    <div className="st-app">
      <style>{CSS}</style>
      <header className="st-header">
        <h1>🐻 Trainings-Log</h1>
        <div className="sub">
          <span className={"sync-dot " + sync} aria-hidden="true" />
          {SYNC_LABELS[sync]}
        </div>
      </header>

      <main className="st-content">
        {tab === "training" && (
          <TrainingTab data={data} update={update} exerciseIndex={exerciseIndex} />
        )}
        {tab === "uebungen" && <LibraryTab data={data} update={update} />}
        {tab === "masse" && <MeasureTab data={data} update={update} />}
        {tab === "fortschritt" && <ProgressTab data={data} />}
        {tab === "daten" && <DataTab data={data} setData={setData} setToast={setToast} sync={sync} canSync={canSync} onSyncNow={syncNow} />}
      </main>

      <nav className="tabbar" aria-label="Hauptnavigation">
        <button className={tab === "training" ? "active" : ""} onClick={() => setTab("training")}>
          <Dumbbell size={20} /> Training
        </button>
        <button className={tab === "uebungen" ? "active" : ""} onClick={() => setTab("uebungen")}>
          <ListChecks size={20} /> Übungen
        </button>
        <button className={tab === "masse" ? "active" : ""} onClick={() => setTab("masse")}>
          <Ruler size={20} /> Maße
        </button>
        <button className={tab === "fortschritt" ? "active" : ""} onClick={() => setTab("fortschritt")}>
          <TrendingUp size={20} /> Fortschritt
        </button>
        <button className={tab === "daten" ? "active" : ""} onClick={() => setTab("daten")}>
          <Database size={20} /> Daten
        </button>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* --------------------------- Tab: Training --------------------------- */

function TrainingTab({ data, update, exerciseIndex }) {
  const [picking, setPicking] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const workouts = [...data.workouts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );

  const lastSetsFor = (name) => {
    const sorted = [...data.workouts].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
    );
    for (const w of sorted) {
      for (const ex of w.exercises) {
        if (ex.name === name && Array.isArray(ex.sets) && ex.sets.length) {
          return ex.sets.map((s) => ({ id: uid(), weight: s.weight, reps: s.reps }));
        }
      }
    }
    return null;
  };

  const addWorkout = (typeId) => {
    const assigned = data.exerciseLibrary.filter((e) => e.workouts.includes(typeId));
    const exercises = assigned.map((e) => {
      if (typeId === "cardio") {
        const last = exerciseIndex[e.name];
        return {
          id: uid(),
          name: e.name,
          minutes: last?.cardio ? last.minutes : 20,
          km: last?.cardio ? last.km : 0,
        };
      }
      return {
        id: uid(),
        name: e.name,
        sets: lastSetsFor(e.name) || [{ id: uid(), weight: 10, reps: 10 }],
      };
    });
    const w = {
      id: uid(),
      date: todayStr(),
      type: typeId,
      exercises,
      createdAt: Date.now(),
    };
    update((d) => {
      d.workouts.push(w);
      return d;
    });
    setPicking(false);
    setExpanded(w.id);
  };

  return (
    <div>
      {!picking ? (
        <button className="btn full" onClick={() => setPicking(true)}>
          <Plus size={18} /> Neues Training starten
        </button>
      ) : (
        <div className="card">
          <div className="section-title" style={{ margin: "0 0 8px" }}>Workout wählen</div>
          <div className="type-grid">
            {WORKOUT_TYPES.map((t) => (
              <button
                key={t.id}
                className="type-btn"
                style={{ borderLeftColor: t.color }}
                onClick={() => addWorkout(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setPicking(false)}>
            Abbrechen
          </button>
        </div>
      )}

      <div className="section-title">Verlauf</div>
      {workouts.length === 0 && (
        <div className="empty">Noch keine Trainings. Starte oben dein erstes Workout.</div>
      )}
      {workouts.map((w) => (
        <WorkoutCard
          key={w.id}
          workout={w}
          expanded={expanded === w.id}
          onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
          update={update}
          exerciseIndex={exerciseIndex}
          libraryNames={data.exerciseLibrary.map((e) => e.name)}
        />
      ))}
    </div>
  );
}

function WorkoutCard({ workout, expanded, onToggle, update, exerciseIndex, libraryNames }) {
  const t = typeById(workout.type);
  const isCardio = workout.type === "cardio";
  const allNames = [...new Set([...Object.keys(exerciseIndex), ...(libraryNames || [])])].sort();

  const patch = (fn) =>
    update((d) => {
      const w = d.workouts.find((x) => x.id === workout.id);
      if (w) fn(w, d);
      return d;
    });

  const addExercise = () => {
    patch((w) => {
      w.exercises.push(
        isCardio
          ? { id: uid(), name: "", minutes: 20, km: 0 }
          : { id: uid(), name: "", sets: [{ id: uid(), weight: 10, reps: 10 }] }
      );
    });
  };

  return (
    <div className="card">
      <div className="workout-head">
        <div>
          <span className="type-pill" style={{ background: t.color }}>{t.label}</span>
          <div className="workout-date" style={{ marginTop: 4 }}>{fmtDate(workout.date)}</div>
        </div>
        <div className="row">
          <button
            className="icon-btn danger"
            aria-label="Training löschen"
            onClick={() => {
              if (window.confirm("Dieses Training löschen?")) {
                update((d) => {
                  d.workouts = d.workouts.filter((x) => x.id !== workout.id);
                  return d;
                });
              }
            }}
          >
            <Trash2 size={18} />
          </button>
          <button className="icon-btn" aria-label={expanded ? "Einklappen" : "Ausklappen"} onClick={onToggle}>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {!expanded && workout.exercises.length > 0 && (
        <div className="last-hint" style={{ marginTop: 6 }}>
          {workout.exercises.filter((e) => e.name).map((e) => e.name).join(" · ") || "Keine Übungen"}
        </div>
      )}

      {expanded && (
        <div>
          <div className="row" style={{ marginTop: 10 }}>
            <input
              type="date"
              value={workout.date}
              onChange={(e) => patch((w) => { w.date = e.target.value; })}
              aria-label="Datum des Trainings"
            />
          </div>

          {workout.exercises.map((ex, i) => (
            <ExerciseBlock
              key={ex.id}
              ex={ex}
              isCardio={isCardio}
              allNames={allNames}
              last={ex.name ? exerciseIndex[ex.name] : null}
              patch={patch}
            />
          ))}

          <button className="btn secondary full" style={{ marginTop: 12 }} onClick={addExercise}>
            <Plus size={16} /> Übung hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseBlock({ ex, isCardio, allNames, last, patch }) {
  const listId = `names-${ex.id}`;

  const patchEx = (fn) =>
    patch((w) => {
      const e = w.exercises.find((x) => x.id === ex.id);
      if (e) fn(e);
    });

  return (
    <div className="exercise-block">
      <div className="row">
        <input
          placeholder={isCardio ? "Aktivität (z. B. Laufband)" : "Übung (z. B. Bankdrücken)"}
          value={ex.name}
          list={listId}
          onChange={(e) => patchEx((x) => { x.name = e.target.value; })}
          aria-label="Name der Übung"
        />
        <datalist id={listId}>
          {allNames.map((n) => <option key={n} value={n} />)}
        </datalist>
        <button
          className="icon-btn danger"
          aria-label="Übung entfernen"
          onClick={() => patch((w) => { w.exercises = w.exercises.filter((x) => x.id !== ex.id); })}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {last && !isCardio && last.weight >= 0 && (
        <div className="last-hint">Letztes Mal: {last.weight} kg × {last.reps} ({fmtDate(last.date)})</div>
      )}
      {last && isCardio && last.cardio && (
        <div className="last-hint">Letztes Mal: {last.minutes} min{last.km ? `, ${last.km} km` : ""} ({fmtDate(last.date)})</div>
      )}

      {isCardio ? (
        <div className="row" style={{ marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <Stepper label="Dauer" suffix="min" value={ex.minutes} step={5} min={0}
              onChange={(v) => patchEx((x) => { x.minutes = v; })} />
          </div>
          <div style={{ flex: 1 }}>
            <Stepper label="Distanz" suffix="km" value={ex.km} step={0.5} min={0}
              onChange={(v) => patchEx((x) => { x.km = v; })} />
          </div>
        </div>
      ) : (
        <div>
          {ex.sets.map((s, i) => (
            <div className="set-row" key={s.id}>
              <div className="set-num">{i + 1}</div>
              <Stepper label="Gewicht" suffix="kg" value={s.weight} step={2.5} min={0}
                onChange={(v) => patchEx((x) => { x.sets.find((y) => y.id === s.id).weight = v; })} />
              <Stepper label="Wdh." value={s.reps} step={1} min={0}
                onChange={(v) => patchEx((x) => { x.sets.find((y) => y.id === s.id).reps = Math.round(v); })} />
              <button
                className="icon-btn danger"
                aria-label="Satz entfernen"
                onClick={() => patchEx((x) => { x.sets = x.sets.filter((y) => y.id !== s.id); })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            className="btn ghost"
            style={{ marginTop: 6, color: "var(--pine)", fontWeight: 700 }}
            onClick={() =>
              patchEx((x) => {
                const lastSet = x.sets[x.sets.length - 1];
                x.sets.push({
                  id: uid(),
                  weight: lastSet ? lastSet.weight : 10,
                  reps: lastSet ? lastSet.reps : 10,
                });
              })
            }
          >
            <Plus size={14} /> Satz hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Tab: Übungen ---------------------------- */

function LibraryTab({ data, update }) {
  const [name, setName] = useState("");
  const [types, setTypes] = useState([]);

  const toggleNew = (id) =>
    setTypes((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const add = () => {
    const n = name.trim();
    if (!n) return;
    update((d) => {
      d.exerciseLibrary.push({ id: uid(), name: n, workouts: types });
      return d;
    });
    setName("");
    setTypes([]);
  };

  const lib = [...data.exerciseLibrary].sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <div>
      <div className="card">
        <div className="section-title" style={{ margin: "0 0 8px" }}>Neue Übung</div>
        <input
          placeholder="Name (z. B. Bankdrücken)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name der neuen Übung"
        />
        <div className="chip-row">
          {WORKOUT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={"chip" + (types.includes(t.id) ? " on" : "")}
              style={types.includes(t.id) ? { background: t.color, borderColor: t.color } : {}}
              onClick={() => toggleNew(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn full" style={{ marginTop: 10 }} onClick={add}>
          <Plus size={16} /> Übung anlegen
        </button>
      </div>

      <div className="section-title">Übungskatalog</div>
      {lib.length === 0 && (
        <div className="empty">
          Noch keine Übungen angelegt. Zugewiesene Übungen werden beim Start
          eines Workouts automatisch eingefügt – mit den Sätzen vom letzten Mal.
        </div>
      )}
      {lib.map((ex) => (
        <div className="card" key={ex.id}>
          <div className="workout-head">
            <input
              value={ex.name}
              aria-label="Übungsname"
              style={{ fontWeight: 700 }}
              onChange={(e) =>
                update((d) => {
                  const x = d.exerciseLibrary.find((y) => y.id === ex.id);
                  if (x) x.name = e.target.value;
                  return d;
                })
              }
            />
            <button
              className="icon-btn danger"
              aria-label="Übung aus dem Katalog löschen"
              onClick={() => {
                if (window.confirm("Übung aus dem Katalog löschen? Bereits geloggte Trainings bleiben erhalten.")) {
                  update((d) => {
                    d.exerciseLibrary = d.exerciseLibrary.filter((y) => y.id !== ex.id);
                    return d;
                  });
                }
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="chip-row">
            {WORKOUT_TYPES.map((t) => {
              const on = ex.workouts.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={"chip" + (on ? " on" : "")}
                  style={on ? { background: t.color, borderColor: t.color } : {}}
                  onClick={() =>
                    update((d) => {
                      const x = d.exerciseLibrary.find((y) => y.id === ex.id);
                      if (!x) return d;
                      x.workouts = on
                        ? x.workouts.filter((w) => w !== t.id)
                        : [...x.workouts, t.id];
                      return d;
                    })
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Tab: Maße ----------------------------- */

function MeasureTab({ data, update }) {
  const blank = () => {
    const o = { id: uid(), date: todayStr() };
    MEASURES.forEach((m) => { o[m.key] = ""; });
    return o;
  };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);

  const entries = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    const entry = { ...form };
    MEASURES.forEach((m) => {
      const v = parseFloat(String(entry[m.key]).replace(",", "."));
      entry[m.key] = isNaN(v) ? null : v;
    });
    update((d) => {
      const i = d.measurements.findIndex((x) => x.id === entry.id);
      if (i >= 0) d.measurements[i] = entry;
      else d.measurements.push(entry);
      return d;
    });
    setForm(blank());
    setEditing(false);
  };

  return (
    <div>
      <div className="card">
        <div className="section-title" style={{ margin: "0 0 4px" }}>
          {editing ? "Eintrag bearbeiten" : "Neue Messung (Monatsanfang)"}
        </div>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          aria-label="Datum der Messung"
        />
        <div className="measure-grid">
          {MEASURES.map((m) => (
            <div className="measure-field" key={m.key}>
              <label htmlFor={`m-${m.key}`}>{m.label} (cm)</label>
              <input
                id={`m-${m.key}`}
                inputMode="decimal"
                placeholder="–"
                value={form[m.key] ?? ""}
                onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button className="btn full" style={{ marginTop: 12 }} onClick={save}>
          <Check size={16} /> Speichern
        </button>
      </div>

      <div className="section-title">Bisherige Messungen</div>
      {entries.length === 0 && <div className="empty">Noch keine Messungen eingetragen.</div>}
      {entries.map((e) => (
        <div className="card" key={e.id}>
          <div className="workout-head">
            <div className="workout-date">{fmtDate(e.date)}</div>
            <div className="row">
              <button className="btn ghost" onClick={() => { setForm({ ...e }); setEditing(true); window.scrollTo({ top: 0 }); }}>
                Bearbeiten
              </button>
              <button
                className="icon-btn danger"
                aria-label="Messung löschen"
                onClick={() => {
                  if (window.confirm("Diese Messung löschen?")) {
                    update((d) => { d.measurements = d.measurements.filter((x) => x.id !== e.id); return d; });
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="last-hint" style={{ marginTop: 6 }}>
            {MEASURES.filter((m) => e[m.key] != null)
              .map((m) => `${m.label.split(" ")[0]}: ${e[m.key]} cm`)
              .join(" · ")}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------- Tab: Fortschritt -------------------------- */

function ProgressTab({ data }) {
  const exerciseNames = useMemo(() => {
    const s = new Set();
    data.workouts.forEach((w) =>
      w.exercises.forEach((e) => { if (e.name && w.type !== "cardio") s.add(e.name); })
    );
    return [...s].sort();
  }, [data.workouts]);

  const [exName, setExName] = useState("");
  const [measureKey, setMeasureKey] = useState(MEASURES[0].key);

  useEffect(() => {
    if (!exName && exerciseNames.length) setExName(exerciseNames[0]);
  }, [exerciseNames, exName]);

  /* Übungs-Fortschritt: bestes Satzgewicht pro Trainingstag */
  const exerciseSeries = useMemo(() => {
    if (!exName) return [];
    const rows = [];
    [...data.workouts]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((w) => {
        w.exercises.forEach((e) => {
          if (e.name !== exName || !e.sets) return;
          const best = e.sets.reduce((acc, s) => Math.max(acc, s.weight || 0), 0);
          const volumen = e.sets.reduce((acc, s) => acc + (s.weight || 0) * (s.reps || 0), 0);
          rows.push({ date: fmtDate(w.date).slice(0, 6), Gewicht: best, Volumen: volumen });
        });
      });
    return rows;
  }, [data.workouts, exName]);

  /* Maße über Zeit */
  const measureSeries = useMemo(() => {
    return [...data.measurements]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((m) => m[measureKey] != null)
      .map((m) => ({ date: fmtDate(m.date).slice(0, 6), cm: m[measureKey] }));
  }, [data.measurements, measureKey]);

  /* Trainingsfrequenz pro Monat */
  const frequencySeries = useMemo(() => {
    const byMonth = {};
    data.workouts.forEach((w) => {
      const ym = w.date.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = { ym };
      const label = typeById(w.type).label;
      byMonth[ym][label] = (byMonth[ym][label] || 0) + 1;
    });
    return Object.values(byMonth)
      .sort((a, b) => a.ym.localeCompare(b.ym))
      .map((r) => ({ ...r, Monat: monthLabel(r.ym) }));
  }, [data.workouts]);

  const hasAny = data.workouts.length > 0 || data.measurements.length > 0;

  if (!hasAny) {
    return <div className="empty">Sobald Trainings und Maße eingetragen sind, erscheinen hier die Grafiken.</div>;
  }

  return (
    <div>
      <div className="section-title">Übung</div>
      <div className="card">
        <select value={exName} onChange={(e) => setExName(e.target.value)} aria-label="Übung wählen">
          {exerciseNames.map((n) => <option key={n}>{n}</option>)}
        </select>
        <div className="chart-card" style={{ marginTop: 10 }}>
          {exerciseSeries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exerciseSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#26262C" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8F979F" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8F979F" }} unit=" kg" />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#F2F4F1" }} />
                <Line type="monotone" dataKey="Gewicht" stroke="#3DF06C" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "#3DF06C" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">Keine Daten für diese Übung.</div>
          )}
        </div>
      </div>

      <div className="section-title">Körpermaße</div>
      <div className="card">
        <select value={measureKey} onChange={(e) => setMeasureKey(e.target.value)} aria-label="Maß wählen">
          {MEASURES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <div className="chart-card" style={{ marginTop: 10 }}>
          {measureSeries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={measureSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#26262C" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8F979F" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8F979F" }} unit=" cm" domain={["auto", "auto"]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#F2F4F1" }} />
                <Line type="monotone" dataKey="cm" stroke="#9B5CFF" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "#9B5CFF" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">Keine Messwerte für dieses Maß.</div>
          )}
        </div>
      </div>

      <div className="section-title">Trainings pro Monat</div>
      <div className="card chart-card">
        {frequencySeries.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={frequencySeries} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#26262C" />
              <XAxis dataKey="Monat" tick={{ fontSize: 11, fill: "#8F979F" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8F979F" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#F2F4F1" }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8F979F" }} />
              {WORKOUT_TYPES.map((t) => (
                <Bar key={t.id} dataKey={t.label} stackId="a" fill={t.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">Noch keine Trainings.</div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Tab: Daten ----------------------------- */

function DataTab({ data, setData, setToast, sync, canSync, onSyncNow }) {
  const fileRef = useRef(null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sport-tracker-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast("Backup heruntergeladen");
  };

  const doImport = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.workouts) || !Array.isArray(parsed.measurements)) {
          throw new Error("Format");
        }
        setData(normalize(parsed));
        setToast("Backup importiert");
      } catch {
        setToast("Datei konnte nicht gelesen werden");
      }
    };
    reader.readAsText(file);
  };

  const nWorkouts = data.workouts.length;
  const nMeasure = data.measurements.length;

  return (
    <div>
      <div className="card">
        <div className="section-title" style={{ margin: "0 0 6px" }}>Übersicht</div>
        <div style={{ fontSize: 14 }}>
          {nWorkouts} Trainings · {nMeasure} Messungen · {data.exerciseLibrary.length} Übungen im Katalog
        </div>
        <div className="last-hint" style={{ marginTop: 4 }}>
          {canSync
            ? "Die Daten liegen in der Datenbank und werden lokal zwischengespeichert – Einträge funktionieren auch offline und werden nachsynchronisiert."
            : "Die Daten liegen nur im Browser dieses Geräts. Ein regelmäßiges JSON-Backup schützt vor Datenverlust."}
        </div>
      </div>

      <div className="card">
        <div className="section-title" style={{ margin: "0 0 6px" }}>Synchronisierung</div>
        {canSync ? (
          <div>
            <div style={{ fontSize: 14 }}>
              <span className={"sync-dot " + sync} aria-hidden="true" />
              {SYNC_LABELS[sync]}
            </div>
            <button className="btn secondary full" style={{ marginTop: 10 }} onClick={onSyncNow}>
              Jetzt synchronisieren
            </button>
          </div>
        ) : (
          <div className="last-hint">
            Kein Sync aktiv. Entweder fehlt die Supabase-Konfiguration (oben in
            src/App.jsx) oder der Geheimlink mit #k=… wurde noch nicht geöffnet.
            Die Einrichtung steht im README.
          </div>
        )}
      </div>

      <div className="card">
        <button className="btn full" onClick={doExport}>
          <Download size={16} /> Backup exportieren (JSON)
        </button>
        <button className="btn secondary full" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Backup importieren
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        <div className="last-hint" style={{ marginTop: 8 }}>
          Import ersetzt die aktuellen Daten vollständig durch das Backup.
        </div>
      </div>
    </div>
  );
}
