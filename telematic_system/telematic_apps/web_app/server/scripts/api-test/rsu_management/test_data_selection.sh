#!/bin/bash

# Configuration
WEB_APP_URL="http://localhost:9010"
USERNAME="testuser"
PASSWORD="testpassword123"
EMAIL="test@example.com"
ORG_ID=1
UNIT_ID="Unit002"

echo "========================================"
echo "Data Selection API Test Script"
echo "========================================"
echo ""

# Step 0: Register user if not exists
echo "Step 0: Registering user (if not exists)..."
REGISTER_RESPONSE=$(curl -s -X POST "$WEB_APP_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"email\":\"$EMAIL\",\"org_id\":$ORG_ID}")

echo "$REGISTER_RESPONSE" | jq '.'

# Check if registration was successful or user already exists
if echo "$REGISTER_RESPONSE" | grep -q "Successfully registered user"; then
  echo "✓ User registered successfully!"
elif echo "$REGISTER_RESPONSE" | grep -q "already exist"; then
  echo "✓ User already exists, attempting to reset password to test value..."

  FORGET_RESPONSE=$(curl -s -X POST "$WEB_APP_URL/api/users/forget/password" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"new_password\":\"$PASSWORD\"}")

  echo "$FORGET_RESPONSE" | jq '.'

  if echo "$FORGET_RESPONSE" | grep -q "Successfully updated password"; then
    echo "✓ Password reset for existing user."
  else
    echo "! Warning: Failed to reset password for existing user. Continuing anyway..."
  fi
else
  echo "✗ Registration failed. Response: $REGISTER_RESPONSE"
  # Continue anyway in case user exists
fi
echo ""

# Step 1: Login and get token
echo "Step 1: Logging in..."
 LOGIN_RESPONSE=$(curl -sS --max-time 10 -X POST "$WEB_APP_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
 )

 echo "Login response:"
 echo "$LOGIN_RESPONSE"

 TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "✗ Failed to login. Check your credentials."
  exit 1
fi

echo "✓ Login successful!"
echo "Token: $TOKEN"
echo ""

# Step 2: Get available topics
echo "Step 2: Getting available topics..."
curl -s -X GET "$WEB_APP_URL/api/data-selection/available-topics" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d "{\"unitId\":\"$UNIT_ID\",\"rsuTopics\":[]}" \
  | jq '.'

echo ""
echo ""

# Step 3: Confirm topics
echo "Step 3: Confirming topics..."
curl -s -X POST "$WEB_APP_URL/api/data-selection/confirm-topics" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{
    "unitId": "'$UNIT_ID'",
    "rsuTopics": [{
    "rsu": {
    "ip": "192.168.1.10",
    "port": 502
      },
      "topics": [
        {"name": "spat", "selected": true},
        {"name": "bsm", "selected": true}
      ]
    },
    {
    "rsu": {
    "ip": "192.168.1.11",
    "port": 502
    },
      "topics": [
        {"name": "tim", "selected": true}
      ]
    }]
  }' \
  | jq '.'

echo ""
echo "========================================"
echo "✓ All tests completed!"
echo "========================================"
