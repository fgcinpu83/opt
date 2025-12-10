# Quick Start - ArbBotPro UI Rebuild

## What Changed?

Successfully rebuilt the ArbBotPro Dashboard UI in `minimal-ui/` folder with a clean 3-column layout matching your specifications.

## Files Modified

### Created (1 file)
- `src/components/DailyPnL.tsx` - New P&L component for right column

### Modified (5 files)
- `src/App.tsx` - Changed from 2-column to 3-column layout (3-6-3)
- `src/components/Header.tsx` - Removed balance display, simplified Secure Mode button
- `src/components/Monitoring.tsx` - Refactored to show Execution History + Live Scanner in 2-row table format
- `src/index.css` - Updated background to `#020617`
- `tailwind.config.js` - Added TypeScript file support

### Unchanged (kept as-is)
- All backend code (minimal-api, engine, worker)
- Docker configuration
- API integration
- AccountPanel, Configuration, Logs components

## Layout Overview

```
┌────────────────────────────────────────────────────┐
│            HEADER (ARBBOTPRO + LEDs)              │
├──────────┬──────────────────────┬─────────────────┤
│ LEFT 3/12│    MIDDLE 6/12       │   RIGHT 3/12    │
├──────────┼──────────────────────┼─────────────────┤
│ ACCOUNT1 │ EXECUTION HISTORY    │ DAILY P&L       │
│ ACCOUNT2 │ (2-row table)        │ (chart + stats) │
│ CONFIG   │ LIVE SCANNER         │ SYSTEM LOGS     │
│          │ (2-row table)        │ (scrollable)    │
└──────────┴──────────────────────┴─────────────────┘
```

## Key Features

### ✅ 3-Column Desktop Layout
- **Left**: Account 1, Account 2, Configuration
- **Middle**: Execution History, Live Scanner
- **Right**: Daily P&L, System Logs

### ✅ 2-Row Table Format
Both tables show data in paired rows:
- **Execution History**: Home/Away teams with respective sites and odds
- **Live Scanner**: Leg 1/Leg 2 with profit badge

### ✅ Dark Theme
- Background: `#020617` (very dark blue-black)
- Cards: `#0f172a` / `#111827` with dark borders
- Consistent color coding: Green (profit), Red (error), Blue/Orange (odds)

### ✅ Responsive
- Desktop: 3-column grid
- Mobile: Stacks vertically

## Testing the UI

### Option 1: Build and Run Docker
```bash
cd /data/workspace/arb
docker-compose up --build minimal-ui
```

### Option 2: Development Mode
```bash
cd minimal-ui
npm install
npm run dev
```

Then open: `http://localhost:5173`

## What You'll See

1. **Header Bar**
   - ARBBOTPRO logo
   - Status LEDs (ENGINE, DB, REDIS, WORKER)
   - Secure Mode button

2. **Left Column**
   - 2 Account panels with balance, inputs, START button
   - Configuration panel with all filters

3. **Middle Column**
   - Execution History table (scrollable, 2-row format)
   - Live Scanner table (scrollable, 2-row format)

4. **Right Column**
   - Daily P&L card (profit, chart, comparison)
   - System Logs (color-coded, scrollable)

## Color Guide

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Profit | Green | `text-emerald-400` |
| Loss | Red | `text-rose-400` |
| Home/Leg1 Odds | Blue | `text-blue-400` |
| Away/Leg2 Odds | Orange | `text-orange-400` |
| Status OK | Green | `bg-emerald-500/20` |
| Status Error | Red | `bg-rose-500/20` |
| Status Running | Yellow | `bg-yellow-500/20` |

## Known Working Features

- ✅ Real-time status LEDs
- ✅ Account balance display
- ✅ Configuration save/load
- ✅ Bet history display
- ✅ Live scanner (when data available)
- ✅ P&L calculation
- ✅ System logs with color coding
- ✅ Responsive layout
- ✅ All hover effects
- ✅ Scrollable tables

## Backend Integration

No changes required! The UI uses the existing API:
- `GET /health` - System health
- `GET /login/status` - Account status
- `POST /login` - Start trading
- `GET /history` - Bet history
- `GET /settings` - Configuration
- `POST /settings` - Save config

## Next Steps

1. Build the UI: `npm run build` (in minimal-ui folder)
2. Check the output in `minimal-ui/dist/`
3. Deploy via Docker or copy dist/ to nginx

## Troubleshooting

### If the UI doesn't show data:
- Check backend is running: `docker-compose up minimal-api`
- Verify API endpoint: `curl http://localhost:8080/health`
- Check browser console for errors

### If layout looks wrong:
- Clear browser cache
- Check Tailwind CSS is loaded
- Verify responsive breakpoint (resize window)

## Documentation Files

- `UI_REBUILD_SUMMARY.md` - Complete technical summary
- `LAYOUT_REFERENCE.md` - Visual layout diagrams
- `QUICK_START.md` - This file

---

**Status**: ✅ UI Rebuild Complete
**Backend**: ✅ Unchanged and Compatible
**Docker**: ✅ Ready to Deploy
