# ArbBot Pro Dashboard - Frontend Integration Summary

## 🎯 Overview

Successfully integrated the **ArbBot Pro Dashboard** UI from `guntjong-max/guntjong-max-arb` into the `guntjong-max/arb` repository's `minimal-ui` folder, fully wired to the existing minimal backend API.

**Completion Date:** December 9, 2025  
**Repository:** guntjong-max/arb  
**Frontend Location:** `/root/sportsbook-minimal/minimal-ui`  
**Production URL:** http://217.216.35.6:8080

---

## 📋 Changes Made

### 1. **New Files Created**

#### API Client Layer
- **`src/api/client.ts`** (185 lines)
  - Centralized API client for all backend endpoints
  - Type-safe interfaces for all API requests/responses
  - Supports both Docker (`http://engine:3000`) and local dev (`http://localhost:3000`)
  - Implements all 7 backend API endpoints:
    - `POST /api/login` - Queue login for all accounts
    - `GET /api/login-status` - Check worker login status
    - `POST /api/settings` - Save UI configuration
    - `GET /api/settings` - Load UI configuration
    - `POST /api/execute` - Execute arbitrage bets
    - `GET /api/bets` - Get bet history
    - `GET /api/system-health` - System health check

#### Data Mapping Utilities
- **`src/utils/mappers.ts`** (124 lines)
  - Maps backend API responses to UI types
  - Safe data access helpers
  - LocalStorage wrapper with error handling
  - Connection status mapping (ping-based: <150ms green, 150-350ms yellow, >350ms red)

#### Main Application
- **`src/App.tsx`** (371 lines)
  - Complete rewrite using ArbBot Pro Dashboard layout
  - Integrated with all backend APIs
  - Real-time polling for system health (5s interval) and bet history (10s interval)
  - Dual account support (Account A - Soft, Account B - Sharp)
  - Configuration persistence to backend and localStorage
  - Comprehensive logging system

#### Environment Configuration
- **`.env.production`**
  - Production environment variables for Docker
  - `VITE_API_URL=http://engine:3000`
  - `VITE_API_WS_URL=ws://engine:3000`

#### Deployment Script
- **`deploy-ui-update.sh`** (122 lines)
  - Automated deployment script
  - Includes backup, build, Docker rebuild, and verification
  - Color-coded output for easy monitoring

### 2. **Modified Files**

#### `src/main.jsx`
- Updated import from `App.jsx` to `App.tsx`

#### `src/index.css`
- Added custom scrollbar styles for `.custom-scrollbar` class
- Matches reference UI styling

#### `Dockerfile`
- Added `.env.production` copy step during build
- Ensures correct API URLs for Docker deployment

### 3. **Existing Components (Reused)**

All existing components from `minimal-ui/src/components` are compatible and reused:

- ✅ **`AccountPanel.tsx`** - Account management panel with balance, ping, status
- ✅ **`Configuration.tsx`** - Settings panel (tiers, profit range, market filters)
- ✅ **`Header.tsx`** - Top navigation with system health indicators
- ✅ **`Monitoring.tsx`** - Live scanner table and execution history
- ✅ **`Logs.tsx`** - System logs display
- ✅ **`StatusLed.tsx`** - Connection status LED indicators

All components already had proper null-safe access patterns (e.g., `config?.tier1 ?? 0`, `(amount ?? 0).toLocaleString()`).

---

## 🔌 Backend API Integration

### API Endpoint Mapping

| UI Function | Backend Endpoint | Method | Usage |
|-------------|------------------|--------|-------|
| System Health Status | `/api/system-health` | GET | Poll every 5s for connection status, ping, worker state |
| Account Login | `/api/login` | POST | Trigger when user clicks "START TRADING" |
| Account Status | `/api/login-status` | GET | Poll every 5s to update balance, ping, login state |
| Configuration Save | `/api/settings` | POST | When user updates configuration |
| Configuration Load | `/api/settings` | GET | On app startup |
| Bet Execution | `/api/execute` | POST | (Not yet used - placeholder for future) |
| Bet History | `/api/bets` | GET | Poll every 10s to update execution history |

### Data Flow Examples

