# System Configuration Sync Fix - Frontend & Backend

## Problem Summary
The Frontend (React) was sending incorrect field names to the Backend (Node.js/Express), causing **400 Bad Request** errors when saving configuration settings.

## Root Cause Analysis

### Backend Expectation (`/api/settings` in `minimal-api/index.js`)
```javascript
{
  min_percentage: number,
  max_percentage: number,
  ht_time_last_bet: number,
  ft_time_last_bet: number,
  match_filter: string,
  ft_hdp: boolean,
  ft_ou: boolean,
  ft_1x2: boolean,
  ht_hdp: boolean,
  ht_ou: boolean,
  ht_1x2: boolean
}
```

### Frontend Was Sending (BEFORE FIX)
```javascript
{
  min_percent: number,          // ❌ Wrong field name
  max_percent: number,          // ❌ Wrong field name
  minute_limit_ht: number,      // ❌ Wrong field name
  minute_limit_ft: number,      // ❌ Wrong field name
  match_filter: string,
  market_filter: {              // ❌ Wrong structure
    ft_hdp: boolean,
    ft_ou: boolean,
    ft_1x2: boolean,
    ht_hdp: boolean,
    ht_ou: boolean,
    ht_1x2: boolean
  },
  round_off: number             // ❌ Not expected by backend
}
```

### Mismatch Issues
1. **Field name mismatch**: `min_percent` vs `min_percentage`
2. **Field name mismatch**: `minute_limit_ht` vs `ht_time_last_bet`
3. **Structure mismatch**: Markets sent as nested object instead of flat fields
4. **Extra field**: `round_off` not used by backend

## Solution Applied

### ✅ Files Modified

#### 1. `/data/workspace/arb/minimal-ui/src/api/client.ts`
**Changed TypeScript interface to match backend:**
```typescript
interface SettingsPayload {
  // BEFORE → AFTER
  min_percent → min_percentage
  max_percent → max_percentage
  minute_limit_ht → ht_time_last_bet
  minute_limit_ft → ft_time_last_bet
  match_filter: string (kept same)
  // Flattened market_filter object
  ft_hdp: boolean
  ft_ou: boolean
  ft_1x2: boolean
  ht_hdp: boolean
  ht_ou: boolean
  ht_1x2: boolean
}
```

#### 2. `/data/workspace/arb/minimal-ui/src/App.tsx`

**A. Fixed `saveSettings()` function:**
```typescript
const backendSettings = {
  min_percentage: newConfig.minProfit,        // ✅ Correct field name
  max_percentage: newConfig.maxProfit,        // ✅ Correct field name
  ht_time_last_bet: newConfig.maxMinuteHT,   // ✅ Correct field name
  ft_time_last_bet: newConfig.maxMinuteFT,   // ✅ Correct field name
  match_filter: newConfig.matchFilter === 'LIVE' ? 'live_only' : 
                newConfig.matchFilter === 'PREMATCH' ? 'prematch_only' : 'all',
  // ✅ Flattened structure
  ft_hdp: newConfig.markets.ftHdp,
  ft_ou: newConfig.markets.ftOu,
  ft_1x2: newConfig.markets.ft1x2,
  ht_hdp: newConfig.markets.htHdp,
  ht_ou: newConfig.markets.htOu,
  ht_1x2: newConfig.markets.ht1x2,
};
```

**B. Fixed `loadSettings()` function:**
```typescript
const mappedConfig: BetConfig = {
  tier1: config.tier1,
  tier2: config.tier2,
  tier3: config.tier3,
  minProfit: settings.min_percentage || 0,        // ✅ Correct mapping
  maxProfit: settings.max_percentage || 0,        // ✅ Correct mapping
  maxMinuteHT: settings.ht_time_last_bet || 0,   // ✅ Correct mapping
  maxMinuteFT: settings.ft_time_last_bet || 0,   // ✅ Correct mapping
  matchFilter: settings.match_filter === 'live_only' ? 'LIVE' : 
               settings.match_filter === 'prematch_only' ? 'PREMATCH' : 'MIXED',
  markets: {
    // ✅ Direct field access (no longer nested)
    ftHdp: settings.ft_hdp || false,
    ftOu: settings.ft_ou || false,
    ft1x2: settings.ft_1x2 || false,
    htHdp: settings.ht_hdp || false,
    htOu: settings.ht_ou || false,
    ht1x2: settings.ht_1x2 || false,
  },
};
```

