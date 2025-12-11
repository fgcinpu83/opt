#!/bin/bash

# Setup Script for C-Sport Worker
# This script installs dependencies and sets up the environment

set -e  # Exit on error

echo "============================================================"
echo "C-Sport Worker Setup"
echo "============================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  Option 1 - Using apt:"
    echo "    sudo apt update"
    echo "    sudo apt install nodejs npm"
    echo ""
    echo "  Option 2 - Using nvm (recommended):"
    echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "    source ~/.bashrc"
    echo "    nvm install 16"
    echo "    nvm use 16"
    echo ""
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the worker directory:"
    echo "  cd /data/workspace/arb/worker"
    echo "  ./setup.sh"
    exit 1
fi

echo "📦 Installing npm dependencies..."
echo ""
npm install

echo ""
echo "✓ Dependencies installed successfully!"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your credentials:"
    echo "   - QQ188_USERNAME"
    echo "   - QQ188_PASSWORD"
    echo "   - REDIS_URL (if different)"
    echo ""
    echo "Edit with: nano .env"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "🔍 Checking Redis connection..."

# Check if Redis is accessible
if command -v redis-cli &> /dev/null; then
    REDIS_PASSWORD="${REDIS_PASSWORD:-redis_dev_password_2024}"
    REDIS_HOST="${REDIS_HOST:-localhost}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
        echo "✓ Redis is running and accessible"
    else
        echo "⚠️  Redis connection failed"
        echo ""
        echo "If using Docker:"
        echo "  cd /data/workspace/arb"
        echo "  docker-compose up -d redis"
        echo ""
        echo "If Redis is remote, update REDIS_URL in .env"
    fi
else
    echo "⚠️  redis-cli not found, skipping Redis check"
    echo "Make sure Redis is running before starting the worker"
fi

echo ""
echo "============================================================"
echo "Setup Complete!"
echo "============================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure credentials:"
echo "   nano .env"
echo ""
echo "2. Test the scraper:"
echo "   node test-csport.js"
echo ""
echo "3. Run the worker:"
echo "   node index.js"
echo ""
echo "For more information, see:"
echo "  - QUICKSTART_CSPORT.md"
echo "  - REDIS_CSPORT_IMPLEMENTATION.md"
echo "  - ARCHITECTURE_FLOW.md"
echo ""
