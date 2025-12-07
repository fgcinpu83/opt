# Redis Authentication Fix - Arbitrage Bot Engine

## Problem Summary

The Arbitrage Bot Engine was experiencing **NOAUTH Authentication required** errors when connecting to Redis, despite the password being correctly set in the environment variables.

### Root Cause

The `ioredis` library was not properly extracting the password from the `REDIS_URL` environment variable when it was in the format:
```
REDIS_URL=redis://:redis_dev_password_2024@redis:6379
```

While the `REDIS_PASSWORD` environment variable was set separately, the connection configuration was using the raw URL which wasn't being parsed correctly.

## Solution Implemented

### 1. Enhanced Password Extraction (`engine/src/config/redis.js`)

Modified the `connectRedis()` function to:
- Extract password from `REDIS_URL` using regex pattern matching
- Fall back to `REDIS_PASSWORD` environment variable if extraction fails
- Explicitly pass the password to the ioredis configuration

**Key Code Changes:**

```javascript
// Extract password from REDIS_URL or use individual env variables
const redisUrl = process.env.REDIS_URL;
let redisPassword = process.env.REDIS_PASSWORD;

// If REDIS_URL is in format redis://:PASSWORD@HOST:PORT, extract password
if (redisUrl) {
  const passwordMatch = redisUrl.match(/:\/\/:(.*?)@/);
  if (passwordMatch && passwordMatch[1]) {
    redisPassword = passwordMatch[1];
    logger.info('Extracted Redis password from REDIS_URL');
  }
}

const redisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: redisPassword,  // Explicitly set password
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  enableOfflineQueue: true,
  lazyConnect: false
};
```

### 2. Added Helper Functions

Enhanced the Redis module with convenience methods for health checks:

```javascript
module.exports = {
  connectRedis,
  closeRedis,
  getRedisClient,
  getRedisPub,
  getRedisSub,
  getRedis,
  // Alias for backward compatibility
  ping: async () => {
    const client = getRedisClient();
    return await client.ping();
  },
  info: async (section) => {
    const client = getRedisClient();
    return await client.info(section);
  }
};
```

### 3. Added Connection Logging

Improved visibility into connection process:
- Logs when password is extracted from REDIS_URL
- Logs connection configuration (without exposing password)
- Shows whether password is set via boolean flag

### 4. Enhanced Configuration Options

Added recommended ioredis options:
- `enableReadyCheck: false` - Reduces connection overhead
- `enableOfflineQueue: true` - Queues commands when disconnected
- `lazyConnect: false` - Connects immediately on instantiation

## Files Modified

1. **`engine/src/config/redis.js`**
   - Enhanced password extraction logic
   - Added helper functions for health checks
   - Improved logging
   - Added recommended ioredis options

## Testing

### Test Script Created

A comprehensive test script (`engine/test-redis-connection.js`) was created to verify:

1. Environment variable reading
2. Password extraction from REDIS_URL
3. Connection establishment
4. PING command
5. SET/GET operations
6. INFO command
7. DEL command

### How to Test

```bash
# From engine directory
cd /data/workspace/arb/engine

# Make sure .env file exists with correct Redis credentials
cat ../.env | grep REDIS

# Run test script
node test-redis-connection.js
```

**Expected Output:**
```
============================================================
Redis Connection Test
============================================================

Environment Variables:
  REDIS_URL: redis://:****@redis:6379
  REDIS_PASSWORD: ****
  REDIS_HOST: redis (default)
  REDIS_PORT: 6379 (default)

✓ Password extracted from REDIS_URL

Connection Configuration:
  Host: redis
  Port: 6379
  Password: ****2024

Testing connection...
✓ Redis connected successfully
✓ Redis client ready
  Test 1: PING command...
    ✓ PING result: PONG
  Test 2: SET/GET command...
    ✓ GET result: success
  Test 3: INFO command...
    ✓ Redis version: 7.x.x
  Test 4: DEL command...
    ✓ Test key deleted

============================================================
✓ ALL TESTS PASSED
============================================================
```

## Environment Variables Required

Ensure your `.env` file contains:

```bash
# Redis Configuration
REDIS_PASSWORD=redis_dev_password_2024
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Optional (defaults used if not set)
REDIS_HOST=redis
REDIS_PORT=6379
```

## Deployment Steps

### 1. Rebuild Docker Image

```bash
cd /data/workspace/arb

# Stop current services
docker-compose down

# Rebuild engine service
docker-compose build engine

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f engine
```

### 2. Verify Connection

```bash
# Check engine logs for successful Redis connection
docker-compose logs engine | grep -i redis

# Expected output:
# Extracted Redis password from REDIS_URL
# Connecting to Redis { host: 'redis', port: 6379, hasPassword: true }
# Redis connected successfully
# Redis PING successful
```

### 3. Test Health Endpoint

```bash
# Test system health endpoint
curl http://localhost:3000/api/v1/system/health | jq '.health.services.redis'

# Expected output:
# {
#   "status": "healthy",
#   "message": "Redis connected",
#   "latency_ms": 2
# }
```

## Verification Checklist

- [x] Redis password extraction from REDIS_URL works
- [x] Fallback to REDIS_PASSWORD environment variable works
- [x] Connection established successfully
- [x] PING command succeeds
- [x] Health check endpoint reports Redis as healthy
- [x] Pub/Sub clients use same configuration
- [x] Error handling logs helpful messages
- [x] Test script validates all operations

## Common Issues & Solutions

### Issue: "NOAUTH Authentication required"
**Solution:** Ensure password is set in either REDIS_URL or REDIS_PASSWORD environment variable.

### Issue: "Connection timeout"
**Solution:** Check if Redis service is running: `docker-compose ps redis`

### Issue: "WRONGPASS invalid username-password pair"
**Solution:** Verify password in .env matches Redis configuration in docker-compose.yml

### Issue: Password not being extracted
**Solution:** Check REDIS_URL format matches: `redis://:PASSWORD@HOST:PORT`

## Performance Considerations

The fix includes several performance optimizations:

1. **Lazy Connect**: Set to `false` for immediate connection on startup
2. **Retry Strategy**: Exponential backoff (50ms × attempts, max 2000ms)
3. **Max Retries**: Limited to 3 per request to avoid blocking
4. **Offline Queue**: Enabled to queue commands during disconnection
5. **Ready Check**: Disabled to reduce connection overhead

## Security Notes

⚠️ **Important Security Considerations:**

1. Never commit `.env` file to version control
2. Use strong passwords (20+ characters)
3. Rotate Redis password every 90 days
4. Restrict Redis port (6379) to internal network only
5. Enable Redis ACL in production for fine-grained access control

## Rollback Plan

If issues occur after deployment:

```bash
# Revert to previous version
git revert <commit-hash>

# Or restore from backup
docker-compose down
# Restore previous redis.js file
docker-compose up -d
```

## Additional Resources

- [ioredis Documentation](https://github.com/luin/ioredis)
- [Redis Authentication](https://redis.io/docs/management/security/acl/)
- [Docker Compose Redis Setup](https://hub.docker.com/_/redis)

## Commit Information

**Branch:** main  
**Commit Message:** Fix: Redis authentication in Engine config  
**Files Changed:**
- `engine/src/config/redis.js` (modified)
- `engine/test-redis-connection.js` (created)
- `REDIS_AUTH_FIX.md` (created)

**Testing:** Verified with test script and Docker deployment

---

**Status:** ✅ **FIXED AND TESTED**

Last Updated: 2024-12-07  
Author: Development Team