#### **System Health Check**
```typescript
// Fetched every 5 seconds
GET /api/system-health
Response:
{
  "backend": { "healthy": true, "uptime_seconds": 34200, "ws_clients": 4 },
  "workers": [
    { "provider": "nova", "connected": true, "last_ping_ms": 122, "latency_status": "good", "odds_stream_active": true },
    { "provider": "saba", "connected": true, "last_ping_ms": 180, "latency_status": "warning", "odds_stream_active": true }
  ]
}
```

Mapped to UI:
- Header status LEDs (green/yellow/red based on ping)
- Account panel pings
- Worker status indicator

#### **Configuration Sync**
```typescript
// UI Config -> Backend Settings
UI: { minProfit: 3, maxProfit: 10, ... }
↓
POST /api/settings
{
  "min_percent": 3,
  "max_percent": 10,
  "minute_limit_ht": 35,
  "minute_limit_ft": 75,
  "market_filter": { "ft_hdp": true, ... },
  "match_filter": "live_only",
  "round_off": 5
}
```

---

## 🎨 UI Layout (ArbBot Pro Dashboard)

### Desktop Layout (1920x1080)

```
┌─────────────────────────────────────────────────────────────┐
│ ARBBOTPRO Header                                            │
│ [ENGINE API 🟢] [DATABASE 🟢] [REDIS 🟢] [WORKER 🟡]         │
│                                         Total Balance: $XXX  │
└─────────────────────────────────────────────────────────────┘
┌───────────────┬─────────────────────────────────────────────┐
│  Account A    │                                             │
│  (Soft)       │           📊 Daily P&L Chart                │
│  Balance: $   │                                             │
│  Ping: XXms   │                                             │
│  [START]      │                                             │
├───────────────┤                                             │
│  Account B    │         🔍 Live Scanner Table               │
│  (Sharp)      │   Time | Match | Market | Odds | Profit    │
│  Balance: $   │   ─────┼───────┼────────┼──────┼─────────   │
│  Ping: XXms   │   ...                                       │
│  [START]      │                                             │
├───────────────┤─────────────────────────────────────────────┤
│ ⚙️ Config     │                                             │
│ Tier Stakes   │       📜 Execution History                  │
│ Profit Range  │   Status | Time | Match | Stake | Result   │
│ Max Minute    │   ───────┼──────┼───────┼───────┼─────────  │
│ Match Filter  │   ...                                       │
│ Market Filter │                                             │
│               ├─────────────────────────────────────────────┤
│               │                                             │
│               │       💻 System Logs                        │
│               │   [19:30:15] INFO System initialized        │
│               │   [19:30:20] SUCCESS Account 1 started      │
└───────────────┴─────────────────────────────────────────────┘
```

### Component Hierarchy
```
App.tsx
├── Header
│   ├── Logo (ARBBOTPRO)
│   ├── Status LEDs (ENGINE API, DATABASE, REDIS, WORKER)
│   └── Total Balance
├── Main Grid (3-9 cols)
│   ├── Left Column (3 cols)
│   │   ├── AccountPanel (Account A - Soft)
│   │   ├── AccountPanel (Account B - Sharp)
│   │   └── Configuration
│   └── Right Column (9 cols)
│       ├── Monitoring
│       │   ├── Daily P&L Chart
│       │   ├── Live Scanner Table
│       │   └── Execution History Table
│       └── Logs
```

---

## 🚀 Deployment Instructions

### Prerequisites
- SSH access to production server: `ssh root@217.216.35.6`
- Docker and Docker Compose installed
- Project located at: `/root/sportsbook-minimal`

### Step-by-Step Deployment

#### **Option 1: Automated Deployment (Recommended)**

```bash
# 1. SSH to production server
ssh root@217.216.35.6

# 2. Navigate to project directory
cd /root/sportsbook-minimal

# 3. Pull latest changes
git pull origin main

# 4. Make deployment script executable
chmod +x deploy-ui-update.sh

# 5. Run deployment script
./deploy-ui-update.sh
```

The script will:
- ✅ Backup current UI to `/root/sportsbook-minimal/backups/ui-YYYYMMDD-HHMMSS`
- ✅ Install npm dependencies
- ✅ Build React app (`npm run build`)
- ✅ Stop and remove old UI container
- ✅ Build new UI Docker image
- ✅ Start new UI container
- ✅ Verify deployment

#### **Option 2: Manual Deployment**

