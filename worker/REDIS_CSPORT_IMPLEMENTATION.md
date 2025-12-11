# Redis Session Manager & C-Sport Scraper Implementation

## Overview

This implementation adds:
1. **Redis Session Manager** - For sharing sessions between multiple workers
2. **C-Sport Scraper** - First provider implementation using QQ188 API
3. **Modular Provider System** - Easy to add more providers

## Files Created/Modified

### 1. Created: `worker/config/redis.js`
- Redis connection management using `ioredis`
- Handles connection, retry logic, and graceful shutdown
- Exports singleton Redis client

### 2. Updated: `worker/sessions/sessionManager.js`
- **Redis Integration**:
  - Sessions stored in Redis with TTL (10 minutes)
  - Key format: `session:provider:username`
  - Automatic session validation and refresh
  
- **Locking Mechanism**:
  - Prevents concurrent login from multiple workers
  - Lock key format: `lock:provider:username`
  - Lock TTL: 30 seconds
  
- **Session Structure**:
  ```javascript
  {
    provider: "qq188",
    username: "user123",
    cookies: [...], // Extracted after login
    createdAt: "2025-12-11T...",
    lastActivity: "2025-12-11T..."
  }
  ```

### 3. Created: `worker/scrapers/csport.js`
- **C-Sport API Integration**:
  - URL: `https://mylv.5336267.com/Member/BetsView/BetLight/DataOdds.ashx`
  - Method: POST with form-data
  - Authentication: Cookie-based (from session)
  
- **Features**:
  - Automatic session management (checks Redis first)
  - Browser login when needed (Playwright)
  - Cookie-based API calls (no browser needed after login)
  - Standardized output format
  
- **Output Format**:
  ```javascript
  {
    provider: "csport",
    sport: "soccer",
    timestamp: "2025-12-11T...",
    matches: [
      {
        match_id: "...",
        home_team: "Team A",
        away_team: "Team B",
        league: "Premier League",
        start_time: "2025-12-11T...",
        odds: {
          home: 0.95,
          draw: 2.10,
          away: 0.90
        }
      }
    ]
  }
  ```

### 4. Updated: `worker/index.js`
- Integrated C-Sport scraper
- Redis initialization on startup
- Provider-based scanning loop
- Graceful shutdown (closes Redis connection)

### 5. Updated: `worker/package.json`
- Added dependencies:
  - `ioredis`: ^5.3.2
  - `axios`: ^1.6.0
  - `form-data`: ^4.0.0

### 6. Updated: `worker/.env.example`
- Added QQ188 credentials placeholders

## How It Works

### Session Flow

1. **Worker Starts**:
   - Connects to Redis
   - Loads provider configurations
   - Starts scanning loop

2. **First Request** (No Session):
   ```
   Worker → Check Redis → No session found
        ↓
   Acquire lock → Launch browser → Login → Extract cookies
        ↓
   Store in Redis → Use cookies for API call
   ```

3. **Subsequent Requests** (Session Exists):
   ```
   Worker → Check Redis → Session found → Validate
        ↓
   Use cookies directly → Make API call (no browser needed)
   ```

4. **Session Expired**:
   ```
   Worker → Redis session expired/invalid
        ↓
   Acquire lock → Re-login → Update Redis
   ```

### Multi-Worker Support

- **Lock Mechanism**: Prevents multiple workers from logging in simultaneously
- **Shared Sessions**: All workers can use the same session from Redis
- **Automatic Refresh**: If session expires, first worker to detect it will refresh

## Configuration

### Environment Variables

```bash
# Redis
REDIS_URL=redis://:password@redis:6379

# C-Sport (QQ188)
QQ188_USERNAME=your_username
QQ188_PASSWORD=your_password

# Worker Settings
WORKER_POLL_INTERVAL=5000  # 5 seconds between scans
```

### Adding New Providers

1. Create scraper in `worker/scrapers/newprovider.js`:
   ```javascript
   async function fetchOdds(credentials) {
     // 1. Get/create session
     // 2. Fetch odds
     // 3. Return standardized format
   }
   
   module.exports = { fetchOdds };
   ```

2. Add to `worker/index.js`:
   ```javascript
   const newProviderScraper = require('./scrapers/newprovider');
   
   const PROVIDERS = [
     {
       id: 'newprovider',
       name: 'New Provider',
       credentials: {
         username: process.env.NEWPROVIDER_USERNAME,
         password: process.env.NEWPROVIDER_PASSWORD,
       },
       scraper: newProviderScraper,
     },
   ];
   ```

## API Payload Details

### C-Sport Request
```
POST https://mylv.5336267.com/Member/BetsView/BetLight/DataOdds.ashx
Content-Type: application/x-www-form-urlencoded

fc=5
m_accType=MY MR
SystemLanguage=en-US
TimeFilter=0
m_gameType=S_
m_SortByTime=0
m_LeagueList=
SingleDouble=double
clientTime=16995859
c=A
fav=
exlist=0
keywords=
m_sp=0
```

## Testing

### Manual Test
```javascript
// test-csport.js
const csportScraper = require('./scrapers/csport');

const credentials = {
  username: 'test_user',
  password: 'test_pass'
};

csportScraper.testScraper(credentials)
  .then(result => {
    console.log('Test result:', result);
  });
```

## Redis Keys

- **Session**: `session:qq188:username` (TTL: 600s)
- **Lock**: `lock:qq188:username` (TTL: 30s)

## Error Handling

1. **Login Failure**: Returns null, will retry on next scan
2. **API Error (401/403)**: Clears session, forces re-login next time
3. **Network Error**: Logs error, continues with next provider
4. **Redis Error**: Logs error, falls back to in-memory session (if available)

## Performance

- **No Browser After Login**: Uses cookies for API calls
- **Session Sharing**: Multiple workers share same session
- **TTL Management**: Auto-cleanup of expired sessions
- **Locking**: Prevents wasted resources on concurrent logins

## Next Steps

1. **Install Dependencies**:
   ```bash
   cd /data/workspace/arb/worker
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Test Connection**:
   ```bash
   node index.js
   ```

4. **Add More Providers**: Follow the pattern in `scrapers/csport.js`

## Monitoring

The worker logs all important events:
- Redis connection status
- Session creation/retrieval
- Lock acquisition/release
- API calls and responses
- Error conditions

Check logs for debugging:
```bash
tail -f logs/worker.log
```

## Security Notes

1. **Credentials**: Store in environment variables, never commit to git
2. **Redis**: Use password protection in production
3. **Session TTL**: Short TTL (10 min) reduces risk of session hijacking
4. **Locks**: Prevent race conditions in multi-worker setup

## Troubleshooting

### "Redis connection failed"
- Check REDIS_URL in .env
- Ensure Redis server is running
- Verify network connectivity

### "Login failed"
- Verify credentials
- Check if website structure changed
- Review browser screenshots (if enabled)

### "No odds data received"
- Check API response format
- Verify session is valid
- Review parser logic in csport.js

---

**Implementation Date**: December 11, 2025
**Status**: ✅ Complete - Ready for Testing
