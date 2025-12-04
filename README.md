# Arbitrage Bot System

A legal, session-consent-based arbitrage bot system for automated sports betting. This system respects terms of service, uses user-consented sessions, and maintains comprehensive audit trails.

## ⚠️ Important Legal Disclaimer

**Gambling and sports betting are ILLEGAL in most parts of Indonesia** under:
- UU No. 7 Tahun 1974 tentang Penertiban Perjudian
- Pasal 303 KUHP

This system is provided for **EDUCATIONAL PURPOSES ONLY** and for use in jurisdictions where sports betting is legal.

**Users are solely responsible for:**
- Understanding and complying with laws in their jurisdiction
- Using the system only where legally permitted
- Obtaining proper licenses and permissions

## 🎯 System Architecture

### Components

- **Engine (Node.js)**: Central API server managing jobs, workers, and WebSocket connections
- **Worker (Python + Playwright)**: Browser automation workers executing betting actions
- **PostgreSQL**: Main database for jobs, workers, audit logs, and user consents
- **Redis**: Job queue (BullMQ), pub/sub, and caching
- **Prometheus + Grafana**: Monitoring and alerting
- **Nginx**: Reverse proxy and SSL termination (production)

### Key Features

✅ **Legal-First Design**
- User consent-based session tokens
- No CAPTCHA/2FA bypass
- Comprehensive audit logging
- Idempotent operations

✅ **Scalability**
- Supports 1-50+ workers
- Horizontal scaling ready
- Docker-based deployment

✅ **Reliability**
- Automatic retries with exponential backoff
- Circuit breaker pattern
- Graceful degradation
- Health checks

✅ **Observability**
- Prometheus metrics
- Grafana dashboards
- Structured logging
- Real-time monitoring

## 🚀 Quick Start

### Prerequisites

- Ubuntu 22.04 LTS (or similar Linux distribution)
- Docker and Docker Compose
- 4GB+ RAM
- 50GB+ storage

### 1. Clone Repository

```bash
git clone <repository-url>
cd arb
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env and replace CHANGE_ME values
nano .env
```

**Required Changes in `.env`:**
- `JWT_SECRET` - Generate with command above
- `SESSION_SECRET` - Generate with command above
- `DB_PASSWORD` - Set strong password
- `REDIS_PASSWORD` - Set strong password
- `PGADMIN_PASSWORD` - Set strong password
- `GRAFANA_PASSWORD` - Set strong password

### 3. Start Services

```bash
# Build and start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f engine
```

### 4. Verify Deployment

```bash
# Check engine health
curl http://localhost:3000/health

# Check detailed health
curl http://localhost:3000/health/detailed

# View API documentation
curl http://localhost:3000/api/docs
```

## 📊 Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Engine API | http://localhost:3000 | N/A |
| API Docs | http://localhost:3000/api/docs | N/A |
| Prometheus | http://localhost:9090 | N/A |
| Grafana | http://localhost:3030 | admin / (from .env) |
| PgAdmin | http://localhost:5050 | (from .env) |
| Metrics | http://localhost:3000/metrics | N/A |

## 🔧 Development

### Project Structure

```
arb/
├── engine/                 # Node.js Engine
│   ├── src/
│   │   ├── index.js       # Entry point
│   │   ├── server.js      # Express server
│   │   ├── config/        # Database, Redis, Logger
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities (metrics, etc.)
│   ├── Dockerfile
│   └── package.json
├── worker/                 # Python Worker (TODO)
│   ├── worker.py
│   ├── requirements.txt
│   └── Dockerfile
├── postgres/
│   └── init-scripts/      # Database schema
├── monitoring/
│   ├── prometheus/        # Prometheus config
│   └── grafana/           # Grafana dashboards
├── docker-compose.yml
└── .env.example
```

### Engine Development

```bash
# Install dependencies (local development)
cd engine
npm install

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Database Management

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot

# Run SQL scripts
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -f /docker-entrypoint-initdb.d/01-init-schema.sql

# Backup database
docker compose exec postgres pg_dump -U arbitrage_user arbitrage_bot > backup.sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U arbitrage_user -d arbitrage_bot
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f engine
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 engine

# With timestamps
docker compose logs -f -t engine
```

