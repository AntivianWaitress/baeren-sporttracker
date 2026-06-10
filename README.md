# 🐻 Trainings-Log

Mobiler Sport-Tracker (React + Vite): Workouts mit Sätzen/Gewichten/Wiederholungen,
Übungskatalog mit Workout-Zuweisung, monatliche Körpermaße, Fortschritts-Charts
und JSON-Backup. Synchronisierung über Geräte hinweg via Supabase (Geheimlink,
kein Login nötig); ohne Konfiguration läuft die App rein lokal im Browser.

## Schritt 1: Deployment auf GitHub Pages

1. Neues Repository auf GitHub anlegen (z. B. `sport-tracker`), dann:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:DEIN-USERNAME/sport-tracker.git
   git push -u origin main
   ```
2. Im Repo: **Settings → Pages → Build and deployment → Source: "GitHub Actions"** auswählen.
3. Der Workflow läuft bei jedem Push auf `main` automatisch.
   Die App ist danach unter `https://DEIN-USERNAME.github.io/sport-tracker/` erreichbar.

## Schritt 2: Supabase-Sync einrichten (~10 Minuten)

1. Auf [supabase.com](https://supabase.com) kostenlos registrieren und ein
   neues Projekt anlegen (Region: am besten Frankfurt / `eu-central-1`).
   Das Datenbank-Passwort wird für die App nicht gebraucht – trotzdem sicher ablegen.
2. Warten, bis das Projekt fertig provisioniert ist (1–2 Minuten).
3. Links im Menü **SQL Editor** öffnen, den kompletten Inhalt von
   `supabase-setup.sql` einfügen und mit **Run** ausführen.
   → Das Ergebnis der letzten Abfrage ist der **Token** (36 Zeichen). Kopieren!
4. Links im Menü **Settings → API** öffnen und zwei Werte kopieren:
   - **Project URL** (z. B. `https://abcdefgh.supabase.co`)
   - **anon public** API-Key
5. Beide Werte oben in `src/App.jsx` eintragen (Konstanten `SUPABASE_URL`
   und `SUPABASE_ANON_KEY`), committen und pushen.
6. Der Geheimlink für alle Geräte lautet:
   ```
   https://DEIN-USERNAME.github.io/sport-tracker/#k=TOKEN
   ```
   Diesen Link auf jedem Gerät einmal öffnen und als Lesezeichen bzw.
   „Zum Startbildschirm hinzufügen" speichern. Der Token wird lokal gemerkt –
   danach reicht auch die URL ohne `#k=…`.

**Hinweis:** Der anon-Key darf öffentlich im Code stehen – er erlaubt ohne den
Token keinerlei Datenzugriff (die Tabelle ist per RLS gesperrt, Zugriff geht nur
über die tokengeprüften SQL-Funktionen). Der Token selbst gehört **nicht** ins
Repository, nur in den Link.

**Free-Tier-Hinweis:** Supabase pausiert kostenlose Projekte nach ca. einer Woche
ohne Zugriffe. Bei regelmäßiger Nutzung passiert das nicht; falls doch, lässt es
sich im Supabase-Dashboard mit einem Klick reaktivieren.

## Sync-Verhalten

- Beim Öffnen lädt die App den Server-Stand; beim Zurückwechseln in den Tab
  gleicht sie erneut ab.
- Änderungen werden sofort lokal gesichert und nach ~1 Sekunde zum Server
  geschoben. Ohne Netz (Keller-Gym 🏋️) zeigt der Status „Offline" – die Daten
  werden nachgetragen, sobald wieder synchronisiert werden kann.
- Der Status ist oben im Header sichtbar (grüner Punkt = synchronisiert);
  im Tab **Daten** gibt es zusätzlich einen „Jetzt synchronisieren"-Button.
- Der JSON-Export bleibt als zusätzliches Backup erhalten.

## Lokal entwickeln

```bash
npm install
npm run dev
```

Zum lokalen Testen des Syncs den Token an die URL hängen:
`http://localhost:5173/#k=TOKEN`
