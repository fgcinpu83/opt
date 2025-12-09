#!/bin/bash

# Script to rebuild and redeploy the frontend service with fresh build
# This ensures the latest Vite build is served by Nginx
# 
# IMPORTANT: Run this script from /root/sportsbook-minimal on the server
# Usage: cd /root/sportsbook-minimal && bash rebuild-frontend.sh

set -e  # Exit on any error

echo "=== Rebuilding arb-ui frontend service ==="
echo ""

# Determine the correct paths
if [ -d "/root/sportsbook-minimal" ]; then
    PROJECT_ROOT="/root/sportsbook-minimal"
    UI_PATH="$PROJECT_ROOT/minimal-ui"
else
    PROJECT_ROOT="$(pwd)"
    UI_PATH="$PROJECT_ROOT/minimal-ui"
fi

echo "Working directory: $PROJECT_ROOT"
echo ""

# Step 1: Stop and remove old container
echo "Step 1: Stopping old container..."
cd "$PROJECT_ROOT"
docker compose stop arb-ui 2>/dev/null || docker compose stop ui 2>/dev/null || true
docker compose rm -f arb-ui 2>/dev/null || docker compose rm -f ui 2>/dev/null || true
echo "✓ Old container removed"

# Step 2: Remove old Docker image to force complete rebuild
echo ""
echo "Step 2: Removing old Docker image..."
docker rmi sportsbook-minimal-ui 2>/dev/null || docker rmi arb-ui 2>/dev/null || true
echo "✓ Old image removed"

# Step 3: Rebuild Docker image with --no-cache to force fresh build
echo ""
echo "Step 3: Building Docker image (no cache)..."
docker compose build --no-cache ui
echo "✓ Docker image rebuilt"

# Step 4: Start the new container
echo ""
echo "Step 4: Starting new container..."
docker compose up -d ui
echo "✓ Container started"

# Step 5: Wait for container to be ready
echo ""
echo "Step 5: Waiting for container to be ready..."
sleep 5

# Step 6: Verify the files inside the container
echo ""
echo "Step 6: Verifying files inside container..."
echo "Contents of /usr/share/nginx/html/index.html in container:"
docker exec arb-ui cat /usr/share/nginx/html/index.html | grep -E "(\.js|\.css)" || echo "Could not grep for assets"
echo ""
echo "Files in /usr/share/nginx/html/assets/:"
docker exec arb-ui ls -la /usr/share/nginx/html/assets/ 2>/dev/null || echo "Assets directory check failed"

echo ""
echo "=== Rebuild complete! ==="
echo ""
echo "The frontend should now serve the latest build at http://217.216.35.6:8080"
echo "Please verify in browser Network tab that it loads the correct bundle files."
echo ""
