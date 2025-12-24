#!/bin/bash
# WebSocket Verification Script

echo "=================================================="
echo "SPORTSBOOK ARBITRAGE SYSTEM - VERIFICATION"
echo "=================================================="
echo ""

# Check if backend is running
echo "1. Checking Backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$BACKEND_STATUS" == "200" ]; then
    echo "   ✓ Backend API is running (HTTP 200)"
else
    echo "   ✗ Backend API not responding (HTTP $BACKEND_STATUS)"
fi
echo ""

# Check for socket.io endpoint (should NOT exist)
echo "2. Verifying NO socket.io..."
SOCKETIO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/socket.io)
if [ "$SOCKETIO_STATUS" == "404" ]; then
    echo "   ✓ socket.io NOT found (correct - using native WebSocket)"
else
    echo "   ✗ socket.io endpoint exists (ERROR - should not exist)"
fi
echo ""

# Check WebSocket endpoint documentation
echo "3. Checking API Documentation..."
API_DOCS=$(curl -s http://localhost:3000/api/docs)
if echo "$API_DOCS" | grep -q "ws/opportunities"; then
    echo "   ✓ WebSocket endpoint documented"
else
    echo "   ✗ WebSocket endpoint not documented"
fi
echo ""

# Check whitelabels endpoint
echo "4. Checking Whitelabels Endpoint..."
WHITELABEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/system/whitelabels)
if [ "$WHITELABEL_STATUS" == "200" ]; then
    echo "   ✓ Whitelabels endpoint available (HTTP 200)"
    curl -s http://localhost:3000/api/v1/system/whitelabels | jq '.'
else
    echo "   ✗ Whitelabels endpoint not responding (HTTP $WHITELABEL_STATUS)"
fi
echo ""

# Check system health
echo "5. Checking System Health..."
HEALTH=$(curl -s http://localhost:3000/api/v1/system/health)
echo "$HEALTH" | jq '.health.services'
echo ""

# Check if Redis is configured
echo "6. Checking Redis Connection..."
REDIS_STATUS=$(echo "$HEALTH" | jq -r '.health.services.redis.status')
if [ "$REDIS_STATUS" == "healthy" ]; then
    echo "   ✓ Redis connected"
else
    echo "   ✗ Redis not connected ($REDIS_STATUS)"
fi
echo ""

# Check database
echo "7. Checking Database Connection..."
DB_STATUS=$(echo "$HEALTH" | jq -r '.health.services.database.status')
if [ "$DB_STATUS" == "healthy" ]; then
    echo "   ✓ Database connected"
else
    echo "   ✗ Database not connected ($DB_STATUS)"
fi
echo ""

echo "=================================================="
echo "VERIFICATION COMPLETE"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "1. Open browser: http://localhost:3000"
echo "2. Open DevTools → Network tab"
echo "3. Filter by 'WS' (WebSocket)"
echo "4. Verify connection to: ws://localhost:3000/ws/opportunities"
echo "5. Verify NO requests to: /socket.io"
echo ""
echo "Manual Login Test:"
echo "1. Configure Account A (NOVA)"
echo "2. Configure Account B (SBOBET)"
echo "3. Click START TRADING"
echo "4. Check logs for 'Manual login required'"
echo ""
