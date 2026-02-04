#!/bin/bash

# API Test Script for Agentic Honey-Pot
# Usage: ./test-api.sh [API_KEY] [API_URL]

API_KEY="${1:-dev-api-key-12345}"
API_URL="${2:-http://localhost:3000}"

echo "=================================="
echo "Agentic Honey-Pot API Test Script"
echo "=================================="
echo "API URL: $API_URL"
echo "API Key: ${API_KEY:0:8}..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make API calls
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "Request: $data"
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -H "x-api-key: $API_KEY" \
            -d "$data" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "x-api-key: $API_KEY" \
            "$API_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
    fi
    
    echo "Response: $body"
    echo ""
}

# Test 1: Health Check
echo "1. Health Check"
call_api "GET" "/health" "" "Health endpoint (no auth required)"

# Test 2: Authentication Failure
echo "2. Authentication Tests"
echo -e "${YELLOW}Testing: Missing API key${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/process-message")
echo -e "${RED}Expected: 401 Unauthorized${NC}"
echo "Response: $(echo "$response" | sed '$d')"
echo ""

# Test 3: Scam Detection - Banking Fraud
SESSION_ID="test-session-$(date +%s)"
call_api "POST" "/api/v1/process-message" "{
  \"sessionId\": \"$SESSION_ID\",
  \"message\": {
    \"sender\": \"scammer\",
    \"text\": \"Your bank account will be blocked today. Verify immediately.\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  },
  \"conversationHistory\": [],
  \"metadata\": {
    \"channel\": \"SMS\",
    \"language\": \"English\",
    \"locale\": \"IN\"
  }
}" "Banking fraud detection"

# Test 4: Scam Detection - UPI Fraud
call_api "POST" "/api/v1/process-message" "{
  \"sessionId\": \"test-session-upi-$(date +%s)\",
  \"message\": {
    \"sender\": \"scammer\",
    \"text\": \"Send money to scammer@upi for verification\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  },
  \"conversationHistory\": [],
  \"metadata\": {
    \"channel\": \"WhatsApp\",
    \"language\": \"English\",
    \"locale\": \"IN\"
  }
}" "UPI fraud detection"

# Test 5: Scam Detection - Lottery Scam
call_api "POST" "/api/v1/process-message" "{
  \"sessionId\": \"test-session-lottery-$(date +%s)\",
  \"message\": {
    \"sender\": \"scammer\",
    \"text\": \"Congratulations! You have won Rs. 25,00,000 in lucky draw.\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  },
  \"conversationHistory\": [],
  \"metadata\": {
    \"channel\": \"SMS\",
    \"language\": \"English\",
    \"locale\": \"IN\"
  }
}" "Lottery scam detection"

# Test 6: Legitimate Message (No Scam)
call_api "POST" "/api/v1/process-message" "{
  \"sessionId\": \"test-session-legit-$(date +%s)\",
  \"message\": {
    \"sender\": \"scammer\",
    \"text\": \"Your transaction of Rs. 500 was successful. Reference: 123456.\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  },
  \"conversationHistory\": [],
  \"metadata\": {
    \"channel\": \"SMS\",
    \"language\": \"English\",
    \"locale\": \"IN\"
  }
}" "Legitimate message (should not detect scam)"

# Test 7: Statistics
call_api "GET" "/api/v1/statistics" "" "Get system statistics"

# Test 8: Batch Process
call_api "POST" "/api/v1/batch-process" "{
  \"messages\": [
    { \"id\": \"1\", \"text\": \"Your account will be blocked.\" },
    { \"id\": \"2\", \"text\": \"You won a prize!\" },
    { \"id\": \"3\", \"text\": \"Transaction successful.\" }
  ]
}" "Batch process messages"

echo "=================================="
echo "API Test Script Complete"
echo "=================================="
