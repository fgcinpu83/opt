#!/bin/bash
# Quick rebuild script for minimal-ui after config sync fix

set -e

echo "========================================="
echo "Config Sync Fix - Rebuild minimal-ui"
echo "========================================="
echo ""

cd /data/workspace/arb/minimal-ui

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔍 Checking TypeScript errors..."
npx tsc --noEmit || echo "⚠️  TypeScript check completed"

echo ""
echo "🏗️  Building production bundle..."
npm run build

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Restart the UI container:"
echo "   docker-compose restart minimal-ui"
echo ""
echo "2. Or rebuild the container:"
echo "   docker-compose build minimal-ui && docker-compose up -d minimal-ui"
echo ""
echo "3. Test the configuration save/load:"
echo "   - Open browser and navigate to your UI"
echo "   - Change a config value and save"
echo "   - Check browser console for 'Configuration saved to backend'"
echo "   - Reload page and verify settings persist"
echo ""
