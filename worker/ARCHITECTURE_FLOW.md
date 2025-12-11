# C-Sport Scraper - Architecture Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Worker Process                             │
│                                                                   │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐      │
│  │   index.js  │────▶│ sessionMgr   │────▶│   Redis     │      │
│  │             │     │              │     │             │      │
│  │ Main Loop   │     │ Get/Create   │     │ Sessions    │      │
│  └─────────────┘     │ Session      │     │ (Shared)    │      │
│         │            └──────────────┘     └─────────────┘      │
│         │                    │                                  │
│         ▼                    ▼                                  │
│  ┌─────────────┐     ┌──────────────┐                          │
│  │   csport.js │────▶│ Playwright   │                          │
│  │             │     │              │                          │
│  │ Scraper     │     │ (Login Only) │                          │
│  └─────────────┘     └──────────────┘                          │
│         │                                                       │
│         │ (API Call with cookies)                              │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ QQ188 API   │                                               │
│  │             │                                               │
│  │ C-Sport     │                                               │
│  └─────────────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ Engine API  │                                               │
│  │             │                                               │
│  │ (Arb Det.)  │                                               │
│  └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Flow

### 1. First Request (No Session)

```
Worker Start
    │
    ├─▶ Initialize Redis Connection
    │   └─▶ Test connection (PING)
    │
    ├─▶ Load Provider Config (C-Sport/QQ188)
    │   ├─▶ username: from env
    │   └─▶ password: from env
    │
    └─▶ Start Main Loop (every 5s)
         │
         ├─▶ Process Provider: C-Sport
         │    │
         │    ├─▶ csport.fetchOdds(credentials)
         │    │    │
         │    │    ├─▶ Check Redis for Session
         │    │    │   └─▶ KEY: session:qq188:username
         │    │    │       └─▶ NOT FOUND
         │    │    │
         │    │    ├─▶ Acquire Lock
         │    │    │   └─▶ SET lock:qq188:username EX 30 NX
         │    │    │       └─▶ OK (lock acquired)
         │    │    │
         │    │    ├─▶ Launch Browser (Playwright)
         │    │    │   ├─▶ Navigate to login page
         │    │    │   ├─▶ Fill username
         │    │    │   ├─▶ Fill password
         │    │    │   └─▶ Click login
         │    │    │
         │    │    ├─▶ Extract Cookies
         │    │    │   └─▶ context.cookies()
         │    │    │
         │    │    ├─▶ Store in Redis
         │    │    │   └─▶ SETEX session:qq188:username 600 {...}
         │    │    │
         │    │    ├─▶ Release Lock
         │    │    │   └─▶ DEL lock:qq188:username
         │    │    │
         │    │    ├─▶ Make API Call
         │    │    │   ├─▶ POST to DataOdds.ashx
         │    │    │   ├─▶ Headers: Cookie from session
         │    │    │   └─▶ Body: Form data (fc=5, etc.)
         │    │    │
         │    │    ├─▶ Parse Response
         │    │    │   └─▶ Extract matches, odds
         │    │    │
         │    │    └─▶ Return Standardized Data
         │    │         {
         │    │           provider: "csport",
         │    │           sport: "soccer",
         │    │           matches: [...]
         │    │         }
         │    │
         │    └─▶ Send to Engine (TODO)
         │
         └─▶ Wait 5s → Repeat
```

### 2. Subsequent Request (Session Exists)

```
Worker Loop
    │
    ├─▶ Process Provider: C-Sport
    │    │
    │    ├─▶ csport.fetchOdds(credentials)
    │    │    │
    │    │    ├─▶ Check Redis for Session
    │    │    │   └─▶ GET session:qq188:username
    │    │    │       └─▶ FOUND ✓
    │    │    │
    │    │    ├─▶ Validate Session
    │    │    │   ├─▶ Check cookies exist
    │    │    │   ├─▶ Check expiration
    │    │    │   └─▶ VALID ✓
    │    │    │
    │    │    ├─▶ Update TTL
    │    │    │   └─▶ SETEX session:qq188:username 600 {...}
    │    │    │
    │    │    ├─▶ Make API Call (No browser!)
    │    │    │   ├─▶ POST to DataOdds.ashx
    │    │    │   ├─▶ Headers: Cookie from Redis session
    │    │    │   └─▶ Body: Form data
    │    │    │
    │    │    ├─▶ Parse Response
    │    │    │   └─▶ Extract matches
    │    │    │
    │    │    └─▶ Return Data
    │    │
    │    └─▶ Send to Engine
    │
    └─▶ Wait 5s → Repeat
```

### 3. Session Expired/Invalid

```
Worker Loop
    │
    ├─▶ Process Provider: C-Sport
    │    │
    │    ├─▶ csport.fetchOdds(credentials)
    │    │    │
    │    │    ├─▶ Check Redis for Session
    │    │    │   └─▶ GET session:qq188:username
    │    │    │       └─▶ NOT FOUND (TTL expired)
    │    │    │
    │    │    └─▶ Same as "First Request" flow
    │    │         (Acquire lock → Login → Store → Use)
    │    │
    │    └─▶ Send to Engine
    │
    └─▶ Wait 5s → Repeat
```

### 4. Multi-Worker Scenario

