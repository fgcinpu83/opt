# Arbitrage Bot - Complete Deployment Guide

## 🎯 System Overview

Full-stack arbitrage betting system with:
- **Backend**: Node.js Engine with Puppeteer workers
- **Frontend**: React Dashboard (Vite + Tailwind)
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Monitoring**: Prometheus + Grafana

## 📋 Prerequisites

- Ubuntu 22.04 LTS (or similar)
- Docker & Docker Compose
- 4GB+ RAM
- 50GB+ storage
- (Optional) Node.js 20+ for local frontend development

## 🚀 Quick Start (Docker)

### 1. Clone & Setup

```bash
# Navigate to project
cd /data/workspace/arb

# Create environment file
cp .env.example .env

# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Use output for JWT_SECRET and SESSION_SECRET

# Edit .env and set all passwords
nano .env
```

### 2. Start All Services

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f engine
```

### 3. Initialize Database

Database will auto-initialize from `/postgres/init-scripts/01-init-schema.sql` on first run.

**Default credentials:**
- Username: `admin`
- Password: `admin123` (⚠️ CHANGE IN PRODUCTION!)

### 4. Access Services

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:5173 | React Dashboard |
| Engine API | http://localhost:3000 | REST API |
| API Docs | http://localhost:3000/api/docs | Endpoint list |
| Prometheus | http://localhost:9090 | Metrics |
| Grafana | http://localhost:3030 | Dashboards |
| PgAdmin | http://localhost:5050 | DB Management |

## 🔧 Manual Setup (Development)

### Backend (Engine)

```bash
cd engine
npm install
npm run dev  # Development mode with hot reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### Database Setup

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U arbitrage_user -d arbitrage_bot

# Run migrations (if needed)
docker-compose exec postgres psql -U arbitrage_user -d arbitrage_bot -f /docker-entrypoint-initdb.d/01-init-schema.sql
```

## 📊 System Architecture

```
┌─────────────┐
│  Frontend   │ (React + Vite)
│  Dashboard  │ Port 5173
└──────┬──────┘
       │ HTTP/WebSocket
┌──────▼──────┐     ┌─────────┐     ┌──────────┐
│   Engine    │────▶│  Redis  │     │PostgreSQL│
│  (Node.js)  │     │ (Queue) │     │   (DB)   │
│  Port 3000  │     │Port 6379│     │Port 5432 │
└──────┬──────┘     └─────────┘     └──────────┘
       │
┌──────▼──────┐
│   Worker    │
│  (Python +  │
│ Playwright) │
└─────────────┘
```

## 🔑 API Endpoints

### Sessions (Sportsbook Accounts)
```bash
# Add account
POST /api/v1/sessions/login
{
  "sportsbook": "Nova88",
  "url": "https://nova88.com",
  "username": "your_username",
  "password": "your_password"
}

# List accounts
GET /api/v1/sessions

# Refresh balance
POST /api/v1/sessions/:id/refresh

# Delete account
DELETE /api/v1/sessions/:id
```

### Configuration
```bash
# Get all config
GET /api/v1/config

# Update tier settings
POST /api/v1/config/tiers
{
  "user_id": 1,
  "tiers": [
    {
      "tier_name": "tier1",
      "tier_label": "Big Leagues",
      "bet_amount": 1000,
      "priority": 3,
      "leagues": ["Premier League", "La Liga"],
      "is_active": true
    }
  ]
}

# Update profit settings
POST /api/v1/config/profit
{
  "user_id": 1,
  "min_profit_percentage": 3.0,
  "max_profit_percentage": 10.0,
  "max_minute_ht": 35,
  "max_minute_ft": 85,
  "match_filter": "all",
  "enabled_markets": ["ft_hdp", "ft_ou", "ht_hdp", "ht_ou"]
}
```

### Scanner (Arbitrage Opportunities)
```bash
# Get opportunities
GET /api/v1/scanner/opportunities?status=detected&limit=50

