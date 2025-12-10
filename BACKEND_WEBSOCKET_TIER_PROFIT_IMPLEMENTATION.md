# Backend Implementation Summary

## ✅ Completed Features

### 1. WebSocket untuk Live Opportunities

**Location**: `engine/src/websocket/opportunities.ws.js`

**Features Implemented**:
- WebSocket server pada endpoint: `ws://localhost:3000/ws/opportunities`
- Automatic client connection management (reconnect handling)
- Broadcast function untuk mengirim opportunities ke semua connected clients
- Ping/pong untuk keep-alive connections
- Graceful shutdown handling
- Client count tracking

**Integration**:
- Integrated into `engine/src/index.js` - initialized saat HTTP server start
- Used in `engine/src/routes/scanner.routes.js` untuk broadcast opportunities

**API**:
```javascript
const { 
  initializeWebSocket,      // Initialize WebSocket server
  broadcastOpportunity,     // Broadcast single opportunity
  broadcastOpportunities,   // Broadcast multiple opportunities
  getClientsCount,          // Get connected clients count
  closeWebSocket            // Close WebSocket server
} = require('./websocket/opportunities.ws');
```

**WebSocket Message Format**:
```json
{
  "type": "opportunity",
  "data": {
    "time": "2024-12-10T12:00:00.000Z",
    "profit": 0.0425,
    "tier": 1,
    "league": "Premier League",
    "home": "Manchester United",
    "away": "Chelsea",
    "legs": [
      {
        "site": "bet365",
        "league": "Premier League",
        "match": { "home": "...", "away": "..." },
        "pick": "home",
        "odds": 2.05
      },
      {
        "site": "pinnacle",
        "league": "Premier League",
        "match": { "home": "...", "away": "..." },
        "pick": "away",
        "odds": 1.95
      }
    ]
  },
  "timestamp": "2024-12-10T12:00:00.123Z"
}
```

---

### 2. Tier Detection (1 | 2 | 3)

**Location**: `engine/src/utils/tier.js`

**Features Implemented**:
- Function `detectTier(leagueName)` mengembalikan 1, 2, atau 3
- Case-insensitive substring matching
- Tier 1: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Europa League
- Tier 2: Championship, Segunda, Serie B, 2. Bundesliga, Ligue 2, Eredivisie, Primeira Liga, Liga MX, MLS
- Tier 3: All other leagues (default)

**Integration**:
- Integrated into `engine/src/services/arbitrage.service.js`
- Setiap opportunity mendapat field `tier` (1, 2, or 3)
- League name diextract dari provider data

**Example**:
```javascript
const { detectTier } = require('./utils/tier');

detectTier('Premier League');      // Returns: 1
detectTier('Championship');        // Returns: 2
detectTier('Random League');       // Returns: 3
detectTier('UEFA Champions League'); // Returns: 1
```

---

### 3. Profit Filter (Ignore > 10%)

**Location**: `engine/src/config/arbitrage.config.js`

**Configuration**:
```javascript
const MAX_ARBITRAGE_PROFIT = parseFloat(process.env.MAX_ARBITRAGE_PROFIT || '0.10');
```

**Features Implemented**:
- Default MAX_ARBITRAGE_PROFIT = 0.10 (10%)
- Configurable via environment variable `MAX_ARBITRAGE_PROFIT`
- Opportunities dengan profit > 10% tidak akan:
  - Masuk ke REST response
  - Di-broadcast via WebSocket
  - Disimpan ke database
- Logging untuk ignored opportunities:
  ```
  logger.warn(`Ignored arbitrage with profit=0.1234 (12.34%) > 10% for match ...`)
  ```

**Integration**:
- Implemented in `engine/src/services/arbitrage.service.js`
- Filtering dilakukan sebelum push opportunity ke hasil akhir

---

### 4. Enhanced Opportunity Structure

**Updated Opportunity Object**:
```javascript
{
  // Basic info
  match_id: "team1_team2",
  home: "Manchester United",
  away: "Chelsea",
  time: "2024-12-10 15:00",
  
  // Market info
  market: "ft_hdp",
  margin: -4.25,
  
  // NEW FIELDS
  profit: 0.0425,           // Decimal format (4.25%)
  tier: 1,                  // 1, 2, or 3
  league: "Premier League", // League name
  
  // Detailed legs structure
  legs: [
    {
      site: "bet365",
      league: "Premier League",
      match: { home: "...", away: "..." },
      pick: "home",
      odds: 2.05
    },
    {
      site: "pinnacle",
      league: "Premier League",
      match: { home: "...", away: "..." },
      pick: "away",
      odds: 1.95
    }
  ],
  
  // Legacy fields (backward compatibility)
  leg_1: { provider: "bet365", odds: 2.05, side: "home" },
  leg_2: { provider: "pinnacle", odds: 1.95, side: "away" },
  
  timestamp: "2024-12-10T12:00:00.123Z"
}
```

