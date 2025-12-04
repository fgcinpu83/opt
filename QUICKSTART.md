# Quick Start Guide

Get the Arbitrage Bot System running in under 5 minutes!

## Prerequisites

- Linux machine (Ubuntu 22.04 recommended) or macOS
- Docker and Docker Compose installed
- 4GB+ RAM available
- Internet connection

## Installation Steps

### 1. Quick Setup (Automated)

```bash
# Clone the repository
git clone <repository-url>
cd arb

# Run automated initialization
./init-project.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Generate secure secrets
- ✅ Create `.env` configuration
- ✅ Build Docker images
- ✅ Start all services
- ✅ Verify health

### 2. Manual Setup (If Preferred)

```bash
# Copy environment template
cp .env.example .env

# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output and update JWT_SECRET and SESSION_SECRET in .env

# Update passwords in .env
nano .env

# Start services
docker compose up -d --build

# Check status
docker compose ps
```

## Verify Installation

### Check Engine Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-04T...",
  "uptime": 123.45,
  "environment": "development",
  "paperTradingMode": true
}
```

### Check Detailed Health

```bash
curl http://localhost:3000/health/detailed
```

### View API Documentation

```bash
curl http://localhost:3000/api/docs | jq
```

Or visit in browser: http://localhost:3000/api/docs

## Access Web Interfaces

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| **Prometheus** | http://localhost:9090 | None |
| **Grafana** | http://localhost:3030 | admin / (from .env) |
| **PgAdmin** | http://localhost:5050 | (from .env) |

## Basic Operations

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f engine
docker compose logs -f postgres
docker compose logs -f redis
```

### Test API Endpoints

```bash
# Submit a test job
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "payload": {"message": "Hello World"},
    "idempotency_key": "test-'$(date +%s)'"
  }'

# List jobs
curl http://localhost:3000/api/v1/jobs | jq

# Register a test worker
curl -X POST http://localhost:3000/api/v1/workers/register \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "test-worker-001",
    "capabilities": ["test", "place_bet"]
  }'

# List workers
curl http://localhost:3000/api/v1/workers | jq
```

### Database Access

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot

# Inside psql:
\dt                    # List tables
SELECT * FROM jobs;    # View jobs
SELECT * FROM workers; # View workers
\q                     # Quit
```

### Redis Access

```bash
# Connect to Redis
docker compose exec redis redis-cli -a $(grep REDIS_PASSWORD .env | cut -d '=' -f2)

# Inside redis-cli:
PING               # Test connection
KEYS *             # List all keys
GET some_key       # Get value
exit               # Quit
```

## Common Issues

### Port Already in Use

If port 3000, 5432, or 6379 is already in use:

```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :5432

# Either stop the conflicting service or change ports in docker-compose.yml
```

### Permission Denied

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

### Services Not Starting

```bash
# Check logs
docker compose logs

# Restart services
docker compose restart

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

### Health Check Fails

```bash
# Wait a bit longer (services need time to start)
sleep 30
curl http://localhost:3000/health

# Check engine logs
docker compose logs engine

# Check database connection
docker compose exec postgres pg_isready
```

## Next Steps

1. **Read Full Documentation**: See [README.md](README.md) for comprehensive guide
2. **Configure for Production**: Review security settings in `.env`
3. **Set Up Monitoring**: Access Grafana and create dashboards
4. **Develop Workers**: Implement Python workers with Playwright
5. **Test Thoroughly**: Run integration tests before production

## Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove all data (⚠️ DATA LOSS)
docker compose down -v
```

## Update/Rebuild

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build

# Verify health
curl http://localhost:3000/health
```

## Need Help?

- Check logs: `docker compose logs -f`
- Review health endpoints
- Read [README.md](README.md)
- Check [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Ready to develop? Start with the Engine API at http://localhost:3000/api/docs**
