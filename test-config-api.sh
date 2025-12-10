#!/bin/bash
# Test Script: Verify Backend Config API Accepts Multiple Formats

echo "🧪 Testing Backend Config Endpoints with Various Payload Formats"
echo "=================================================================="

API_URL="http://localhost:3001"  # Change to your API URL

echo ""
echo "Test 1: camelCase format (minProfit, maxProfit)"
echo "------------------------------------------------"
curl -X POST ${API_URL}/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "minProfit": 2.5,
    "maxProfit": 8.0,
    "maxMinuteHT": 40,
    "maxMinuteFT": 80,
    "matchFilter": "LIVE",
    "markets": {
      "ftHdp": true,
      "ftOu": true,
      "ft1x2": false
    }
  }' | jq '.'

echo ""
echo "Test 2: snake_case format (min_percentage, max_percentage)"
echo "-----------------------------------------------------------"
curl -X POST ${API_URL}/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "min_percentage": 3.0,
    "max_percentage": 10.0,
    "ht_time_last_bet": 35,
    "ft_time_last_bet": 75,
    "match_filter": "all",
    "ft_hdp": true,
    "ft_ou": true
  }' | jq '.'

echo ""
echo "Test 3: Mixed format (some camel, some snake)"
echo "----------------------------------------------"
curl -X POST ${API_URL}/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "min_percent": 2.0,
    "maxPercentage": 9.5,
    "minute_limit_ht": 38,
    "ft_time_last_bet": 77,
    "matchFilter": "MIXED"
  }' | jq '.'

echo ""
echo "✅ All tests completed!"
echo ""
echo "Check Docker logs to see debug output:"
echo "  docker logs arb-minimal-api-1 --tail 50"
echo ""
echo "Verify database:"
echo "  docker exec -it arb-postgres-1 psql -U arbuser -d arb_minimal -c 'SELECT * FROM settings;'"
