#!/bin/bash

# Script to restart Nginx container after CSP header updates
echo "🔄 Restarting arb-nginx container..."

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    docker-compose restart arb-nginx
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose restart arb-nginx
else
    echo "❌ Neither 'docker-compose' nor 'docker compose' found."
    echo "Please manually restart the nginx container with:"
    echo "  docker compose restart arb-nginx"
    echo "  OR"
    echo "  docker-compose restart arb-nginx"
    exit 1
fi

echo "✅ arb-nginx container restarted successfully!"
echo ""
echo "📝 CSP headers have been updated to allow 'unsafe-eval' for React."
echo "The following files were modified:"
echo "  - nginx/conf.d/arbitrage.conf"
echo "  - nginx/conf.d/default.conf"
echo ""
echo "🔍 You can verify the CSP header by checking the browser console."
echo "The CSP error should now be resolved."
