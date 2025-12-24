#!/bin/bash
# Quick Test Script for Sportsbook Arbitrage System

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 SPORTSBOOK ARBITRAGE SYSTEM - TEST SCRIPT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check if backend is running
echo -e "${BLUE}Test 1: Backend Health Check${NC}"
HEALTH=$(curl -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "  Start backend: cd engine && npm start"
    exit 1
fi
echo ""

# Test 2: Check database connection
echo -e "${BLUE}Test 2: Database Connection${NC}"
DB_STATUS=$(echo "$HEALTH" | jq -r '.services.database.status' 2>/dev/null)
if [ "$DB_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓ Database connected${NC}"
else
    echo -e "${RED}✗ Database not connected${NC}"
fi
echo ""

# Test 3: Check Redis connection
echo -e "${BLUE}Test 3: Redis Connection${NC}"
REDIS_STATUS=$(echo "$HEALTH" | jq -r '.services.redis.status' 2>/dev/null)
if [ "$REDIS_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓ Redis connected${NC}"
else
    echo -e "${RED}✗ Redis not connected${NC}"
fi
echo ""

# Test 4: Check WebSocket endpoint
echo -e "${BLUE}Test 4: WebSocket Endpoint${NC}"
WS_TEST=$(curl -s -I http://localhost:3000/ws/opportunities | head -n 1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ WebSocket endpoint accessible${NC}"
else
    echo -e "${YELLOW}⚠ WebSocket requires upgrade connection${NC}"
fi
echo ""

# Test 5: Test API endpoints
echo -e "${BLUE}Test 5: API Endpoints${NC}"

# Test sessions endpoint
SESSIONS=$(curl -s http://localhost:3000/api/v1/sessions?user_id=1)
SESSION_SUCCESS=$(echo "$SESSIONS" | jq -r '.success' 2>/dev/null)
if [ "$SESSION_SUCCESS" = "true" ]; then
    ACCOUNT_COUNT=$(echo "$SESSIONS" | jq -r '.count' 2>/dev/null)
    echo -e "${GREEN}✓ Sessions API working (${ACCOUNT_COUNT} accounts)${NC}"
else
    echo -e "${YELLOW}⚠ Sessions API: No accounts configured${NC}"
fi

# Test config endpoint
CONFIG=$(curl -s http://localhost:3000/api/v1/config?user_id=1)
CONFIG_SUCCESS=$(echo "$CONFIG" | jq -r '.success' 2>/dev/null)
if [ "$CONFIG_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Config API working${NC}"
else
    echo -e "${YELLOW}⚠ Config API needs initialization${NC}"
fi

# Test system health
SYSTEM=$(curl -s http://localhost:3000/api/v1/system/health)
SYSTEM_SUCCESS=$(echo "$SYSTEM" | jq -r '.success' 2>/dev/null)
if [ "$SYSTEM_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ System API working${NC}"
else
    echo -e "${RED}✗ System API error${NC}"
fi
echo ""

# Test 6: Check frontend
echo -e "${BLUE}Test 6: Frontend Check${NC}"
FRONTEND=$(curl -s http://localhost:5173)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not running${NC}"
    echo "  Start frontend: cd frontend && npm run dev"
fi
echo ""

# Test 7: WebSocket connection test
echo -e "${BLUE}Test 7: WebSocket Connection Test${NC}"
echo "  Testing WebSocket with wscat (if installed)..."
if command -v wscat &> /dev/null; then
    timeout 3 wscat -c ws://localhost:3000/ws/opportunities &> /dev/null
    if [ $? -eq 124 ]; then
        echo -e "${GREEN}✓ WebSocket connection successful${NC}"
    else
        echo -e "${YELLOW}⚠ WebSocket connection timeout${NC}"
    fi
else
    echo -e "${YELLOW}⚠ wscat not installed (npm install -g wscat)${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ BASIC TESTS COMPLETE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Open UI: http://localhost:5173"
echo "2. Configure Account A & B"
echo "3. Click START TRADING"
echo "4. Complete manual login"
echo "5. Watch live scanner"
echo ""