## 📈 Monitoring

### Prometheus Metrics

Access Prometheus at http://localhost:9090

**Key Metrics:**
- `job_submitted_total` - Total jobs submitted
- `job_completed_total` - Total jobs completed (by status)
- `job_duration_seconds` - Job execution time
- `job_queue_length` - Current queue size
- `worker_active_count` - Active worker count
- `worker_disconnected_total` - Worker disconnections
- `http_requests_total` - HTTP request count
- `http_request_duration_seconds` - API latency

### Grafana Dashboards

Access Grafana at http://localhost:3030

Default credentials: `admin` / (from .env GRAFANA_PASSWORD)

**Dashboards** (to be created):
- System Overview
- Job Metrics
- Worker Health
- API Performance

## 🛠️ Operations

### Start/Stop System

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart engine

# Stop and remove volumes (⚠️ DATA LOSS)
docker compose down -v
```

### Update/Deploy

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose build engine
docker compose up -d --no-deps engine

# Check health after update
curl http://localhost:3000/health
```

### Backup and Restore

```bash
# Backup database
docker compose exec postgres pg_dump -U arbitrage_user arbitrage_bot | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore database
gunzip -c backup_20241204.sql.gz | docker compose exec -T postgres psql -U arbitrage_user -d arbitrage_bot

# Backup Redis (if needed)
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} BGSAVE
docker cp arb-redis:/data/dump.rdb ./backup_redis.rdb
```

## 🔒 Security

### Security Checklist

- [ ] All secrets changed from default values
- [ ] SSH key-based authentication enabled
- [ ] Firewall (UFW) configured
- [ ] SSL certificates installed (production)
- [ ] Database passwords are strong (20+ characters)
- [ ] `.env` file permissions set to 600
- [ ] Audit logging enabled
- [ ] Regular backups scheduled

### Best Practices

1. **Never commit `.env` file to Git**
2. **Rotate secrets every 90 days**
3. **Use strong, unique passwords**
4. **Enable 2FA for all admin accounts**
5. **Regular security updates**
6. **Monitor logs for suspicious activity**
7. **Backup database daily**
8. **Test restore procedures monthly**

## 🧪 Testing

### API Testing

```bash
# Health check
curl http://localhost:3000/health

# Submit test job (stub)
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "payload": {"message": "test"},
    "idempotency_key": "test-'$(date +%s)'"
  }'

# List jobs
curl http://localhost:3000/api/v1/jobs

# Register worker (stub)
curl -X POST http://localhost:3000/api/v1/workers/register \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "test-worker-1",
    "capabilities": ["test"]
  }'
```

## 📝 TODO / Roadmap

### Phase 1: Foundation (✅ Completed)
- [x] Project structure
- [x] Docker Compose setup
- [x] Engine skeleton with health checks
- [x] Database schema
- [x] Basic monitoring (Prometheus/Grafana)

### Phase 2: Core Features (🚧 In Progress)
- [ ] Job queue implementation (BullMQ)
- [ ] Worker registration and management
- [ ] WebSocket real-time communication
- [ ] Task dispatcher service
- [ ] Idempotency implementation

### Phase 3: Worker Development (⏳ Pending)
- [ ] Python worker skeleton
- [ ] Playwright integration
- [ ] Proxy configuration
- [ ] Session management
- [ ] Job execution handlers

### Phase 4: Advanced Features (⏳ Pending)
- [ ] Circuit breaker pattern
- [ ] Retry logic with exponential backoff
- [ ] Paper trading mode
- [ ] User consent management
- [ ] Comprehensive audit logging

### Phase 5: Production Ready (⏳ Pending)
- [ ] Security hardening
- [ ] SSL/TLS setup
- [ ] Fail2ban configuration
- [ ] Backup automation
- [ ] Performance tuning
- [ ] Load testing

## 🤝 Contributing

This is an educational project. Contributions should maintain the legal-first approach and respect all applicable laws and terms of service.

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues, questions, or contributions:
- Check existing documentation
- Review logs: `docker compose logs`
- Check health endpoints
- Verify environment variables
- Ensure all services are running

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

**Built with ❤️ for educational purposes. Always gamble responsibly and within the law.**
