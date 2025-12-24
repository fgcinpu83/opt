# 🚀 QUICK START GUIDE - Sportsbook Arbitrage System

## ✅ PREREQUISITES

Before starting, ensure you have:
- Node.js 18+ installed
- PostgreSQL database running
- Redis server running
- Git (optional)

## 📦 INSTALLATION

### 1. Install Backend Dependencies

```bash
cd engine
npm install
npx playwright install chromium
```

### 2. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## ⚙️ CONFIGURATION

### 1. Backend Environment Variables

Create `engine/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/arbitrage_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Trading
PAPER_TRADING_MODE=true
MAX_ARBITRAGE_PROFIT=0.10
```

### 2. Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws/opportunities
```

## 🏃 RUNNING THE SYSTEM

### Terminal 1: Start Backend

```bash
cd engine
npm start
```

Expected output:
```
✅ PostgreSQL connected
✅ Redis connected
🚀 SERVER STARTED ON PORT 3000
🌐 WebSocket: ws://localhost:3000/ws/opportunities
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.0.8  ready in 1234 ms
➜  Local:   http://localhost:5173/
```

## 🎯 USING THE SYSTEM

### Step 1: Open UI

Open browser: `http://localhost:5173`

### Step 2: Configure Accounts (if needed)

1. Fill in Account A:
   - Sportsbook: Select provider (e.g., NOVA)
   - URL: Enter sportsbook URL
   - Username: Your username
   - Password: Your password

2. Fill in Account B:
   - Sportsbook: Select provider (e.g., SBOBET)
   - URL: Enter sportsbook URL
   - Username: Your username
   - Password: Your password

> **Note:** Credentials are for manual login reference only. System does NOT auto-login.

### Step 3: Configure Tier Settings

In the Configuration panel:

```
Tier Stake ($):
- Tier 1 (Big Leagues):    100
- Tier 2 (Mid Leagues):    50
- Tier 3 (Small Leagues):  25

Profit Range (%):
- Min: 1.5
- Max: 5.0

Max Minute:
- HT: 40
- FT: 85

Match Filter:
- Select: MIXED (or LIVE/PREMATCH)

Market Filter:
- Enable: FT HDP, FT O/U, HT HDP, HT O/U
```

### Step 4: START TRADING

1. Click **"START TRADING"** button on Account A or B

2. System will check accounts:
   - If NOT logged in → Playwright browser opens
   - If logged in → System goes ONLINE

3. **Manual Login Flow:**
   - Playwright opens browser window (headed mode)
   - You log in MANUALLY to sportsbook
   - System waits for authentication
   - After login detected:
     * Auto-captures REST API endpoints
     * Auto-captures WebSocket endpoints
     * Saves to Redis
     * Validates profile
   - Browser can be closed or kept open

4. **System Ready:**
   - Live Scanner starts showing opportunities
   - Execution History tracks bets
   - Logs show system activity

### Step 5: Monitor Live Scanner

The Live Scanner shows real-time arbitrage opportunities:

```
┌──────────────────────────────────────────────────────────────┐
│ Match           │ Market  │ Account A     │ Account B        │
├──────────────────────────────────────────────────────────────┤
│ Man Utd vs      │ FT HDP  │ NOVA          │ SBOBET           │
│ Chelsea         │         │ Home -0.5     │ Away +0.5        │
│ Premier League  │         │ 0.85 • $100   │ 1.15 • $100      │
│ 20:00           │         │ Profit: 3.45% │ ROI: 1.73%       │
└──────────────────────────────────────────────────────────────┘
```

**Legend:**
- **Red odds** (< 1.00 HK) = Lower odds
- **Blue odds** (≥ 1.00 HK) = Higher odds
- **Stake** = Rounded to last digit 0 or 5
- **Profit** = Arbitrage profit percentage
- **ROI** = Return on investment

## 🧪 TESTING

### Quick Test Script

```bash
cd /data/workspace/opt
./test-system.sh
```

This will check:
- ✓ Backend running
- ✓ Database connected
- ✓ Redis connected
- ✓ WebSocket endpoint
- ✓ API endpoints working
- ✓ Frontend running

### Manual Tests

#### 1. Test WebSocket Connection

Open browser console (F12) on `http://localhost:5173`:

```javascript
// Should see:
// WebSocket connected ✓
```

#### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Sessions
curl http://localhost:3000/api/v1/sessions?user_id=1