```bash
# 1. SSH to server
ssh root@217.216.35.6

# 2. Navigate to UI directory
cd /root/sportsbook-minimal/minimal-ui

# 3. Install dependencies
npm install

# 4. Build application
npm run build

# 5. Verify build output
ls -lh dist/
cat dist/index.html  # Should reference new asset hashes

# 6. Navigate to project root
cd /root/sportsbook-minimal

# 7. Rebuild and restart UI service
docker compose build ui
docker compose up -d ui

# 8. Verify container
docker ps | grep arb-ui
docker logs arb-ui --tail 50
docker exec arb-ui ls -lh /usr/share/nginx/html/
```

### Post-Deployment Verification

```bash
# 1. Check container status
docker ps | grep arb-ui

# 2. Check nginx is serving files
docker exec arb-ui ls -lh /usr/share/nginx/html/

# 3. Test from server
curl -I http://localhost:8080

# 4. Test from external
# Open browser: http://217.216.35.6:8080

# 5. Check logs for errors
docker logs arb-ui --tail 100
```

---

## 🧪 Testing Checklist

### Visual Verification
- [ ] ArbBot Pro header displays correctly
- [ ] System status LEDs show (ENGINE API, DATABASE, REDIS, WORKER)
- [ ] Total balance displays in header
- [ ] Two account panels visible (Account A & B)
- [ ] Account panels show balance, ping, connection status
- [ ] Configuration panel renders with all fields
- [ ] Daily P&L chart displays
- [ ] Live Scanner table is visible (may be empty)
- [ ] Execution History table is visible (may be empty)
- [ ] System logs panel displays at bottom

### Functional Verification
- [ ] System health updates every 5 seconds (watch status LEDs)
- [ ] Account ping updates in real-time
- [ ] Configuration changes persist after page reload
- [ ] "START TRADING" button triggers login API call
- [ ] Logs update when actions occur
- [ ] Bet history loads from backend (if available)
- [ ] No console errors in browser DevTools

### API Connectivity
```bash
# Test backend is reachable from UI container
docker exec arb-ui wget -O- http://engine:3000/health

# Test all API endpoints from browser console
fetch('http://217.216.35.6:3000/api/system-health').then(r => r.json()).then(console.log)
fetch('http://217.216.35.6:3000/api/login-status').then(r => r.json()).then(console.log)
fetch('http://217.216.35.6:3000/api/settings').then(r => r.json()).then(console.log)
fetch('http://217.216.35.6:3000/api/bets').then(r => r.json()).then(console.log)
```

---

## 🔧 Configuration Reference

### Environment Variables

**Development** (`.env.example`):
```env
VITE_API_URL=http://localhost:3000
VITE_API_WS_URL=ws://localhost:3000
```

**Production** (`.env.production`):
```env
VITE_API_URL=http://engine:3000
VITE_API_WS_URL=ws://engine:3000
```

### Docker Configuration

**Container Name:** `arb-ui`  
**Host Port:** `8080`  
**Container Port:** `80`  
**Network:** `arb-network`  
**Nginx Config:** `/etc/nginx/conf.d/default.conf`  
**Static Files:** `/usr/share/nginx/html/`

---

## 🐛 Troubleshooting

### Issue: Blank Page
**Symptoms:** White screen, no content  
**Solutions:**
1. Check browser console for errors
2. Verify assets loaded: `docker exec arb-ui ls /usr/share/nginx/html/assets/`
3. Check index.html references correct bundles
4. Rebuild: `npm run build && docker compose build ui && docker compose up -d ui`

### Issue: API Errors
**Symptoms:** "Failed to fetch", CORS errors  
**Solutions:**
1. Verify engine container is running: `docker ps | grep arb-engine`
2. Check backend health: `curl http://localhost:3000/health`
3. Verify network connectivity: `docker exec arb-ui ping engine`
4. Check backend logs: `docker logs arb-engine --tail 100`

### Issue: Configuration Not Saving
**Symptoms:** Settings reset on reload  
**Solutions:**
1. Check localStorage is enabled in browser
2. Verify backend `/api/settings` endpoint works:
   ```bash
   curl -X POST http://localhost:3000/api/settings \
     -H 'Content-Type: application/json' \
     -d '{"min_percent": 3, "max_percent": 10, ...}'
   ```
3. Check browser console for save errors

