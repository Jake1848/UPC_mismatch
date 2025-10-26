#!/bin/bash

# UPC Resolver V2 - Deployment Test Script
# Tests both frontend and backend deployments

echo "=============================================="
echo "🧪 UPC RESOLVER V2 - DEPLOYMENT TEST"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL=${1:-"http://localhost:3000"}
BACKEND_URL=${2:-"http://localhost:5000"}

echo "📍 Frontend URL: $FRONTEND_URL"
echo "📍 Backend URL: $BACKEND_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $response)"
        return 1
    fi
}

# Function to test JSON response
test_json() {
    local name=$1
    local url=$2
    local field=$3

    echo -n "Testing $name... "

    response=$(curl -s "$url")
    value=$(echo "$response" | grep -o "\"$field\"" | wc -l)

    if [ "$value" -gt 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "   Response: $response"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Response: $response"
        return 1
    fi
}

# Test counters
total_tests=0
passed_tests=0

echo "=============================================="
echo "🔧 BACKEND TESTS"
echo "=============================================="
echo ""

# Test 1: Health Check
total_tests=$((total_tests + 1))
if test_endpoint "Health Check" "$BACKEND_URL/health" 200; then
    passed_tests=$((passed_tests + 1))
fi

# Test 2: Health Check JSON
total_tests=$((total_tests + 1))
if test_json "Health Status" "$BACKEND_URL/health" "status"; then
    passed_tests=$((passed_tests + 1))
fi

# Test 3: Auth endpoint exists
total_tests=$((total_tests + 1))
echo -n "Testing Auth Endpoint... "
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/auth/login" -H "Content-Type: application/json" -d '{}')
if [ "$response" -eq 400 ] || [ "$response" -eq 401 ]; then
    echo -e "${GREEN}✅ PASS${NC} (Endpoint exists, HTTP $response)"
    passed_tests=$((passed_tests + 1))
else
    echo -e "${RED}❌ FAIL${NC} (Unexpected response: $response)"
fi

# Test 4: CORS headers
total_tests=$((total_tests + 1))
echo -n "Testing CORS Headers... "
cors=$(curl -s -I "$BACKEND_URL/health" | grep -i "access-control-allow-origin" | wc -l)
if [ "$cors" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    passed_tests=$((passed_tests + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (CORS headers not found - may cause issues)"
fi

echo ""
echo "=============================================="
echo "🎨 FRONTEND TESTS"
echo "=============================================="
echo ""

# Test 5: Frontend accessible
total_tests=$((total_tests + 1))
if test_endpoint "Frontend Home" "$FRONTEND_URL" 200; then
    passed_tests=$((passed_tests + 1))
fi

# Test 6: Login page
total_tests=$((total_tests + 1))
if test_endpoint "Login Page" "$FRONTEND_URL/auth/login" 200; then
    passed_tests=$((passed_tests + 1))
fi

# Test 7: Register page
total_tests=$((total_tests + 1))
if test_endpoint "Register Page" "$FRONTEND_URL/auth/register" 200; then
    passed_tests=$((passed_tests + 1))
fi

echo ""
echo "=============================================="
echo "📊 TEST RESULTS"
echo "=============================================="
echo ""

percentage=$((passed_tests * 100 / total_tests))

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
elif [ $percentage -ge 70 ]; then
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED${NC}"
else
    echo -e "${RED}❌ MANY TESTS FAILED${NC}"
fi

echo ""
echo "Passed: $passed_tests / $total_tests ($percentage%)"
echo ""

if [ $passed_tests -ne $total_tests ]; then
    echo "=============================================="
    echo "🔍 TROUBLESHOOTING"
    echo "=============================================="
    echo ""
    echo "If tests failed, check:"
    echo "  1. Is the backend running? (npm run dev in server-v2/)"
    echo "  2. Is the frontend running? (npm run dev in client/)"
    echo "  3. Are environment variables set correctly?"
    echo "  4. Check logs for error messages"
    echo "  5. Verify DATABASE_URL and JWT_SECRET are configured"
    echo ""
fi

echo "=============================================="
echo "🔗 QUICK LINKS"
echo "=============================================="
echo ""
echo "Frontend:  $FRONTEND_URL"
echo "Backend:   $BACKEND_URL"
echo "Health:    $BACKEND_URL/health"
echo "Login:     $FRONTEND_URL/auth/login"
echo ""

exit $((total_tests - passed_tests))
