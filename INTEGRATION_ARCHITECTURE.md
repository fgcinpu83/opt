# ArbBot Pro Dashboard - Integration Architecture

## System Architecture Diagram

```mermaid
graph TB
    subgraph Browser["🌐 Browser (http://217.216.35.6:8080)"]
        UI[ArbBot Pro Dashboard<br/>React + TypeScript]
    end
    
    subgraph Docker["🐳 Docker Network (arb-network)"]
        subgraph UIContainer["arb-ui Container"]
            NGINX[Nginx Alpine<br/>Port 80]
            STATIC[/usr/share/nginx/html/<br/>Static Files]
        end
        
        subgraph EngineContainer["arb-engine Container"]
            API[Node.js Backend<br/>Port 3000]
            WS[WebSocket<br/>Port 3001]
        end
        
        subgraph RedisContainer["arb-redis Container"]
            REDIS[(Redis Cache<br/>Port 6379)]
        end
        
        subgraph PostgresContainer["arb-postgres Container"]
            DB[(PostgreSQL DB<br/>Port 5432)]
        end
    end
    
    UI -->|HTTP GET /| NGINX
    NGINX --> STATIC
    UI -->|API Calls<br/>http://engine:3000| API
    UI -.->|Future WebSocket| WS
    API --> REDIS
    API --> DB
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant Browser
    participant UI Container
    participant Engine API
    participant Database
    participant Redis
    
    Browser->>UI Container: GET /
    UI Container-->>Browser: index.html + assets
    
    loop Every 5 seconds
        Browser->>Engine API: GET /api/system-health
        Engine API->>Redis: Check worker status
        Redis-->>Engine API: Worker data
        Engine API-->>Browser: Health status
    end
    
    loop Every 5 seconds
        Browser->>Engine API: GET /api/login-status
        Engine API->>Database: Query account status
        Database-->>Engine API: Account data
        Engine API-->>Browser: Login status + balances
    end
    
    loop Every 10 seconds
        Browser->>Engine API: GET /api/bets
        Engine API->>Database: Query bet history
        Database-->>Engine API: Bet records
        Engine API-->>Browser: Bet history
    end
    
    Browser->>Engine API: POST /api/settings
    Engine API->>Database: Save settings
    Database-->>Engine API: Confirmation
    Engine API-->>Browser: Success
```

## Component Architecture

```mermaid
graph LR
    subgraph Frontend["Frontend (minimal-ui)"]
        AppTsx[App.tsx<br/>Main Component]
        
        subgraph Components
            Header[Header<br/>Status LEDs]
            AccPanel1[Account Panel A]
            AccPanel2[Account Panel B]
            Config[Configuration]
            Monitor[Monitoring<br/>Scanner + History]
            Logs[System Logs]
        end
        
        subgraph API Layer
            Client[API Client<br/>client.ts]
        end
        
        subgraph Utils
            Mappers[Data Mappers<br/>mappers.ts]
        end
        
        AppTsx --> Header
        AppTsx --> AccPanel1
        AppTsx --> AccPanel2
        AppTsx --> Config
        AppTsx --> Monitor
        AppTsx --> Logs
        
        AppTsx --> Client
        Client --> Mappers
    end
    
    Client -->|HTTP/REST| Backend[Backend API]
```

## API Integration Map

```mermaid
graph TD
    subgraph UI State
        SystemHealth[System Health State]
        Account1[Account 1 State]
        Account2[Account 2 State]
        ConfigState[Config State]
        ScannerData[Scanner Data]
        HistoryData[History Data]
        LogsData[Logs]
    end
    
    subgraph Backend Endpoints
        HealthEP[GET /api/system-health]
        LoginStatusEP[GET /api/login-status]
        SettingsGetEP[GET /api/settings]
        SettingsPostEP[POST /api/settings]
        BetsEP[GET /api/bets]
        LoginEP[POST /api/login]
        ExecuteEP[POST /api/execute]
    end
    
    HealthEP -->|5s polling| SystemHealth
    LoginStatusEP -->|5s polling| Account1
    LoginStatusEP -->|5s polling| Account2
    SettingsGetEP -->|On mount| ConfigState
    ConfigState -->|On change| SettingsPostEP
    BetsEP -->|10s polling| HistoryData
    Account1 -->|On toggle| LoginEP
    Account2 -->|On toggle| LoginEP
    ScannerData -.->|Future| ExecuteEP
```

## File Structure

```
arb/
├── minimal-ui/                      # Frontend application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts           # ⭐ NEW: API client for backend
│   │   ├── components/
│   │   │   ├── AccountPanel.tsx    # ✅ Existing (reused)
│   │   │   ├── Configuration.tsx   # ✅ Existing (reused)
│   │   │   ├── Header.tsx          # ✅ Existing (reused)
│   │   │   ├── Monitoring.tsx      # ✅ Existing (reused)
│   │   │   ├── Logs.tsx            # ✅ Existing (reused)
│   │   │   └── StatusLed.tsx       # ✅ Existing (reused)
│   │   ├── utils/
│   │   │   └── mappers.ts          # ⭐ NEW: Data mapping utilities
│   │   ├── App.tsx                 # ⭐ NEW: Main app (replaced App.jsx)
│   │   ├── App.jsx                 # ⚠️  OLD: Backed up
│   │   ├── main.jsx                # 🔧 Modified: Import App.tsx
│   │   ├── index.css               # 🔧 Modified: Added scrollbar styles
│   │   └── types.ts                # ✅ Existing (unchanged)
│   ├── .env.production             # ⭐ NEW: Production env vars
│   ├── Dockerfile                  # 🔧 Modified: Copy .env.production
│   ├── nginx.conf                  # ✅ Existing (unchanged)
│   └── package.json                # ✅ Existing (unchanged)
│
├── engine/                          # Backend (unchanged)
│   ├── src/
│   │   ├── routes/
│   │   │   └── *.routes.js         # Should implement API endpoints
│   │   └── services/
│   │       └── *.service.js        # Backend logic
│   └── Dockerfile
│
├── docker-compose.yml              # ✅ Existing (unchanged)
├── deploy-ui-update.sh             # ⭐ NEW: Deployment script
├── FRONTEND_INTEGRATION_COMPLETE.md # ⭐ NEW: Full documentation
└── DEPLOYMENT_QUICKREF.txt         # ⭐ NEW: Quick reference
```