# Create opportunity (from scanner)
POST /api/v1/scanner/opportunities
{
  "match_name": "Team A vs Team B",
  "league": "Premier League",
  "market_type": "ft_hdp",
  "side_a_sportsbook": "Nova88",
  "side_a_odds": 2.10,
  "side_a_selection": "Team A",
  "side_b_sportsbook": "QQ188",
  "side_b_odds": 2.05,
  "side_b_selection": "Team B"
}

# Get scanner stats
GET /api/v1/scanner/stats

# Live feed (SSE)
GET /api/v1/scanner/live-feed
```

### History
```bash
# Get bet history
GET /api/v1/history/bets?limit=100

# Today's bets
GET /api/v1/history/bets/today

# Pending bets
GET /api/v1/history/bets/pending

# System logs
GET /api/v1/history/logs?log_level=info&limit=100

# Daily summary
GET /api/v1/history/summary?date=2024-12-06

# Profit stats
GET /api/v1/history/profit?period=7d
```

### System Health
```bash
# Health check (for LED indicators)
GET /api/v1/system/health

# System statistics
GET /api/v1/system/stats

# Worker heartbeat
POST /api/v1/system/worker/heartbeat
{
  "worker_id": "worker-001",
  "worker_type": "browser",
  "status": "standby"
}

# Get auto robot status
GET /api/v1/system/auto-status

# Toggle auto robot
POST /api/v1/system/auto-toggle
{
  "enabled": true
}
```

## ⚙️ Core Logic Implementation

### 1. Odds Conversion
```javascript
// Automatic conversion to Decimal (Euro) odds
const decimalOdds = convertToDecimal(1.75, 'indo');  // Indo
const decimalOdds = convertToDecimal(0.85, 'malay'); // Malay
const decimalOdds = convertToDecimal(1.10, 'hk');    // HK
```

### 2. Bet Rounding
```javascript
// Always rounds to nearest 0 or 5
roundBetAmount(153) // → 155
roundBetAmount(152) // → 150
roundBetAmount(157) // → 155
roundBetAmount(158) // → 160
```

### 3. Safety Filters
```javascript
// Anti-trap filter
if (profit > config.max_profit_percentage) {
  reject('Profit too high - possible trap')
}

// Anti-ghost bet filter (live matches)
if (matchMinute > config.max_minute_ft) {
  reject('Match minute too high - ghost bet risk')
}

// Profit range filter
if (profit < config.min_profit_percentage) {
  reject('Profit below minimum')
}
```

### 4. Sequential Execution Flow
```javascript
// Step 1: Determine value bet (higher odds)
const valueBetSide = odds_a > odds_b ? 'side_a' : 'side_b'

// Step 2: Place value bet first
const valueBetResult = await placeBet(valueBet)

// Step 3: Check status
if (valueBetResult.status === 'rejected') {
  // ABORT - Do not place hedge bet
  return { status: 'failed', reason: 'Value bet rejected' }
}

// Step 4: Value bet accepted/running → Place hedge bet
if (valueBetResult.status === 'accepted' || valueBetResult.status === 'running') {
  const hedgeBetResult = await placeBet(hedgeBet)
  return { status: 'success', bets: [valueBetResult, hedgeBetResult] }
}
```

### 5. Tier Priority
```javascript
// When multiple opportunities exist:
// 1. Sort by tier priority (Tier 1 > Tier 2 > Tier 3)
// 2. If same tier, sort by profit percentage
// 3. If same profit, FIFO (oldest first)

