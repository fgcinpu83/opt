#!/bin/bash
# React Blank Page Fix - Rebuild Script
# This script rebuilds the UI after applying fixes for undefined property errors

set -e

echo "=========================================="
echo "React Blank Page Fix - Rebuild Script"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to minimal-ui directory
UI_DIR="/data/workspace/arb/minimal-ui"
cd "$UI_DIR" || {
    echo -e "${RED}Error: Cannot find $UI_DIR${NC}"
    exit 1
}

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Building the application...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Checking if container exists...${NC}"
if docker ps -a | grep -q "arb-ui"; then
    echo -e "${GREEN}✓ Container found${NC}"
    
    echo ""
    echo -e "${YELLOW}Step 4: Restarting container...${NC}"
    docker restart arb-ui
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Container restarted${NC}"
    else
        echo -e "${RED}✗ Failed to restart container${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Container 'arb-ui' not found. Please start it with:${NC}"
    echo "   docker-compose up -d ui"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Fix applied successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Open your browser and navigate to the application"
echo "2. Check the browser console (F12) - should have no errors"
echo "3. Verify all components are displaying correctly"
echo ""
echo "Files fixed:"
echo "  - Created: src/types.ts (TypeScript definitions)"
echo "  - Created: tsconfig.json (TypeScript config)"
echo "  - Updated: All components with null/undefined checks"
echo ""
echo "For details, see: /data/workspace/arb/REACT_BLANK_PAGE_FIX.md"
echo ""
