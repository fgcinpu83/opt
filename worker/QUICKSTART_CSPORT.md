# Quick Start Guide - C-Sport Scraper

## Installation

1. **Install Node.js Dependencies**:
   ```bash
   cd /data/workspace/arb/worker
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   nano .env  # or use your preferred editor
   ```
   
   Update these values:
   ```env
   REDIS_URL=redis://:redis_dev_password_2024@redis:6379
   QQ188_USERNAME=your_actual_username
   QQ188_PASSWORD=your_actual_password
   ```

3. **Ensure Redis is Running**:
   ```bash
   # If using Docker Compose
   cd /data/workspace/arb
   docker-compose up -d redis
   
   # Or check if Redis is already running
   redis-cli ping
   # Should return: PONG
   ```

## Testing

### Test C-Sport Scraper Only

```bash
cd /data/workspace/arb/worker
node test-csport.js
```

Expected output:
```
============================================================
C-Sport Scraper Test
============================================================
[INFO] Connecting to Redis...
[INFO] ✓ Redis connected
[INFO] Using credentials: your_username
[INFO] Testing C-Sport scraper...
[INFO] Fetching odds from C-Sport...
[INFO] ✓ Test Successful!
[INFO] Provider: csport
[INFO] Sport: soccer
[INFO] Matches: 45
============================================================
```

### Test Full Worker

```bash
cd /data/workspace/arb/worker
node index.js
```

This will:
1. Connect to Redis
2. Load providers (C-Sport)
3. Start scanning loop (every 5 seconds)
4. Fetch odds continuously

## Verification

### Check Redis Sessions

```bash
# Connect to Redis CLI
redis-cli -h localhost -p 6379 -a redis_dev_password_2024

# List all session keys
KEYS session:*

# Get a specific session
GET session:qq188:your_username

# Check TTL
TTL session:qq188:your_username
```

### Monitor Logs

```bash
# Real-time log monitoring
tail -f logs/worker.log

# Or just run the worker in foreground
node index.js
```

## Troubleshooting

### 1. "npm: command not found"

Install Node.js:
```bash
# Using apt
sudo apt update
sudo apt install nodejs npm

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 16
nvm use 16
```

### 2. "Redis connection failed"

Check Redis:
```bash
# Test Redis connection
redis-cli -h localhost -p 6379 -a redis_dev_password_2024 ping

# Start Redis if not running (Docker)
docker-compose up -d redis

# Check Redis logs
docker-compose logs redis
```

### 3. "Login failed for QQ188"

- Verify credentials are correct
- Check if website structure changed
- Enable screenshots for debugging:
  ```env
  HEADLESS=false
  ENABLE_SCREENSHOTS=true
  ```

### 4. "No matches returned"

This could mean:
- Session is invalid (will auto-refresh)
- API response format changed (check logs)
- No active matches available (normal)

## Next Steps

1. **Add More Providers**: Copy `scrapers/csport.js` and modify for new provider
2. **Integrate with Engine**: Uncomment the API call in `index.js` to send odds to engine
3. **Deploy**: Use Docker Compose to run worker in production

## File Structure

```
worker/
├── config/
│   ├── constants.js       # Worker configuration
│   └── redis.js          # Redis connection (NEW)
├── scrapers/
│   └── csport.js         # C-Sport scraper (NEW)
├── sessions/
│   └── sessionManager.js # Session management (UPDATED)
├── services/
│   ├── browserService.js
│   ├── oddsService.js
│   └── proxyService.js
├── utils/
│   ├── logger.js
│   └── validators.js
├── index.js              # Main entry point (UPDATED)
├── test-csport.js        # Test script (NEW)
├── package.json          # Dependencies (UPDATED)
└── .env                  # Environment variables
```

## Support

For issues or questions:
1. Check the implementation docs: `REDIS_CSPORT_IMPLEMENTATION.md`
2. Review logs: `logs/worker.log`
3. Test individual components with test scripts

---

**Ready to run!** Start with `npm install` then `node test-csport.js`