## Environment Configuration

### Development
```env
VITE_API_URL=http://localhost:3000
VITE_API_WS_URL=ws://localhost:3000
```

**Use Case:** Local development, running frontend with `npm run dev`

### Production (Docker)
```env
VITE_API_URL=http://engine:3000
VITE_API_WS_URL=ws://engine:3000
```

**Use Case:** Docker deployment, UI container communicates with engine container via Docker network

## Network Topology

```
External Access:
    Browser → http://217.216.35.6:8080 → arb-ui (Port 8080:80)
    Browser → http://217.216.35.6:3000 → arb-engine (Port 3000:3000)

Docker Internal Network (arb-network):
    arb-ui → http://engine:3000 → arb-engine
    arb-engine → redis://redis:6379 → arb-redis
    arb-engine → postgres://postgres:5432 → arb-postgres
```

## Technology Stack Mapping

### Frontend Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18.2.0 | UI rendering |
| Language | TypeScript 5.3.3 | Type safety |
| Build Tool | Vite 5.0.8 | Fast builds |
| Styling | Tailwind CSS 3.4.0 | Utility-first CSS |
| Icons | Lucide React 0.556.0 | Icon library |
| Charts | Recharts 3.5.1 | Data visualization |
| Server | Nginx Alpine | Static file serving |

### Backend Stack (Existing)
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js | Backend execution |
| Database | PostgreSQL 15 | Persistent storage |
| Cache | Redis 7 | Session & cache |
| API Style | REST | HTTP endpoints |
| Real-time | WebSocket | Live updates |

## API Polling Strategy

| Data Type | Endpoint | Interval | Reason |
|-----------|----------|----------|--------|
| System Health | GET /api/system-health | 5s | Real-time status monitoring |
| Login Status | GET /api/login-status | 5s | Account balance & ping updates |
| Bet History | GET /api/bets | 10s | Lower priority, less frequent |
| Settings | GET /api/settings | On mount only | Static data |

## State Management Flow

```
User Action
    ↓
UI Event Handler
    ↓
Update Local State (optimistic)
    ↓
API Call (via client.ts)
    ↓
Backend Processing
    ↓
Response
    ↓
Data Mapping (via mappers.ts)
    ↓
Update State (confirmed)
    ↓
Re-render Components
```

## Error Handling Strategy

```
API Request
    ├─ Success
    │   ├─ Map data (mappers.ts)
    │   ├─ Update state
    │   └─ Add SUCCESS log
    │
    └─ Failure
        ├─ Log error to console
        ├─ Add ERROR log to UI
        ├─ Keep previous state
        └─ Retry on next poll
```

## Security Considerations

1. **API Authentication**: Currently open, should implement JWT tokens
2. **CORS**: Must be configured on backend to allow http://217.216.35.6:8080
3. **Input Validation**: All user inputs should be validated on backend
4. **LocalStorage**: Used for non-sensitive UI preferences only
5. **HTTPS**: Should be implemented in production via nginx reverse proxy

## Performance Optimization

1. **Polling Intervals**: Tuned to balance real-time updates vs server load
2. **Data Caching**: LocalStorage for configuration persistence
3. **Lazy Loading**: Components loaded on demand
4. **Memoization**: React.memo and useCallback for expensive operations
5. **Code Splitting**: Vite handles automatic code splitting

## Deployment Pipeline

```
Developer Machine
    ↓ git push
GitHub Repository (guntjong-max/arb)
    ↓ git pull
Production Server (217.216.35.6)
    ↓ npm install
Node.js Build (Vite)
    ↓ npm run build
Static Files (dist/)
    ↓ Docker build
Docker Image (arb-ui)
    ↓ Docker run
Nginx Container
    ↓ HTTP serve
End Users (Browser)
```

## Monitoring & Observability

### Frontend Monitoring
- Browser console logs
- Network tab for API calls
- React DevTools for component state
- Performance metrics via Lighthouse

### Container Monitoring
```bash
docker logs arb-ui --tail 100 --follow
docker stats arb-ui
docker exec arb-ui cat /var/log/nginx/access.log
docker exec arb-ui cat /var/log/nginx/error.log
```

### API Monitoring
```bash
docker logs arb-engine --tail 100 --follow
docker stats arb-engine
```

## Future Enhancements

1. **WebSocket Integration**: Real-time arbitrage opportunities
2. **Authentication**: JWT-based user authentication
3. **Mobile Responsive**: Optimize for mobile devices
4. **Dark/Light Theme**: User-selectable themes
5. **Internationalization**: Multi-language support
6. **Error Tracking**: Integrate Sentry or similar
7. **Analytics**: User behavior tracking
8. **PWA Support**: Offline capabilities

---

**Document Version:** 1.0  
**Created:** December 9, 2025  
**Status:** ✅ Complete
