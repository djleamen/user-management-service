#!/bin/bash

# User Management Service - Quick Test Script
# This script tests all major API endpoints

BASE_URL="http://localhost:3000"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}User Management Service API Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -e "${BLUE}1. Testing Health Check...${NC}"
HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/health")
if [[ $HEALTH_RESPONSE == *"success\":true"* ]]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""

# Test 2: User Registration
echo -e "${BLUE}2. Testing User Registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
  -H "$CONTENT_TYPE" \
  -d '{
    "username": "test_user_'$(date +%s)'",
    "email": "testuser'$(date +%s)'@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "student"
  }')

if [[ $REGISTER_RESPONSE == *"success\":true"* ]]; then
    echo -e "${GREEN}✓ User registration passed${NC}"
    ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    USER_EMAIL=$(echo $REGISTER_RESPONSE | grep -o '"email":"[^"]*' | cut -d'"' -f4)
    echo -e "Access Token: ${ACCESS_TOKEN:0:50}..."
else
    echo -e "${RED}✗ User registration failed${NC}"
fi
echo ""

# Test 3: User Login
echo -e "${BLUE}3. Testing User Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "$CONTENT_TYPE" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"TestPass123!\"
  }")

if [[ $LOGIN_RESPONSE == *"success\":true"* ]]; then
    echo -e "${GREEN}✓ User login passed${NC}"
else
    echo -e "${RED}✗ User login failed${NC}"
fi
echo ""

# Test 4: Get User Profile
echo -e "${BLUE}4. Testing Get User Profile...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $PROFILE_RESPONSE == *"success\":true"* ]]; then
    echo -e "${GREEN}✓ Get profile passed${NC}"
else
    echo -e "${RED}✗ Get profile failed${NC}"
fi
echo ""

# Test 5: Update User Profile
echo -e "${BLUE}5. Testing Update User Profile...${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "$CONTENT_TYPE" \
  -d '{
    "bio": "Updated bio for testing"
  }')

if [[ $UPDATE_RESPONSE == *"success\":true"* ]]; then
    echo -e "${GREEN}✓ Update profile passed${NC}"
else
    echo -e "${RED}✗ Update profile failed${NC}"
fi
echo ""

# Test 6: Logout
echo -e "${BLUE}6. Testing Logout...${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $LOGOUT_RESPONSE == *"success\":true"* ]]; then
    echo -e "${GREEN}✓ Logout passed${NC}"
else
    echo -e "${RED}✗ Logout failed${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary Complete${NC}"
echo -e "${BLUE}========================================${NC}"
