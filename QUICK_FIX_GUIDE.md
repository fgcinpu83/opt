# Quick Fix Guide - Redis Authentication

## ✅ What Was Fixed

**Problem:** `NOAUTH Authentication required` error when Engine connects to Redis

**Root Cause:** ioredis wasn't extracting password from `REDIS_URL` format

**Solution:** Enhanced password extraction in `engine/src/config/redis.js`

---

## 🚀 Quick Deployment Steps

### 1. Verify Environment Variables

```bash
cd /data/workspace/arb

# Check if .env exists
ls -la .env

# Verify Redis password is set
grep REDIS .env
```

Expected output:
```
REDIS_PASSWORD=redis_dev_password_2024
REDIS_URL=redis://:redis_dev_password_2024@redis:6379
```

### 2. Rebuild Engine Service

```bash
# Stop services
docker-compose down

# Rebuild engine image
docker-compose build engine

# Start all services
docker-compose up -d

# Check engine logs for Redis connection
docker-compose logs -f engine | grep -i redis
```

**Success Indicators:**
```
✓ Extracted Redis password from REDIS_URL
✓ Connecting to Redis { host: 'redis', port: 6379, hasPassword: true }
✓ Redis connected successfully
✓ Redis PING successful
```

### 3. Verify Health Check

```bash
# Test health endpoint
curl http://localhost:3000/api/v1/system/health | jq '.health.services.redis'
```

**Expected Response:**
```json
{
  "status": "healthy",
  "message": "Redis connected",
  "latency_ms": 2
}
```

---

## 🧪 Testing (Optional)

### Run Test Script

```bash
cd /data/workspace/arb/engine

# Install dependencies if not already done
npm install

# Run Redis connection test
node test-redis-connection.js
```

**Expected:** All 4 tests pass ✓

---

## 📁 Files Changed

1. ✅ `engine/src/config/redis.js` - **Modified** (password extraction logic)
2. ✅ `engine/test-redis-connection.js` - **Created** (test script)
3. ✅ `REDIS_AUTH_FIX.md` - **Created** (full documentation)
4. ✅ `QUICK_FIX_GUIDE.md` - **Created** (this file)

---

## 🔍 Troubleshooting

### Issue: Still getting NOAUTH error

**Check:**
```bash
# 1. Verify Redis service is running
docker-compose ps redis

# 2. Check Redis password in docker-compose.yml
grep -A 5 "redis:" docker-compose.yml | grep password

# 3. Test Redis directly
docker-compose exec redis redis-cli -a redis_dev_password_2024 ping
```

### Issue: Connection timeout

**Check:**
```bash
# 1. Check if Redis is accepting connections
docker-compose exec redis redis-cli -a redis_dev_password_2024 INFO server

# 2. Check engine can reach Redis
docker-compose exec engine ping -c 3 redis

# 3. Restart services
docker-compose restart redis engine
```

### Issue: Wrong password error

**Fix:**
```bash
# 1. Update .env file
nano .env
# Set: REDIS_PASSWORD=redis_dev_password_2024

# 2. Update docker-compose.yml if needed
nano docker-compose.yml
# Ensure Redis command includes: --requirepass ${REDIS_PASSWORD}

# 3. Rebuild and restart
docker-compose down
docker-compose up -d
```

---

## 📊 Verification Checklist

- [ ] `.env` file has `REDIS_PASSWORD` set
- [ ] `REDIS_URL` format is correct: `redis://:PASSWORD@HOST:PORT`
- [ ] Engine service rebuilt: `docker-compose build engine`
- [ ] Services running: `docker-compose ps` shows all "Up"
- [ ] Engine logs show "Redis connected successfully"
- [ ] Health endpoint returns Redis status "healthy"
- [ ] Test script passes (optional)

---

## 🎯 Success Criteria

✅ Engine starts without Redis authentication errors  
✅ Health endpoint reports Redis as "healthy"  
✅ Engine logs show successful Redis connection  
✅ All API endpoints using Redis work correctly  

---

## 📝 Next Steps

After successful deployment:

1. ✅ Test API endpoints that use Redis (sessions, scanner, etc.)
2. ✅ Monitor logs for any Redis-related errors
3. ✅ Run full system integration tests
4. ✅ Update documentation if needed

---

## 🔐 Security Reminder

- Never commit `.env` file
- Use strong passwords (20+ characters)
- Rotate Redis password every 90 days
- Restrict Redis port to internal network only

---

**Status:** ✅ Ready for deployment  
**Estimated Time:** 5 minutes  
**Risk Level:** Low (backwards compatible)

---

Last Updated: 2024-12-07
