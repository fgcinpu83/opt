# Worker Modular Architecture Diagram

## Component Relationship

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.js                                 │
│                    (Main Entry Point)                            │
│  - Initialization                                                │
│  - Main Loop Orchestration                                       │
│  - Signal Handling                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ imports & uses
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    config/constants.js                           │
│                   (Configuration Layer)                          │
│  - TIMEOUTS, RETRIES, URLS                                       │
│  - BROWSER_OPTIONS, CONTEXT_OPTIONS                              │
│  - WORKER settings                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Utilities Layer                             │
│  ┌─────────────────┬──────────────────┬────────────────────┐    │
│  │  logger.js      │  validators.js   │  formatters.js     │    │
│  │  - debug()      │  - isValidOdds() │  - formatDate()    │    │
│  │  - info()       │  - isValidUrl()  │  - formatOdds()    │    │
│  │  - warn()       │  - isValidProxy()│  - formatCurrency()│    │
│  │  - error()      │  - etc...        │  - etc...          │    │
│  └─────────────────┴──────────────────┴────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                       ▲
                       │ uses
                       │
┌─────────────────────────────────────────────────────────────────┐
│                      Services Layer                              │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              browserService.js                         │     │
│  │  - launchBrowser(), createContext(), createPage()      │     │
│  │  - goto(), screenshot(), click(), fill()               │     │
│  │  - waitForSelector(), evaluate()                       │     │
│  │  - closeBrowser(), closeContext(), closePage()         │     │
│  └────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              proxyService.js                           │     │
│  │  - setProxies(), getNextProxy()                        │     │
│  │  - markProxyFailed(), rotateOnFailure()                │     │
│  │  - getProxyStats(), getBestProxy()                     │     │
│  └────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              oddsService.js                            │     │
│  │  - fetchOdds(), fetchEventOdds()                       │     │
│  │  - validateOdds(), parseOdds()                         │     │
│  │  - calculateArbitrage(), compareOdds()                 │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                       ▲
                       │ uses
                       │
┌─────────────────────────────────────────────────────────────────┐
│                    Session Management Layer                      │
│  ┌────────────────────────────────────────────────────────┐     │
│  │           sessions/sessionManager.js                   │     │
│  │  - createSession(), getSession()                       │     │
│  │  - closeSession(), closeAllSessions()                  │     │
│  │  - refreshSession(), cleanupInactiveSessions()         │     │
│  │  - hasActiveSession()                                  │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Scrapers Layer (Future)                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │           scrapers/sboProvider.js                      │     │
│  │           scrapers/bet365Provider.js                   │     │
│  │           scrapers/pinnacleProvider.js                 │     │
│  │           ... (to be implemented)                      │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│   Start      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│  Load Configuration      │  ← config/constants.js
│  (constants, env vars)   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Initialize Proxies      │  ← proxyService.setProxies()
│  (from env or config)    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Main Loop Start         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Fetch Odds from API     │  ← oddsService.fetchOdds()
│  (BOT_URL/api/odds)      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  For Each Provider:                  │
│  ┌────────────────────────────────┐  │
│  │ Get/Create Session             │  │  ← sessionManager.getSession()
│  │   ↓                            │  │     sessionManager.createSession()
│  │ Get Next Proxy                 │  │  ← proxyService.getNextProxy()
│  │   ↓                            │  │
│  │ Launch Browser with Proxy      │  │  ← browserService.launchBrowser()
│  │   ↓                            │  │
│  │ Navigate & Scrape Odds         │  │  ← browserService.goto()
│  │   ↓                            │  │     Future: scrapers/provider.js
│  │ Validate Odds                  │  │  ← validators.isValidOdds()
│  │   ↓                            │  │
│  │ Calculate Arbitrage            │  │  ← oddsService.calculateArbitrage()
│  │   ↓                            │  │
│  │ Log Results                    │  │  ← logger.info()
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Cleanup Inactive        │  ← sessionManager.cleanupInactiveSessions()
│  Sessions                │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Wait (POLL_INTERVAL)    │  ← setTimeout()
└──────┬───────────────────┘
       │
       └─────► Loop back to Main Loop Start
```

## Module Dependencies

```
index.js
  ├── config/constants.js
  ├── utils/logger.js
  ├── services/proxyService.js
  │   ├── utils/logger.js
  │   └── utils/validators.js
  ├── services/oddsService.js
  │   ├── utils/logger.js
  │   ├── utils/validators.js
  │   ├── utils/formatters.js
  │   └── config/constants.js
  ├── services/browserService.js
  │   ├── utils/logger.js
  │   └── config/constants.js
  └── sessions/sessionManager.js
      ├── utils/logger.js
      ├── utils/validators.js
      ├── services/browserService.js
      └── config/constants.js
```

## Key Design Patterns

### 1. Service Pattern
- Each service (browser, proxy, odds) is a stateless module
- Services export functions that operate on data
- Services handle their own domain logic

### 2. Manager Pattern
- SessionManager maintains state (sessions object)
- Provides CRUD operations for sessions
- Handles lifecycle management

### 3. Utility Pattern
- Pure functions for logging, validation, formatting
- No side effects (except logging)
- Reusable across all modules

### 4. Configuration Pattern
- Centralized constants
- Environment-based configuration
- Easy to modify without code changes

### 5. Separation of Concerns
```
index.js        → Orchestration (WHAT to do, WHEN)
services/       → Business Logic (HOW to do it)
utils/          → Common Operations (HELPERS)
config/         → Configuration (SETTINGS)
sessions/       → State Management (SESSION LIFECYCLE)
scrapers/       → Provider-Specific (FUTURE: SCRAPING LOGIC)
```

## Error Handling Flow

```
┌─────────────────────┐
│  Operation Start    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Validate Input     │  ← validators.*
└──────┬──────────────┘
       │ valid
       ▼
┌─────────────────────┐
│  Execute Operation  │
└──────┬──────────────┘
       │
       ├─── Success ───► Log Success ───► Return Result
       │                  (logger.info)
       │
       └─── Error ────► Log Error ─────► Handle Error
                         (logger.error)   (retry, failover, etc)
```

## File Size Summary

```
config/constants.js       : ~76 lines  (1.6 KB)
utils/logger.js          : ~107 lines (2.5 KB)
utils/validators.js      : ~144 lines (3.7 KB)
utils/formatters.js      : ~193 lines (5.5 KB)
services/browserService.js: ~327 lines (8.6 KB)
services/proxyService.js  : ~265 lines (6.4 KB)
services/oddsService.js   : ~330 lines (8.7 KB)
sessions/sessionManager.js: ~322 lines (9.6 KB)
index.js                 : ~283 lines (6.9 KB)
─────────────────────────────────────────────
TOTAL                    : ~2,047 lines (~53 KB)
```

## Benefits Visualization

```
BEFORE (Monolithic)           AFTER (Modular)
─────────────────────         ──────────────────────
┌─────────────────┐           ┌────────┬──────┬────┐
│                 │           │ Config │ Utils│Svcs│
│                 │           ├────────┼──────┼────┤
│   All Logic     │     →     │ Logger │ Valid│Odds│
│   in One File   │           ├────────┼──────┼────┤
│   (Monolith)    │           │Sessions│Proxy │Brws│
│                 │           └────────┴──────┴────┘
│                 │           
└─────────────────┘           Easy to:
                              - Test
Hard to:                      - Maintain
- Navigate                    - Extend
- Test                        - Debug
- Maintain                    - Understand
- Extend
```