### Issue: Data Not Updating
**Symptoms:** Static data, no real-time updates  
**Solutions:**
1. Verify polling intervals are running (check Network tab in DevTools)
2. Ensure backend endpoints return data
3. Check for JavaScript errors blocking updates
4. Verify backend WebSocket/API is responding

---

## 📦 Rollback Procedure

If deployment fails or issues arise:

```bash
# 1. Find backup directory
ls -lh /root/sportsbook-minimal/backups/

# 2. Restore from backup
BACKUP_DIR="/root/sportsbook-minimal/backups/ui-20251209-XXXXXX"
cp -r "$BACKUP_DIR/src" /root/sportsbook-minimal/minimal-ui/

# 3. Rebuild
cd /root/sportsbook-minimal/minimal-ui
npm run build

# 4. Restart container
cd /root/sportsbook-minimal
docker compose build ui
docker compose up -d ui

# 5. Verify
docker logs arb-ui --tail 50
```

---

## 📚 Technical Reference

### Technology Stack
- **Frontend:** React 18.2.0 + TypeScript 5.3.3
- **Build Tool:** Vite 5.0.8
- **Styling:** Tailwind CSS 3.4.0
- **Icons:** Lucide React 0.556.0
- **Charts:** Recharts 3.5.1
- **Server:** Nginx Alpine (production)
- **Container:** Node 18 Alpine (build), Nginx Alpine (runtime)

### File Structure
```
minimal-ui/
├── src/
│   ├── api/
│   │   └── client.ts          # API client (185 lines)
│   ├── components/
│   │   ├── AccountPanel.tsx   # Account management (127 lines)
│   │   ├── Configuration.tsx  # Settings panel (170 lines)
│   │   ├── Header.tsx         # Top navigation (54 lines)
│   │   ├── Monitoring.tsx     # Scanner + History (278 lines)
│   │   ├── Logs.tsx           # Logs display (47 lines)
│   │   └── StatusLed.tsx      # Status indicator (27 lines)
│   ├── utils/
│   │   └── mappers.ts         # Data mappers (124 lines)
│   ├── App.tsx                # Main app (371 lines)
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles
│   └── types.ts               # TypeScript types
├── .env.example
├── .env.production
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.js
```

### API Client Methods

```typescript
apiClient.login(accounts)           // POST /api/login
apiClient.getLoginStatus()          // GET /api/login-status
apiClient.saveSettings(settings)    // POST /api/settings
apiClient.getSettings()             // GET /api/settings
apiClient.executeBet(bet)           // POST /api/execute
apiClient.getBetHistory()           // GET /api/bets
apiClient.getSystemHealth()         // GET /api/system-health
apiClient.getHealth()               // GET /health (legacy)
```

---

## ✅ Completion Checklist

- [x] Created API client layer (`src/api/client.ts`)
- [x] Created data mapping utilities (`src/utils/mappers.ts`)
- [x] Rewrote main App component with ArbBot Pro layout (`src/App.tsx`)
- [x] Updated main entry point to use App.tsx (`src/main.jsx`)
- [x] Added custom scrollbar styles (`src/index.css`)
- [x] Created production environment config (`.env.production`)
- [x] Updated Dockerfile for production builds
- [x] Created automated deployment script (`deploy-ui-update.sh`)
- [x] Verified all existing components are compatible
- [x] Documented API integration mappings
- [x] Created comprehensive deployment guide
- [x] Prepared troubleshooting documentation

---

## 🎯 Next Steps (Post-Deployment)

1. **Deploy to Production**
   - Run `./deploy-ui-update.sh` on the server
   - Verify at http://217.216.35.6:8080

2. **Backend API Implementation**
   - Ensure all 7 API endpoints are implemented in the engine
   - Test each endpoint returns expected data structure
   - Verify WebSocket connectivity if needed

3. **Live Scanner Integration**
   - Implement real-time arbitrage opportunities feed
   - Connect to backend scanner/detect endpoint
   - Update `scannerData` state with real opportunities

4. **Testing**
   - End-to-end testing of all features
   - Load testing with multiple accounts
   - UI responsiveness on mobile devices

5. **Monitoring**
   - Set up error tracking (e.g., Sentry)
   - Monitor API response times
   - Track user interactions and performance

---

**Document Version:** 1.0  
**Last Updated:** December 9, 2025  
**Author:** Qoder AI Assistant  
**Status:** ✅ Ready for Deployment