# Config
curl http://localhost:3000/api/v1/config?user_id=1

# System health
curl http://localhost:3000/api/v1/system/health
```

#### 3. Test Manual Login Flow

```bash
# Trigger manual login
curl -X POST http://localhost:3000/api/v1/system/auto-toggle \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "enabled": true}'

# Check response:
# If needs_login: Browser windows should open
# If ready: System is online
```

#### 4. Test Endpoint Capture

After manual login completes:

```bash
# Check Redis for endpoint profiles
redis-cli
> KEYS endpoint_profile:*
> GET endpoint_profile:nova:NOVA:PRIVATE

# Should show:
# - rest_api.base_url
# - rest_api.auth_token
# - websocket.url
```

## 🔍 TROUBLESHOOTING

### Backend won't start

**Problem:** `Error: connect ECONNREFUSED`

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Check Redis is running: `redis-cli ping`
3. Verify `.env` file exists with correct credentials

### Frontend shows "WebSocket disconnected"

**Problem:** Cannot connect to WebSocket

**Solution:**
1. Ensure backend is running on port 3000
2. Check `VITE_WS_URL` in `frontend/.env`
3. Verify WebSocket server initialized: Check backend logs for "WebSocket server initialized"

### No accounts showing in UI

**Problem:** Account panels show default data

**Solution:**
1. Configure accounts via API:
```bash
curl -X POST http://localhost:3000/api/v1/sessions/login \
  -H "Content-Type: application/json" \
  -d '{
    "sportsbook": "NOVA",
    "url": "https://nova88.com",
    "username": "your_username",
    "password": "your_password",
    "user_id": 1
  }'
```

### Playwright browser doesn't open

**Problem:** Manual login flow doesn't trigger browser

**Solution:**
1. Install Playwright browsers: `npx playwright install chromium`
2. Check system routes loaded: `curl http://localhost:3000/api/v1/system/active-sessions`
3. Verify manual-login.service.js is loaded without errors

### Endpoint capture fails

**Problem:** No endpoints captured after manual login

**Solution:**
1. Stay on sportsbook page for 30 seconds after login
2. Navigate to live betting section
3. Check browser console for network activity
4. Verify endpoint-capture.service.js listeners are attached

## 📊 MONITORING

### Backend Logs

```bash
# Watch backend logs
cd engine
npm start

# Look for:
# [INFO] WebSocket client connected
# [INFO] Endpoint capture complete
# [INFO] Auto robot enabled
```

### Frontend Console

Open browser DevTools (F12) → Console:

```
WebSocket connected ✓
New opportunity: Man Utd vs Chelsea
Executed: Arsenal vs Liverpool
```

### Redis Monitoring

```bash
redis-cli
> MONITOR

# Watch for:
# SET endpoint_profile:nova:NOVA:PRIVATE
# GET endpoint_profile:sbobet:SBOBET:PRIVATE
```

## 📝 NEXT STEPS

After successful setup:

1. **Test with Real Accounts:**
   - Configure actual sportsbook credentials
   - Complete manual login
   - Verify endpoint capture

2. **Enable Auto Trading:**
   - Set `PAPER_TRADING_MODE=false` (when ready)
   - Configure tier stakes
   - Monitor execution

3. **Scale Up:**
   - Add more accounts
   - Configure additional markets
   - Adjust profit thresholds

## 🚨 IMPORTANT NOTES

### DO NOT
- ❌ Auto-login with credentials (security risk)
- ❌ Use socket.io (use native WebSocket only)
- ❌ Hardcode whitelabels in UI
- ❌ Let UI calculate odds/stakes
- ❌ Share browser sessions between accounts

### ALWAYS
- ✅ Manual login via Playwright
- ✅ Use Hongkong odds format (decimal - 1)
- ✅ Round stakes to end with 0 or 5
- ✅ Filter by tier (1, 2, 3)
- ✅ Verify endpoint profiles before trading

## 📚 DOCUMENTATION

- Full Implementation: `SYSTEM_IMPLEMENTATION.md`
- API Reference: http://localhost:3000/api/docs
- WebSocket Protocol: See SYSTEM_IMPLEMENTATION.md

## 🆘 SUPPORT

If you encounter issues:

1. Check logs (backend terminal)
2. Check browser console (F12)
3. Run test script: `./test-system.sh`
4. Review `SYSTEM_IMPLEMENTATION.md`

---

**System is ready for real odds testing!** 🎯