```
Worker 1                    Redis                     Worker 2
    │                         │                           │
    ├─▶ Check session         │                           │
    │   └─▶ NOT FOUND         │                           │
    │                         │                           │
    ├─▶ Acquire lock          │                           │
    │   └─▶ SET lock NX ✓     │                           │
    │                         │                           │
    │ (Logging in...)         │                     ┌─────┤
    │                         │                     │     │
    │                         │            Check session  │
    │                         │                     │     │
    │                         │        ◀────────────┘     │
    │                         │        NOT FOUND          │
    │                         │                           │
    │                         │        Try acquire lock   │
    │                         │                     ┌─────┤
    │                         │ ◀───────────────────┘     │
    │                         │ SET lock NX FAIL          │
    │                         │ (Worker 1 has lock)       │
    │                         │                           │
    │                         │        Wait 2s...         │
    │                         │                     │     │
    ├─▶ Store session         │                     │     │
    │   └─▶ SETEX ✓          │                     │     │
    │                         │                     │     │
    ├─▶ Release lock          │                     │     │
    │   └─▶ DEL lock          │                     │     │
    │                         │                           │
    │                         │        Check session      │
    │                         │                     ┌─────┤
    │                         │        GET session  │     │
    │                         │ ◀───────────────────┘     │
    │                         │ FOUND ✓                   │
    │                         │                           │
    │                         │        Use cookies  ─────▶│
    │                         │        Make API call      │
    │                         │                           │
    │ (Both workers now use same session from Redis)     │
```

## Redis Data Structure

### Session Key
```
KEY: session:qq188:username
VALUE: {
  "provider": "qq188",
  "username": "user123",
  "cookies": [
    {
      "name": "SESSION_ID",
      "value": "abc123...",
      "domain": ".5336267.com",
      "path": "/",
      "expires": 1702345678
    },
    ...
  ],
  "createdAt": "2025-12-11T10:00:00.000Z",
  "lastActivity": "2025-12-11T10:05:00.000Z"
}
TTL: 600 seconds (10 minutes)
```

### Lock Key
```
KEY: lock:qq188:username
VALUE: "1"
TTL: 30 seconds
```

## API Request Flow

### C-Sport API Call

```
Request:
┌────────────────────────────────────────────────────┐
│ POST https://mylv.5336267.com/.../DataOdds.ashx   │
├────────────────────────────────────────────────────┤
│ Headers:                                           │
│   Content-Type: application/x-www-form-urlencoded  │
│   Cookie: SESSION_ID=abc123; AUTH=xyz789          │
│   User-Agent: Mozilla/5.0 ...                     │
├────────────────────────────────────────────────────┤
│ Body:                                              │
│   fc=5                                             │
│   m_accType=MY MR                                  │
│   SystemLanguage=en-US                             │
│   TimeFilter=0                                     │
│   m_gameType=S_                                    │
│   m_SortByTime=0                                   │
│   SingleDouble=double                              │
│   clientTime=16995859                              │
│   ... (more params)                                │
└────────────────────────────────────────────────────┘

Response:
┌────────────────────────────────────────────────────┐
│ {                                                  │
│   "d": [                                           │
│     {                                              │
│       "id": "123456",                              │
│       "homeTeam": "Team A",                        │
│       "awayTeam": "Team B",                        │
│       "homeOdds": 0.95,                            │
│       "drawOdds": 2.10,                            │
│       "awayOdds": 0.90,                            │
│       ...                                          │
│     },                                             │
│     ...                                            │
│   ]                                                │
│ }                                                  │
└────────────────────────────────────────────────────┘

Parsed:
┌────────────────────────────────────────────────────┐
│ {                                                  │
│   "provider": "csport",                            │
│   "sport": "soccer",                               │
│   "timestamp": "2025-12-11T10:05:00.000Z",         │
│   "matches": [                                     │
│     {                                              │
│       "match_id": "123456",                        │
│       "home_team": "Team A",                       │
│       "away_team": "Team B",                       │
│       "league": "Premier League",                  │
│       "start_time": "2025-12-11T15:00:00Z",        │
│       "odds": {                                    │
│         "home": 0.95,                              │
│         "draw": 2.10,                              │
│         "away": 0.90                               │
│       }                                            │
│     },                                             │
│     ...                                            │
│   ]                                                │
│ }                                                  │
└────────────────────────────────────────────────────┘
```

## Performance Characteristics

### Timeline

```
First Request (No Session):
├─ 0ms     : Check Redis
├─ 5ms     : Redis miss
├─ 10ms    : Acquire lock
├─ 100ms   : Launch browser
├─ 2000ms  : Navigate to login
├─ 500ms   : Fill form
├─ 1000ms  : Wait for login
├─ 100ms   : Extract cookies
├─ 50ms    : Store in Redis
├─ 10ms    : Release lock
├─ 200ms   : Make API call
└─ 50ms    : Parse response
────────────────────────────
Total: ~4s (with browser)

Subsequent Request (Session Exists):
├─ 0ms     : Check Redis
├─ 5ms     : Redis hit
├─ 10ms    : Validate session
├─ 5ms     : Update TTL
├─ 200ms   : Make API call
└─ 50ms    : Parse response
────────────────────────────
Total: ~300ms (no browser!)

Performance Gain: 93% faster
```

## Error Handling

```
┌─────────────────────────────────────────────────┐
│ Error Type          │ Handler                  │
├─────────────────────┼──────────────────────────┤
│ Redis connection    │ Retry with backoff       │
│ Lock timeout        │ Wait & reuse session     │
│ Login failed        │ Log & retry next loop    │
│ API 401/403         │ Clear session, re-login  │
│ API timeout         │ Log & continue           │
│ Parse error         │ Log & return empty       │
│ Network error       │ Log & retry              │
└─────────────────────────────────────────────────┘
```

---

**Architecture designed for:**
- ✅ High performance (cookie-based after login)
- ✅ Multi-worker safety (locks + shared sessions)
- ✅ Reliability (error handling + auto-refresh)
- ✅ Scalability (stateless workers + Redis)
