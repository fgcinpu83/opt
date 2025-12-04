# Worker - Arbitrage Bot System

Python worker application for executing arbitrage betting jobs using Playwright.

## Overview

The worker is responsible for:
- Consuming jobs from Redis queue
- Executing jobs using Playwright browser automation
- Reporting results back to the Engine
- Managing browser sessions and proxies

## Structure

```
worker/
├── worker.py              # Main worker application
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container build file
├── .env.example          # Environment template
├── utils/                # Utility modules
│   ├── __init__.py
│   └── session.py        # Session encryption
└── handlers/             # Job handlers
    ├── __init__.py
    ├── base.py           # Base handler class
    ├── place_bet.py      # Bet placement handler
    └── check_odds.py     # Odds checking handler
```

## Installation

### Local Development

```bash
cd worker

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Docker (Recommended)

```bash
# Build image
docker build -t arb-worker .

# Run container
docker run --rm \
  --env-file .env \
  --network arb_arb-network \
  arb-worker
```

## Usage

### Run Worker

```bash
# Local
python worker.py

# Docker
docker compose up worker
```

### Generate Session Encryption Key

```bash
python utils/session.py generate-key
```

Output:
```
Generated encryption key:
abc123def456...

Add to .env:
SESSION_ENCRYPTION_KEY=abc123def456...
```

### Encrypt Session Data

```bash
# Create cookies.json from browser
# Then encrypt it:
python utils/session.py encrypt cookies.json
```

## Configuration

### Environment Variables

Required variables in `.env`:

```bash
# Worker Identity
WORKER_ID=worker-001

# Engine Connection
ENGINE_URL=http://engine:3000
ENGINE_WS_URL=ws://engine:3001/ws

# Redis
REDIS_URL=redis://:password@redis:6379

# Session Encryption
SESSION_ENCRYPTION_KEY=<generated-key>
SESSION_TOKEN=<encrypted-session>

# Proxy (optional)
PROXY_SERVER=socks5://proxy.example.com:1080
PROXY_USERNAME=username
PROXY_PASSWORD=password
```

## Job Handlers

### Test Job

Simple test that opens example.com and takes a screenshot.

```python
payload = {
    "message": "test"
}
```

### Place Bet Job (Stub)

```python
payload = {
    "event_id": "evt123",
    "market": "1X2",
    "selection": "Home",
    "stake": 100.0,
    "odds": 2.50,
    "idempotency_key": "bet-unique-key"
}
```

### Check Odds Job (Stub)

```python
payload = {
    "event_id": "evt123",
    "markets": ["1X2", "Over/Under"]
}
```

## Development

### Adding New Handler

1. Create handler file in `handlers/` directory
2. Inherit from `BaseHandler`
3. Implement `execute()` method
4. Add handler to `worker.py`

Example:

```python
# handlers/my_handler.py
from .base import BaseHandler

class MyHandler(BaseHandler):
    def execute(self, payload, context):
        # Implementation
        return {'success': True, 'data': ...}
```

### Testing

```bash
# Unit tests (to be added)
pytest tests/

# Integration test
# 1. Start engine and redis
# 2. Submit test job
# 3. Run worker
# 4. Verify job completion
```

## Troubleshooting

### Browser Launch Fails

```bash
# Install system dependencies
playwright install-deps chromium

# Or use Docker (recommended)
docker compose up worker
```

### Redis Connection Error

```bash
# Check Redis is running
docker compose ps redis

# Test connection
redis-cli -h localhost -p 6379 PING
```

### WebSocket Connection Error

This is expected in Phase 1 as WebSocket server is not yet implemented.
Worker will still function by polling Redis queue.

## Current Limitations (Phase 1)

- ⚠️ WebSocket communication not yet implemented
- ⚠️ Job handlers are stubs (no actual betting)
- ⚠️ No session management implementation
- ⚠️ No retry logic with circuit breakers
- ⚠️ No comprehensive error handling

These will be implemented in Phase 2 and 3.

## Next Steps

1. Implement WebSocket client
2. Complete job handlers with actual logic
3. Add session management with encryption
4. Implement retry logic
5. Add comprehensive error handling
6. Create unit tests
7. Add integration tests

## Security Notes

- Never commit `.env` file
- Keep session encryption keys secure
- Use dedicated proxies per worker
- Implement user consent tracking
- Follow sportsbook terms of service

## License

MIT License - See parent directory LICENSE file
