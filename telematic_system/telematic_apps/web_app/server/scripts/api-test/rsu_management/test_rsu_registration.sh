#!/bin/bash

# Simple RSU Registration API test script
# Mirrors the flow of test_data_selection.sh for registration endpoints.

WEB_APP_URL="http://localhost:9010"
USERNAME="testuser"
PASSWORD="testpassword123"
EMAIL="test@example.com"
ORG_ID=1

# TRU/RSU config values (adjust as needed)
UNIT_ID="Unit002"
UNIT_NAME="Test TRU Unit"
MAX_CONNECTIONS=10
BRIDGE_PLUGIN_HEARTBEAT_INTERVAL=30
HEALTH_MONITOR_PLUGIN_HEARTBEAT_INTERVAL=60
RSU_STATUS_MONITOR_INTERVAL=120

RSU_IP="192.168.1.10"
RSU_PORT=502
RSU_EVENT="add"

echo "========================================"
echo "RSU Registration API Test Script"
echo "========================================"
echo ""

# Step 0: Register user if not exists
echo "Step 0: Registering user (if not exists)..."
REGISTER_RESPONSE=$(curl -s -X POST "$WEB_APP_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"email\":\"$EMAIL\",\"org_id\":$ORG_ID}")

echo "$REGISTER_RESPONSE" | jq '.'

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
fi

echo ""

echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -sS --max-time 10 -X POST "$WEB_APP_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

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

# Step 2: Register RSU configuration for the TRU
echo "Step 2: Registering RSU configuration..."

ASSIGN_PAYLOAD=$(cat <<EOF
{
  "unitConfig": {
    "unitId": "${UNIT_ID}",
    "name": "${UNIT_NAME}",
    "maxConnections": ${MAX_CONNECTIONS},
    "pluginHeartbeatInterval": ${BRIDGE_PLUGIN_HEARTBEAT_INTERVAL},
    "healthMonitorPluginHeartbeatInterval": ${HEALTH_MONITOR_PLUGIN_HEARTBEAT_INTERVAL},
    "rsuStatusMonitorInterval": ${RSU_STATUS_MONITOR_INTERVAL},
    "timestamp": $(date +%s%3N)
  },
  "rsuConfigs": [
    {
      "action": "${RSU_EVENT}",
      "event": "test event",
      "rsu": {
        "ip": "${RSU_IP}",
        "port": ${RSU_PORT}
      },
      "snmp": {
        "privacyProtocol": "AES128",
        "securityLevel": "authPriv",
        "authProtocol": "SHA",
        "authPassPhrase": "password123",
        "user": "snmpuser",
        "privacyPassPhrase": "privpass",
        "rsuMibVersion": "v3"
      }
    }
  ],
  "timestamp": $(date +%s%3N)
}
EOF
)

echo "Request payload (assign):"
echo "$ASSIGN_PAYLOAD" | jq '.'

curl -s -X POST "$WEB_APP_URL/api/rsu-registration/assign-rsu" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d "$ASSIGN_PAYLOAD" | jq '.'

echo ""

# Step 3: Update RSU event name
echo "Step 3: Updating RSU event name..."

UPDATE_PAYLOAD=$(cat <<EOF
{
  "unitConfig": {
    "unitId": "${UNIT_ID}",
    "name": "${UNIT_NAME}",
    "maxConnections": ${MAX_CONNECTIONS},
    "pluginHeartbeatInterval": ${BRIDGE_PLUGIN_HEARTBEAT_INTERVAL},
    "healthMonitorPluginHeartbeatInterval": ${HEALTH_MONITOR_PLUGIN_HEARTBEAT_INTERVAL},
    "rsuStatusMonitorInterval": ${RSU_STATUS_MONITOR_INTERVAL},
    "timestamp": $(date +%s%3N)
  },
  "rsuConfigs": [
    {
      "action": "update",
      "event": "test event updated",
      "rsu": {
        "ip": "${RSU_IP}",
        "port": ${RSU_PORT}
      },
      "snmp": {
        "privacyProtocol": "AES128",
        "securityLevel": "authPriv",
        "authProtocol": "SHA",
        "authPassPhrase": "password123",
        "user": "snmpuser",
        "privacyPassPhrase": "privpass",
        "rsuMibVersion": "v3"
      }
    }
  ],
  "timestamp": $(date +%s%3N)
}
EOF
)

echo "Request payload (update):"
echo "$UPDATE_PAYLOAD" | jq '.'

curl -s -X POST "$WEB_APP_URL/api/rsu-registration/update-rsu-config" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d "$UPDATE_PAYLOAD" | jq '.'

echo ""

# Step 4: Fetch all TRU registration status
echo "Step 4: Fetching all TRU registration statuses..."

STEP4_RESPONSE=$(curl -s -X GET "$WEB_APP_URL/api/rsu-registration/all-tru-config" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN")

echo "$STEP4_RESPONSE" | jq '.'

echo ""

# Step 5: Remove RSU assignment
echo "Step 5: Removing RSU assignment..."

REMOVE_PAYLOAD=$(cat <<EOF
{
  "unitConfig": {
    "unitId": "${UNIT_ID}",
    "name": "${UNIT_NAME}",
    "maxConnections": ${MAX_CONNECTIONS},
    "pluginHeartbeatInterval": ${BRIDGE_PLUGIN_HEARTBEAT_INTERVAL},
    "healthMonitorPluginHeartbeatInterval": ${HEALTH_MONITOR_PLUGIN_HEARTBEAT_INTERVAL},
    "rsuStatusMonitorInterval": ${RSU_STATUS_MONITOR_INTERVAL},
    "timestamp": $(date +%s%3N)
  },
  "rsuConfigs": [
    {
      "action": "remove",
      "event": "test event updated",
      "rsu": {
        "ip": "${RSU_IP}",
        "port": ${RSU_PORT}
      }
    }
  ],
  "timestamp": $(date +%s%3N)
}
EOF
)

echo "Request payload (remove):"
echo "$REMOVE_PAYLOAD" | jq '.'

curl -s -X POST "$WEB_APP_URL/api/rsu-registration/remove-rsu" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d "$REMOVE_PAYLOAD" | jq '.'

echo ""

# Step 6: Fetch all TRU registration status
echo "Step 6: Fetching all TRU registration statuses..."

STEP6_RESPONSE=$(curl -s -X GET "$WEB_APP_URL/api/rsu-registration/all-tru-config" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN")

echo "$STEP6_RESPONSE" | jq '.'

echo ""
echo "========================================"
echo "✓ RSU registration tests completed!"
echo "========================================"
