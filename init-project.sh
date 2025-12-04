#!/usr/bin/env bash
# init-project.sh - Initialize Arbitrage Bot System project
# This script helps with initial setup and configuration

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo " Arbitrage Bot System - Initialization"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Error: Do not run this script as root${NC}"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Check prerequisites
echo -e "${YELLOW}[1/6]${NC} Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
else
    echo -e "${GREEN}✓${NC} Docker found: $(docker --version)"
fi

# Check Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose plugin"
    exit 1
else
    echo -e "${GREEN}✓${NC} Docker Compose found"
fi

# Check Node.js (for generating secrets)
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Warning: Node.js not found locally${NC}"
    echo "Will use Docker to generate secrets"
    USE_DOCKER_NODE=true
else
    echo -e "${GREEN}✓${NC} Node.js found: $(node --version)"
    USE_DOCKER_NODE=false
fi

# Create .env file if it doesn't exist
echo ""
echo -e "${YELLOW}[2/6]${NC} Setting up environment variables..."

if [ -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
    else
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created new .env file from template"
    fi
else
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file from template"
fi

# Generate secrets
echo ""
echo -e "${YELLOW}[3/6]${NC} Generating secure secrets..."

generate_secret() {
    if [ "$USE_DOCKER_NODE" = true ]; then
        docker run --rm node:20-alpine node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    else
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    fi
}

# Generate JWT secret
JWT_SECRET=$(generate_secret)
echo -e "${GREEN}✓${NC} Generated JWT_SECRET"

# Generate Session secret
SESSION_SECRET=$(generate_secret)
echo -e "${GREEN}✓${NC} Generated SESSION_SECRET"

# Generate database password
DB_PASSWORD=$(generate_secret | cut -c1-32)
echo -e "${GREEN}✓${NC} Generated DB_PASSWORD"

# Generate Redis password
REDIS_PASSWORD=$(generate_secret | cut -c1-32)
echo -e "${GREEN}✓${NC} Generated REDIS_PASSWORD"

# Update .env file with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
else
    # Linux
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
fi

echo -e "${GREEN}✓${NC} Updated .env file with generated secrets"

# Create required directories
echo ""
echo -e "${YELLOW}[4/6]${NC} Creating required directories..."

mkdir -p engine/logs
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p backups

echo -e "${GREEN}✓${NC} Directories created"

# Set permissions
echo ""
echo -e "${YELLOW}[5/6]${NC} Setting file permissions..."

chmod 600 .env
echo -e "${GREEN}✓${NC} Set .env permissions to 600"

# Build and start services
echo ""
echo -e "${YELLOW}[6/6]${NC} Building and starting services..."
echo "This may take several minutes on first run..."
echo ""

if docker compose up -d --build; then
    echo ""
    echo -e "${GREEN}✓${NC} Services started successfully!"
else
    echo ""
    echo -e "${RED}Error: Failed to start services${NC}"
    echo "Check logs with: docker compose logs"
    exit 1
fi

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check engine health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Engine is healthy"
else
    echo -e "${YELLOW}Warning: Engine health check failed${NC}"
    echo "Check logs with: docker compose logs engine"
fi

# Show service status
echo ""
echo -e "${YELLOW}Service Status:${NC}"
docker compose ps

# Print access information
echo ""
echo "=========================================="
echo -e "${GREEN} Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  Engine API:     http://localhost:3000"
echo "  API Docs:       http://localhost:3000/api/docs"
echo "  Health Check:   http://localhost:3000/health"
echo "  Prometheus:     http://localhost:9090"
echo "  Grafana:        http://localhost:3030 (admin/check .env)"
echo "  PgAdmin:        http://localhost:5050 (check .env)"
echo "  Metrics:        http://localhost:3000/metrics"
echo ""
echo "Useful Commands:"
echo "  View logs:      docker compose logs -f"
echo "  Stop services:  docker compose down"
echo "  Restart:        docker compose restart"
echo "  Update:         docker compose up -d --build"
echo ""
echo "Next Steps:"
echo "  1. Review .env file and customize if needed"
echo "  2. Check health: curl http://localhost:3000/health"
echo "  3. View API docs: curl http://localhost:3000/api/docs"
echo "  4. Read README.md for detailed documentation"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  - Your .env file contains sensitive data"
echo "  - Never commit .env to version control"
echo "  - Backup your .env file securely"
echo "  - Review security settings before production use"
echo ""
