#!/bin/bash
# Test script for API-One

BASE_URL="http://localhost:3000"

echo "🧪 Testing API-One..."
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
curl -s $BASE_URL/health | jq '.' || echo "❌ Health check failed"
echo ""

# Test 2: List providers
echo "2️⃣  Testing providers list..."
curl -s $BASE_URL/api/providers | jq '.' || echo "❌ Providers list failed"
echo ""

# Test 3: Stats
echo "3️⃣  Testing stats endpoint..."
curl -s $BASE_URL/api/stats | jq '.' || echo "❌ Stats failed"
echo ""

# Test 4: Chat (simple)
echo "4️⃣  Testing chat endpoint..."
curl -s -X POST $BASE_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello"}' | jq '.' || echo "❌ Chat failed"
echo ""

echo "✅ Tests completed!"
