# FINAL TEST CHECKLIST - SPORTSBOOK ARBITRAGE SYSTEM

## ✅ PRE-DEPLOYMENT VERIFICATION

### 1. BACKEND FILES VERIFICATION
- [x] `engine/src/capture/endpoint-capture.service.js` created
- [x] `engine/src/scanner/tier-filter.service.js` created
- [x] `engine/src/routes/system.routes.js` modified
- [x] `engine/src/websocket/opportunities.ws.js` modified
- [x] No syntax errors detected

### 2. FRONTEND FILES VERIFICATION
- [x] `frontend/src/App.tsx` - Native WebSocket implemented
- [x] `frontend/src/components/AccountPanel.tsx` - Dynamic whitelabel
- [x] `frontend/src/components/Configuration.tsx` - Tier config to backend
- [x] `frontend/src/components/LiveScanner.tsx` - Already correct (1 row)
- [x] `frontend/src/services/api.js` - Whitelabels endpoint added
- [x] No syntax errors detected

## 🧪 FUNCTIONAL TEST CHECKLIST

### TEST 1: WebSocket Connection
**Objective**: Verify native WebSocket (NOT socket.io)

**Steps**:
1. Start backend: `cd engine && npm start`
2. Open browser DevTools → Network tab
3. Filter by "WS" (WebSocket)
4. Check connection to: `ws://localhost:3000/ws/opportunities`

**Expected Result**:
- ✓ WebSocket connection established
- ✓ NO requests to `/socket.io`
- ✓ Connection status: "101 Switching Protocols"

**Status**: [ ] PASS [ ] FAIL

---

### TEST 2: Account Panel - Account A
**Objective**: Configure Account A dynamically

**Steps**:
1. Open UI: http://localhost:3000
2. Find "Account A" panel
3. Select Sportsbook: NOVA
4. Enter URL: https://nova88.com
5. Enter Username: testuser
6. Enter Password: testpass
7. Click "Save Account"

**Expected Result**:
- ✓ Account saved to backend
- ✓ Console shows: "Account A saved successfully"
- ✓ No hardcoded whitelabel

**Status**: [ ] PASS [ ] FAIL

---

### TEST 3: Account Panel - Account B
**Objective**: Configure Account B dynamically

**Steps**:
1. Find "Account B" panel
2. Select Sportsbook: SBOBET
3. Enter URL: https://sbobet.com
4. Enter Username: testuser2
5. Enter Password: testpass2
6. Click "Save Account"

**Expected Result**:
- ✓ Account saved to backend
- ✓ Console shows: "Account B saved successfully"
- ✓ No hardcoded whitelabel

**Status**: [ ] PASS [ ] FAIL

---

### TEST 4: START TRADING - Login Required
**Objective**: Verify manual login flow

**Steps**:
1. Click "START TRADING" button
2. Check response in browser console
3. Check logs panel in UI

**Expected Result**:
- ✓ Response: `{ requires_login: true }`
- ✓ Log shows: "Manual login required for accounts"
- ✓ NO auto-login attempt

**Status**: [ ] PASS [ ] FAIL

---

### TEST 5: Tier Configuration
**Objective**: Verify tier config sends to backend

**Steps**:
1. Open Configuration panel
2. Set Tier 1: 100
3. Set Tier 2: 50
4. Set Tier 3: 0 (disable)
5. Check Network tab for POST request

**Expected Result**:
- ✓ POST to `/api/v1/config/system`
- ✓ Payload includes: `{ tier: [1, 2], ... }`
- ✓ Tier 3 excluded (value = 0)

**Status**: [ ] PASS [ ] FAIL

---

### TEST 6: Live Scanner Display
**Objective**: Verify 1 match = 1 row with Account A & B

**Steps**:
1. Inject test opportunity via backend
2. Check Live Scanner table
3. Verify row structure

**Expected Result**:
- ✓ 1 row per match
- ✓ Account A column shows provider, selection, odds, stake
- ✓ Account B column shows provider, selection, odds, stake
- ✓ NO separate rows for each bet

**Status**: [ ] PASS [ ] FAIL

---

### TEST 7: Odds Color Rules
**Objective**: Verify odds color based on HK odds

**Test Cases**:
- HK Odds = 0.80 → Expected: RED (text-red-400)
- HK Odds = 1.20 → Expected: BLUE (text-blue-400)
- HK Odds = 0.95 → Expected: RED
- HK Odds = 1.00 → Expected: BLUE

**Expected Result**:
- ✓ All odds < 1.00 are RED
- ✓ All odds >= 1.00 are BLUE

**Status**: [ ] PASS [ ] FAIL

---

### TEST 8: Stake Rounding
**Objective**: Verify stake ends in 0 or 5

**Test Cases**:
- Raw stake: 12 → Rounded: 10
- Raw stake: 8 → Rounded: 10
- Raw stake: 27 → Rounded: 25
- Raw stake: 23 → Rounded: 25
- Raw stake: 18 → Rounded: 20

**Expected Result**:
- ✓ All rounded stakes end in 0 or 5
- ✓ Display shows rounded value

**Status**: [ ] PASS [ ] FAIL

---

### TEST 9: Endpoint Auto-Capture
**Objective**: Verify endpoint capture to Redis

**Steps**:
1. Simulate manual login (via Playwright)
2. Check Redis for captured endpoints
3. Verify keys exist

**Redis Keys to Check**:
```
endpoint_profile:A:NOVA:PUBLIC
endpoint_profile:A:NOVA:PRIVATE
endpoint_profile:A:NOVA:WEBSOCKET
endpoint_profile:A:NOVA:COMPLETE
```