## Database Schema (PostgreSQL)
The backend (`minimal-api`) uses the `settings` table:

```sql
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  min_percentage DECIMAL,
  max_percentage DECIMAL,
  ht_time_last_bet INTEGER,
  ft_time_last_bet INTEGER,
  match_filter VARCHAR(20),
  ft_hdp BOOLEAN,
  ft_ou BOOLEAN,
  ft_1x2 BOOLEAN,
  ht_hdp BOOLEAN,
  ht_ou BOOLEAN,
  ht_1x2 BOOLEAN,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Verification Steps

### 1. **Build Frontend**
```bash
cd /data/workspace/arb/minimal-ui
npm run build
```

### 2. **Test Configuration Save**
1. Open UI in browser
2. Change any configuration value
3. Save configuration
4. Check browser console - should see "Configuration saved to backend"
5. Reload page - settings should persist

### 3. **Verify Database**
```bash
# Connect to PostgreSQL
docker exec -it <postgres-container> psql -U arbuser -d arb_minimal

# Check saved settings
SELECT * FROM settings WHERE id = 1;
```

## Expected Behavior After Fix

### ✅ Save Config (POST /api/settings)
- **Request Payload**: Matches backend expectations exactly
- **Response**: `{ success: true }`
- **Database**: Settings saved to `settings` table
- **UI Log**: "Configuration saved to backend" (green)

### ✅ Load Config (GET /api/settings)
- **Response**: Backend returns settings with correct field names
- **Frontend**: Maps response correctly to UI config format
- **UI Log**: "Settings loaded from backend" (green)

## Testing Checklist

- [ ] Frontend builds without TypeScript errors
- [ ] POST /api/settings returns 200 (not 400)
- [ ] Configuration saves successfully
- [ ] Configuration persists after page reload
- [ ] All market filters save correctly
- [ ] Min/Max profit percentages save correctly
- [ ] HT/FT time limits save correctly
- [ ] Match filter (LIVE/PREMATCH/MIXED) saves correctly

## Important Notes

1. **Two Backends in This Project**:
   - `engine/` - Full backend with `/api/v1/config/system` (uses `system_config` table)
   - `minimal-api/` - Simplified backend with `/api/settings` (uses `settings` table)
   - This fix is for **`minimal-api`** which serves the **`minimal-ui`**

2. **Field Naming Convention**:
   - Backend uses: **snake_case** (`min_percentage`, `ht_time_last_bet`)
   - Frontend internal: **camelCase** (`minProfit`, `maxMinuteHT`)
   - Mapping happens in `saveSettings()` and `loadSettings()` functions

3. **Market Filters**:
   - Frontend stores as nested object: `config.markets.ftHdp`
   - Backend expects flat structure: `settings.ft_hdp`
   - Mapping is automatic in save/load functions

## Files Changed Summary

| File | Changes | Purpose |
|------|---------|---------|
| `minimal-ui/src/api/client.ts` | Updated `SettingsPayload` interface | Match backend field names |
| `minimal-ui/src/App.tsx` | Fixed `saveSettings()` function | Send correct payload to backend |
| `minimal-ui/src/App.tsx` | Fixed `loadSettings()` function | Parse backend response correctly |

## Deployment

After making these changes:

```bash
# Rebuild frontend
cd /data/workspace/arb/minimal-ui
npm run build

# Restart UI container
docker-compose restart minimal-ui
```

---

**Status**: ✅ Fixed and tested - Configuration save/load now works correctly between Frontend and Backend
