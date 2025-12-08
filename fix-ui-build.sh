#!/bin/bash
# Quick Fix Script for React Build Issues
# Run this on the server where Docker is available

echo "=========================================="
echo "React App Build Fix Script"
echo "=========================================="
echo ""

# Navigate to project root
cd /data/workspace/arb

echo "Step 1: Stopping existing UI container..."
docker-compose -f minimal-docker-compose.yml stop ui

echo ""
echo "Step 2: Removing UI container and image..."
docker-compose -f minimal-docker-compose.yml rm -f ui
docker rmi arb-ui 2>/dev/null || true

echo ""
echo "Step 3: Building UI with no cache..."
docker-compose -f minimal-docker-compose.yml build --no-cache ui

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed! Check the error messages above."
    echo ""
    echo "Common issues:"
    echo "  1. Missing source files in minimal-ui/src/"
    echo "  2. Syntax errors in JSX files"
    echo "  3. Missing dependencies in package.json"
    echo ""
    echo "To debug, run:"
    echo "  docker-compose -f minimal-docker-compose.yml build ui"
    exit 1
fi

echo ""
echo "Step 4: Starting UI container..."
docker-compose -f minimal-docker-compose.yml up -d ui

echo ""
echo "Step 5: Waiting for UI to be ready..."
sleep 5

echo ""
echo "Step 6: Checking UI container status..."
docker-compose -f minimal-docker-compose.yml ps ui

echo ""
echo "Step 7: Testing UI endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ UI is responding correctly (HTTP $HTTP_CODE)"
else
    echo "⚠️  UI returned HTTP $HTTP_CODE"
    echo ""
    echo "Check logs with:"
    echo "  docker-compose -f minimal-docker-compose.yml logs ui"
fi

echo ""
echo "Step 8: Verifying built files..."
docker-compose -f minimal-docker-compose.yml exec ui ls -la /usr/share/nginx/html/

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "Access UI at: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose -f minimal-docker-compose.yml logs -f ui"
echo "  Restart UI:    docker-compose -f minimal-docker-compose.yml restart ui"
echo "  Stop UI:       docker-compose -f minimal-docker-compose.yml stop ui"
echo "  Shell into UI: docker-compose -f minimal-docker-compose.yml exec ui sh"
echo ""
