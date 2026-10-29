# FocusLog

A study-session tracker that installs to your phone's home screen (PWA). Organise your studies into modules and topics, time sessions live or log them afterwards, and review your history and statistics. All data stays on your device.

## Features

- **Live sessions:** start, pause, resume, cancel and finish, with a 1–5 productivity rating and a note. The timer keeps running when you close the app.
- **"Beat your usual session":** a progress bar toward your average session length for that module.
- **Modules and topics:** colour and emoji per module, plus an optional exam date with a countdown.
- **History:** sessions grouped by day, filterable by module; edit, delete, or log a past session by hand.
- **Calendar:** a monthly heat map of study time, plus exam dates.
- **Home and Insights:** streaks, today and this week, weekly volume, time per module and topic, best time of day, weekday pattern and productivity trend.
- **Backup:** JSON export and import in Settings.

A study day runs from 4:00 AM to 3:59 AM, so a 1 AM session counts toward the previous day.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # production build in dist/
```

## Deploy

The build is static (relative paths and hash routing), so it runs on any static host:

- **Vercel / Netlify:** import the repo; build command `npm run build`, output directory `dist`.
- **GitHub Pages:** publish the `dist/` folder, for example with the `actions/deploy-pages` workflow.

To install it on an iPhone, open the site in Safari, tap Share, then Add to Home Screen.

## Structure

```
src/lib/          types, time (4 AM day cutoff), stats, backup
src/store/        zustand store, persisted to localStorage
src/components/   shared UI: Sheet, Icon, TabBar, Starfield, ModuleBadge
src/features/     session · modules · history · stats
src/pages/        one file per route
```