opportunities.sort((a, b) => {
  if (a.tier_priority !== b.tier_priority) {
    return b.tier_priority - a.tier_priority // Higher priority first
  }
  if (a.profit_percentage !== b.profit_percentage) {
    return b.profit_percentage - a.profit_percentage
  }
  return new Date(a.created_at) - new Date(b.created_at) // FIFO
})
```

## 📱 Frontend Features

### System Health LED Indicators
- 🟢 **Green**: Healthy/Ready
- 🟡 **Yellow**: Processing/Warning
- 🔴 **Red**: Error/Down
- ⚪ **Gray**: Unknown/Offline

Monitors:
- Engine API
- PostgreSQL
- Redis
- Worker/Browser

### Account Panel
- Add sportsbook accounts
- Real-time balance display
- Connection status (Online/Offline)
- Refresh balance button

### Configuration Panel
- **Tier Management**: Set bet amounts for Big/Mid/Small leagues
- **Profit Settings**: Min/Max profit %, time limits
- **Match Filter**: Prematch/Live/All
- **Market Filter**: Enable/disable markets (HDP, O/U, 1X2)

### Monitoring Center
- **Live Scanner Table**: Active opportunities
- **Execution History**: Bet history with real-time status
- **System Logs**: Filterable activity logs
- **Profit Widget**: Daily profit summary

### Auto Robot Toggle
Master switch to enable/disable automatic bet execution.

## 🔐 Security Checklist

- [ ] Change default `admin` password
- [ ] Set strong DB and Redis passwords
- [ ] Generate unique JWT_SECRET and SESSION_SECRET
- [ ] Enable firewall (UFW)
- [ ] Use HTTPS in production (Let's Encrypt)
- [ ] Encrypt sportsbook passwords (currently plain text!)
- [ ] Set up backup automation
- [ ] Enable audit logging

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U arbitrage_user -d arbitrage_bot
```

### Redis Connection Error
```bash
# Check Redis
docker-compose exec redis redis-cli -a YOUR_REDIS_PASSWORD ping

# Should return: PONG
```

### Frontend Can't Connect to Backend
```bash
# Check engine is running
curl http://localhost:3000/health

# Check proxy in vite.config.js
# Ensure target matches engine URL
```

### Worker Not Showing Up
```bash
# Workers must send heartbeat
POST /api/v1/system/worker/heartbeat
{
  "worker_id": "worker-001",
  "status": "standby"
}

# Check worker status
SELECT * FROM worker_status WHERE last_heartbeat >= NOW() - INTERVAL '60 seconds';
```

## 📈 Monitoring

### Prometheus Metrics
http://localhost:9090

Key metrics:
- `http_requests_total`
- `http_request_duration_seconds`
- Custom business metrics (jobs, opportunities, bets)

### Grafana Dashboards
http://localhost:3030

Default credentials: `admin` / (from GRAFANA_PASSWORD in .env)

## 🔄 Backup & Restore

### Database Backup
```bash
# Backup
docker-compose exec postgres pg_dump -U arbitrage_user arbitrage_bot | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20241206.sql.gz | docker-compose exec -T postgres psql -U arbitrage_user -d arbitrage_bot
```

### Redis Backup
```bash
# Trigger save
docker-compose exec redis redis-cli -a YOUR_REDIS_PASSWORD BGSAVE

# Copy dump
docker cp arb-redis:/data/dump.rdb ./backup_redis.rdb
```

## 🚦 Production Checklist

- [ ] All services healthy
- [ ] Database initialized
- [ ] Default passwords changed
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Backup automation set up
- [ ] Monitoring alerts configured
- [ ] Test arbitrage calculation
- [ ] Test sequential execution logic
- [ ] Test all safety filters
- [ ] Load testing completed

## 📞 Support

For issues, check:
1. Service logs: `docker-compose logs [service]`
2. Health endpoints: `/health` and `/api/v1/system/health`
3. Database connectivity
4. Redis connectivity
5. Environment variables

## ⚠️ Legal Disclaimer

This system is for **EDUCATIONAL PURPOSES ONLY**. Sports betting and gambling may be illegal in your jurisdiction. Users are solely responsible for compliance with applicable laws.

---

**Built for professional arbitrage betting with safety-first approach.**

Version: 1.0.0  
Last Updated: 2024-12-06
