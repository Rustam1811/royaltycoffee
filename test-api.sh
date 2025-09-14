#!/bin/bash
# Test script for API endpoints

echo "Testing API endpoints..."

# Test promo endpoint (this was causing 404)
echo "Testing /api/promo?action=promotions..."
curl -X GET "http://localhost:5173/api/promo?action=promotions" \
  -H "Content-Type: application/json" \
  -w "Status: %{http_code}\n" || echo "Failed to connect"

echo ""

# Test stories endpoint
echo "Testing /api/stories-unified?action=get..."
curl -X GET "http://localhost:5173/api/stories-unified?action=get" \
  -H "Content-Type: application/json" \
  -w "Status: %{http_code}\n" || echo "Failed to connect"

echo ""
echo "Test completed. Check status codes above."
