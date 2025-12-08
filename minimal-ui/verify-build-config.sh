#!/bin/bash

echo "=================================================="
echo "React App Build - Configuration Verification"
echo "=================================================="
echo ""

MINIMAL_UI_DIR="/data/workspace/arb/minimal-ui"
cd "$MINIMAL_UI_DIR"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description: $file"
        return 0
    else
        echo -e "${RED}✗${NC} $description: $file (MISSING)"
        return 1
    fi
}

check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description (NOT FOUND)"
        return 1
    fi
}

echo "Checking Core Files:"
echo "-------------------"
check_file "index.html" "Entry HTML"
check_file "vite.config.js" "Vite Config"
check_file "package.json" "Package Config"
check_file "Dockerfile" "Docker Build"
check_file "nginx.conf" "Nginx Config"
echo ""

echo "Checking Source Files:"
echo "---------------------"
check_file "src/main.jsx" "React Entry"
check_file "src/App.jsx" "App Component"
check_file "src/index.css" "CSS Entry"
echo ""

echo "Checking Tailwind Setup:"
echo "-----------------------"
check_file "tailwind.config.js" "Tailwind Config"
check_file "postcss.config.js" "PostCSS Config"
echo ""

echo "Verifying Configuration Content:"
echo "--------------------------------"
check_content "index.html" 'src="/src/main.jsx"' "index.html references main.jsx"
check_content "vite.config.js" "@vitejs/plugin-react" "Vite has React plugin"
check_content "package.json" '"type": "module"' "package.json uses ES modules"
check_content "package.json" '"build": "vite build"' "Build script configured"
check_content "Dockerfile" "npm run build" "Dockerfile builds app"
check_content "nginx.conf" "application/javascript" "nginx.conf has JS MIME type"
echo ""

echo "Checking Dependencies:"
echo "---------------------"
if [ -f "package.json" ]; then
    if grep -q '"react"' package.json; then
        echo -e "${GREEN}✓${NC} React dependency found"
    fi
    if grep -q '"react-dom"' package.json; then
        echo -e "${GREEN}✓${NC} React DOM dependency found"
    fi
    if grep -q '"vite"' package.json; then
        echo -e "${GREEN}✓${NC} Vite dependency found"
    fi
    if grep -q '"@vitejs/plugin-react"' package.json; then
        echo -e "${GREEN}✓${NC} Vite React plugin found"
    fi
    if grep -q '"tailwindcss"' package.json; then
        echo -e "${GREEN}✓${NC} Tailwind CSS found"
    fi
fi
echo ""

echo "Build Commands:"
echo "---------------"
echo -e "${YELLOW}Using Docker (Recommended):${NC}"
echo "  cd /data/workspace/arb"
echo "  docker-compose -f minimal-docker-compose.yml build --no-cache ui"
echo "  docker-compose -f minimal-docker-compose.yml up -d ui"
echo ""
echo -e "${YELLOW}Or use deployment script:${NC}"
echo "  cd /data/workspace/arb"
echo "  bash deploy-minimal.sh"
echo ""

echo "=================================================="
echo "Verification Complete"
echo "=================================================="