---

## 📁 Files Created/Modified

### Created:
1. `engine/src/utils/tier.js` - Tier detection utility
2. `engine/src/config/arbitrage.config.js` - Arbitrage configuration
3. `engine/src/websocket/opportunities.ws.js` - WebSocket server
4. `engine/test-implementation.js` - Test script

### Modified:
1. `engine/src/services/arbitrage.service.js` - Added tier detection & profit filtering
2. `engine/src/index.js` - WebSocket initialization & shutdown
3. `engine/src/routes/scanner.routes.js` - WebSocket broadcasting

---

## 🚀 Usage Examples

### 1. Connect to WebSocket (Client Side)
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/opportunities');

ws.onopen = () => {
  console.log('Connected to opportunities feed');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'opportunity') {
    console.log('New opportunity:', message.data);
    console.log('Profit:', (message.data.profit * 100).toFixed(2) + '%');
    console.log('Tier:', message.data.tier);
  }
};
```

### 2. Send Odds to Detect Opportunities
```bash
curl -X POST http://localhost:3000/api/v1/scanner/detect \
  -H "Content-Type: application/json" \
  -d '{
    "odds_by_provider": {
      "bet365": [{
        "home_team": "Man United",
        "away_team": "Chelsea",
        "league": "Premier League",
        "time": "2024-12-10 15:00",
        "odds": {
          "ft_hdp": { "home": 2.05, "away": 1.85 }
        }
      }],
      "pinnacle": [{
        "home_team": "Man United",
        "away_team": "Chelsea",
        "league": "Premier League",
        "time": "2024-12-10 15:00",
        "odds": {
          "ft_hdp": { "home": 1.95, "away": 1.95 }
        }
      }]
    }
  }'
```

### 3. Check WebSocket Status
```bash
curl http://localhost:3000/api/v1/scanner/live-feed
```

Response:
```json
{
  "success": true,
  "message": "Use WebSocket connection for live feed",
  "ws_url": "ws://localhost:3000/ws/opportunities",
  "connected_clients": 5
}
```

---

## 🔧 Configuration

### Environment Variables

Add to `.env` file:
```bash
# Maximum arbitrage profit to allow (default: 0.10 = 10%)
MAX_ARBITRAGE_PROFIT=0.10

# Minimum arbitrage profit (default: 0.01 = 1%)
MIN_ARBITRAGE_PROFIT=0.01
```

---

## ✅ Testing

Run the test script:
```bash
cd /data/workspace/arb
node engine/test-implementation.js
```

Expected output:
```
============================================================
Testing Backend Implementation
============================================================

1. Testing Tier Detection:
---------------------------
  Premier League                 → Tier 1
  La Liga                        → Tier 1
  Bundesliga                     → Tier 1
  Championship                   → Tier 2
  Serie B                        → Tier 2
  Eredivisie                     → Tier 2
  Random League                  → Tier 3
  UEFA Champions League          → Tier 1
  Ligue 2                        → Tier 2

2. Testing Profit Filter:
-------------------------
  MAX_ARBITRAGE_PROFIT: 0.1 (10%)
  Profit: 3.0% → ✅ ALLOWED
  Profit: 5.0% → ✅ ALLOWED
  Profit: 8.0% → ✅ ALLOWED
  Profit: 10.0% → ✅ ALLOWED
  Profit: 12.0% → ❌ IGNORED
  Profit: 15.0% → ❌ IGNORED
```

---

## 📊 Verification Checklist

- [x] WebSocket server initialized on `/ws/opportunities`
- [x] Tier detection working (1, 2, 3)
- [x] Profit filter ignoring > 10%
- [x] Opportunities have all required fields (profit, tier, legs, league)
- [x] Broadcasting opportunities via WebSocket
- [x] Logging for ignored opportunities
- [x] No modifications to `minimal-ui/` folder
- [x] No modifications to `docker-compose.yml`
- [x] No syntax errors in JavaScript code
- [x] Backward compatibility maintained (legacy fields)

---

## 🎯 Next Steps

1. Start the engine:
   ```bash
   cd /data/workspace/arb/engine
   npm start
   ```

2. Connect WebSocket client to test live feed

3. Send test odds data to `/api/v1/scanner/detect` endpoint

4. Verify opportunities are broadcast with tier and profit fields

---

## 📝 Notes

- All changes are in `engine/` folder only
- No changes to UI or Docker Compose
- Backward compatible with existing API
- WebSocket automatically broadcasts when opportunities detected
- Profit > 10% logged but not sent to clients
- Tier detected from league name automatically