**Expected Result**:
- ✓ All 4 keys exist in Redis
- ✓ Data contains base_url, headers, authToken
- ✓ WebSocket URL captured

**Status**: [ ] PASS [ ] FAIL

---

### TEST 10: Tier Filter Backend
**Objective**: Verify tier filtering works

**Steps**:
1. Create test opportunities:
   - Match 1: Premier League (Tier 1)
   - Match 2: Championship (Tier 2)
   - Match 3: Unknown League (Tier 3)
2. Set tier config: [1, 2]
3. Check filtered results

**Expected Result**:
- ✓ Match 1 (Tier 1) → INCLUDED
- ✓ Match 2 (Tier 2) → INCLUDED
- ✓ Match 3 (Tier 3) → EXCLUDED

**Status**: [ ] PASS [ ] FAIL

---

### TEST 11: No Socket.io Dependency
**Objective**: Verify socket.io is NOT used

**Steps**:
1. Check `frontend/package.json`
2. Check Network tab for `/socket.io` requests
3. Verify WebSocket is native

**Expected Result**:
- ✓ NO socket.io-client in package.json
- ✓ NO requests to /socket.io
- ✓ WebSocket uses native API

**Status**: [ ] PASS [ ] FAIL

---

### TEST 12: Market Filter Configuration
**Objective**: Verify market config sends to backend

**Steps**:
1. Enable: FT HDP, FT O/U
2. Disable: FT 1X2, HT HDP, HT O/U, HT 1X2
3. Check POST payload

**Expected Result**:
- ✓ Payload: `{ markets: ["FT_HDP", "FT_OU"] }`
- ✓ Disabled markets NOT included

**Status**: [ ] PASS [ ] FAIL

---

## 🔍 API ENDPOINT TESTS

### Endpoint 1: GET /api/v1/system/whitelabels
**Command**:
```bash
curl http://localhost:3000/api/v1/system/whitelabels
```

**Expected Response**:
```json
{
  "success": true,
  "whitelabels": [
    { "whitelabel": "A", "provider": "NOVA", ... },
    { "whitelabel": "B", "provider": "SBOBET", ... }
  ],
  "accounts": ["A", "B"]
}
```

**Status**: [ ] PASS [ ] FAIL

---

### Endpoint 2: POST /api/v1/system/auto-toggle
**Command**:
```bash
curl -X POST http://localhost:3000/api/v1/system/auto-toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

**Expected Response (if not logged in)**:
```json
{
  "success": false,
  "requires_login": true,
  "accounts_to_login": [
    { "whitelabel": "A", "sportsbook": "NOVA", ... }
  ]
}
```

**Status**: [ ] PASS [ ] FAIL

---

### Endpoint 3: GET /socket.io (Should NOT exist)
**Command**:
```bash
curl -I http://localhost:3000/socket.io
```

**Expected Response**:
```
HTTP/1.1 404 Not Found
```

**Status**: [ ] PASS [ ] FAIL

---

## 📊 PERFORMANCE TESTS

### Test 1: WebSocket Message Throughput
**Objective**: Handle 100 opportunities/second

**Steps**:
1. Broadcast 100 opportunities via WebSocket
2. Measure client receive rate
3. Check for dropped messages

**Expected Result**:
- ✓ All messages received
- ✓ No lag > 100ms
- ✓ UI updates smoothly

**Status**: [ ] PASS [ ] FAIL

---

### Test 2: Redis Storage Performance
**Objective**: Endpoint profiles saved within 500ms

**Steps**:
1. Capture endpoint profile
2. Measure Redis save time
3. Verify data integrity

**Expected Result**:
- ✓ Save time < 500ms
- ✓ Data correctly stored
- ✓ Keys expire after 24h

**Status**: [ ] PASS [ ] FAIL

---

## 🚨 ERROR HANDLING TESTS

### Test 1: Backend Offline
**Objective**: UI handles backend offline gracefully

**Steps**:
1. Stop backend server
2. Check UI behavior
3. Restart backend

**Expected Result**:
- ✓ WebSocket shows "disconnected"
- ✓ Log: "WebSocket disconnected, reconnecting..."
- ✓ Auto-reconnect after 5 seconds

**Status**: [ ] PASS [ ] FAIL

---

### Test 2: Invalid Account Credentials
**Objective**: Handle invalid login gracefully

**Steps**:
1. Enter invalid credentials
2. Click "Save Account"
3. Check error handling

**Expected Result**:
- ✓ Error message displayed
- ✓ No system crash
- ✓ User can retry

**Status**: [ ] PASS [ ] FAIL

---

## ✅ FINAL SIGN-OFF

### All Tests Completed
- [ ] All functional tests PASSED
- [ ] All API endpoint tests PASSED
- [ ] All performance tests PASSED
- [ ] All error handling tests PASSED

### System Ready for Production
- [ ] No socket.io dependency
- [ ] Native WebSocket working
- [ ] Manual login flow implemented
- [ ] Endpoint auto-capture working
- [ ] Tier filtering functional
- [ ] Odds display correct
- [ ] Stake rounding correct

### Approved By
- **Date**: _____________
- **Signature**: _____________

---

**VERIFICATION SCRIPT**: Run `./verify-implementation.sh` for automated checks

**FINAL STATUS**: 
- [ ] ✅ READY FOR PRODUCTION
- [ ] ⚠️ NEEDS FIXES
- [ ] ❌ MAJOR ISSUES

