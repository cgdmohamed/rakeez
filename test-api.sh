
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000"
TOKEN=""

echo "========================================="
echo "🧪 Testing Rakeez API"
echo "========================================="

# Test 1: Health Check
echo -e "\n${YELLOW}1. Testing Server Health...${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$HEALTH" -eq 200 ] || [ "$HEALTH" -eq 304 ]; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not responding (HTTP $HEALTH)${NC}"
    exit 1
fi

# Test 2: Login
echo -e "\n${YELLOW}2. Testing Login (Admin)...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v2/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rakeez.sa","password":"Rakeez@2025"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
fi

# Test 3: Get Profile
echo -e "\n${YELLOW}3. Testing Get Profile...${NC}"
PROFILE=$(curl -s -X GET "$BASE_URL/api/v2/profile" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROFILE" | grep -q "success"; then
    echo -e "${GREEN}✓ Profile retrieved${NC}"
    echo "$PROFILE" | grep -o '"name":"[^"]*' | cut -d'"' -f4
else
    echo -e "${RED}✗ Profile retrieval failed${NC}"
fi

# Test 4: Get Services
echo -e "\n${YELLOW}4. Testing Get Services...${NC}"
SERVICES=$(curl -s -X GET "$BASE_URL/api/v2/services" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SERVICES" | grep -q "success"; then
    echo -e "${GREEN}✓ Services retrieved${NC}"
    SERVICE_COUNT=$(echo "$SERVICES" | grep -o '"id"' | wc -l)
    echo "Services count: $SERVICE_COUNT"
else
    echo -e "${RED}✗ Services retrieval failed${NC}"
fi

# Test 5: Get Bookings (Admin)
echo -e "\n${YELLOW}5. Testing Get Bookings...${NC}"
BOOKINGS=$(curl -s -X GET "$BASE_URL/api/v2/admin/bookings" \
  -H "Authorization: Bearer $TOKEN")

if echo "$BOOKINGS" | grep -q "success"; then
    echo -e "${GREEN}✓ Bookings retrieved${NC}"
    BOOKING_COUNT=$(echo "$BOOKINGS" | grep -o '"id"' | wc -l)
    echo "Bookings count: $BOOKING_COUNT"
else
    echo -e "${RED}✗ Bookings retrieval failed${NC}"
fi

# Test 6: Get Customers (Admin)
echo -e "\n${YELLOW}6. Testing Get Customers...${NC}"
CUSTOMERS=$(curl -s -X GET "$BASE_URL/api/v2/admin/customers" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMERS" | grep -q "success"; then
    echo -e "${GREEN}✓ Customers retrieved${NC}"
else
    echo -e "${RED}✗ Customers retrieval failed${NC}"
fi

# Test 7: Get Spare Parts
echo -e "\n${YELLOW}7. Testing Get Spare Parts...${NC}"
PARTS=$(curl -s -X GET "$BASE_URL/api/v2/admin/spare-parts" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PARTS" | grep -q "success"; then
    echo -e "${GREEN}✓ Spare parts retrieved${NC}"
else
    echo -e "${RED}✗ Spare parts retrieval failed${NC}"
fi

# Test 8: Get Analytics (Admin)
echo -e "\n${YELLOW}8. Testing Get Analytics...${NC}"
ANALYTICS=$(curl -s -X GET "$BASE_URL/api/v2/admin/analytics" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ANALYTICS" | grep -q "success"; then
    echo -e "${GREEN}✓ Analytics retrieved${NC}"
else
    echo -e "${RED}✗ Analytics retrieval failed${NC}"
fi

# Test 9: Login as Technician
echo -e "\n${YELLOW}9. Testing Technician Login...${NC}"
TECH_LOGIN=$(curl -s -X POST "$BASE_URL/api/v2/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tech@rakeez.sa","password":"Rakeez@2025"}')

TECH_TOKEN=$(echo $TECH_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TECH_TOKEN" ]; then
    echo -e "${GREEN}✓ Technician login successful${NC}"
else
    echo -e "${RED}✗ Technician login failed${NC}"
fi

# Test 10: Get Technician Bookings
echo -e "\n${YELLOW}10. Testing Technician Bookings...${NC}"
TECH_BOOKINGS=$(curl -s -X GET "$BASE_URL/api/v2/technician/bookings" \
  -H "Authorization: Bearer $TECH_TOKEN")

if echo "$TECH_BOOKINGS" | grep -q "success"; then
    echo -e "${GREEN}✓ Technician bookings retrieved${NC}"
else
    echo -e "${RED}✗ Technician bookings retrieval failed${NC}"
fi

echo -e "\n========================================="
echo -e "${GREEN}✓ Testing Complete!${NC}"
echo "========================================="
