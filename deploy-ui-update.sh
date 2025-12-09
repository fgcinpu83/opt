#!/bin/bash

# ArbBot Pro Dashboard - Frontend Deployment Script
# This script builds and deploys the updated UI with backend API integration

set -e  # Exit on any error

echo "=========================================="
echo "ArbBot Pro Dashboard - Deployment Script"
echo "=========================================="
echo ""

# Configuration
PROJECT_DIR="/root/sportsbook-minimal"
UI_DIR="$PROJECT_DIR/minimal-ui"
BACKUP_DIR="$PROJECT_DIR/backups/ui-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Backup current UI
print_info "Creating backup of current UI..."
mkdir -p "$BACKUP_DIR"
cp -r "$UI_DIR/src" "$BACKUP_DIR/" || print_warn "No existing src to backup"
cp -r "$UI_DIR/dist" "$BACKUP_DIR/" || print_warn "No existing dist to backup"
print_info "Backup created at: $BACKUP_DIR"

# Step 2: Navigate to UI directory
print_info "Navigating to UI directory: $UI_DIR"
cd "$UI_DIR" || { print_error "Failed to navigate to $UI_DIR"; exit 1; }

# Step 3: Install dependencies
print_info "Installing npm dependencies..."
npm install || { print_error "npm install failed"; exit 1; }

# Step 4: Build the application
print_info "Building React application..."
npm run build || { print_error "Build failed"; exit 1; }

# Step 5: Verify build output
print_info "Verifying build output..."
if [ ! -d "dist" ]; then
    print_error "Build directory 'dist' not found!"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    print_error "index.html not found in dist directory!"
    exit 1
fi

print_info "Build verification successful"
ls -lh dist/

# Step 6: Navigate to project directory for Docker operations
cd "$PROJECT_DIR" || { print_error "Failed to navigate to $PROJECT_DIR"; exit 1; }

# Step 7: Stop current UI container
print_info "Stopping current UI container..."
docker compose stop ui || print_warn "UI container was not running"

# Step 8: Remove old UI container
print_info "Removing old UI container..."
docker compose rm -f ui || print_warn "No UI container to remove"

# Step 9: Rebuild UI Docker image
print_info "Building new UI Docker image..."
docker compose build ui || { print_error "Docker build failed"; exit 1; }

# Step 10: Start UI container
print_info "Starting new UI container..."
docker compose up -d ui || { print_error "Failed to start UI container"; exit 1; }

# Step 11: Wait for container to be healthy
print_info "Waiting for UI container to be healthy..."
sleep 5

# Step 12: Check container status
print_info "Checking UI container status..."
docker ps | grep arb-ui

# Step 13: Verify deployment
print_info "Verifying deployment..."
docker exec arb-ui ls -lh /usr/share/nginx/html/

# Step 14: Check logs
print_info "Recent UI container logs:"
docker logs arb-ui --tail 20

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Access the dashboard at: http://217.216.35.6:8080"
echo "2. Verify the ArbBot Pro layout is displayed"
echo "3. Check that all panels are visible (Accounts, Config, Scanner, History, Logs)"
echo "4. Test backend API connectivity"
echo ""
echo "Rollback command (if needed):"
echo "  cp -r $BACKUP_DIR/src $UI_DIR/"
echo "  cd $UI_DIR && npm run build"
echo "  cd $PROJECT_DIR && docker compose build ui && docker compose up -d ui"
echo ""
