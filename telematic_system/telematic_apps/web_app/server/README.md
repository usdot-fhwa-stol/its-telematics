## RSU Management APIs

These endpoints are used by the RSU management UI and test script to manage TRU/RSU registration.

Base URL (default dev): `http://localhost:9010`

All endpoints require an `Authorization` header containing the JWT token returned by `/api/users/login`:

```http
Authorization: <jwt-token>
```

On failure, these APIs typically return an error wrapper of the form:

```json
{
	"error": "<short description>",
	"message": "<detailed message, often including upstream status>"
}
```

---

### 1. Register RSU configuration

- **Method**: `POST`
- **Path**: `/api/rsu-registration/assign-rsu`

**Request body**

```json
{
	"unitConfig": {
		"unitId": "Unit002",
		"name": "Test TRU Unit",
		"maxConnections": 10,
		"pluginHeartbeatInterval": 30,
		"healthMonitorPluginHeartbeatInterval": 60,
		"rsuStatusMonitorInterval": 120,
		"timestamp": 1767900236905
	},
	"rsuConfigs": [
		{
			"action": "add",
			"event": "test event",
			"rsu": {
				"ip": "192.168.1.10",
				"port": 502
			},
			"snmpConfig": {
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
	"timestamp": 1767900236915
}
```

**Successful response**

```json
{
	"message": "RSU assigned successfully",
	"data": {
		"subject": "unit.*.register.rsu.config",
		"payload": "b2s=",
		"headers": null
	}
}
```

**Error response (example)**

```json
{
	"error": "Failed to assign RSU",
	"message": "Failed to register RSU: Request failed with status code 500"
}
```

---

### 2. Update RSU event / configuration

- **Method**: `POST`
- **Path**: `/api/rsu-registration/update-rsu-config`

**Request body**

```json
{
	"unitConfig": {
		"unitId": "Unit002",
		"name": "Test TRU Unit",
		"maxConnections": 10,
		"pluginHeartbeatInterval": 30,
		"healthMonitorPluginHeartbeatInterval": 60,
		"rsuStatusMonitorInterval": 120,
		"timestamp": 1767900237141
	},
	"rsuConfigs": [
		{
			"action": "update",
			"event": "test event updated",
			"rsu": {
				"ip": "192.168.1.10",
				"port": 502
			}
		}
	],
	"timestamp": 1767900237146
}
```

**Successful response**

```json
{
	"message": "RSU configuration updated successfully",
	"data": {
		"subject": "unit.*.register.rsu.config",
		"payload": "b2s=",
		"headers": null
	}
}
```

On failure, this endpoint uses the common error format shown above.

---

### 3. Get all TRU registration statuses

- **Method**: `GET`
- **Path**: `/api/rsu-registration/all-tru-config`

**Example response**

```json
{
	"message": "TRU configurations retrieved successfully",
	"data": [
		{
			"id": 1,
			"unitConfig": {
				"unitId": "Unit002",
				"name": null,
				"maxConnections": 10,
				"pluginHeartbeatInterval": 10,
				"healthMonitorPluginHeartbeatInterval": 10,
				"rsuStatusMonitorInterval": 10,
				"timestamp": null
			},
			"rsuConfigs": [
				{
					"id": 2,
					"event": "test event",
					"rsuEndpoint": {
						"ip": "192.168.1.11",
						"port": 502,
						"timestamp": null
					},
					"status": null,
					"timestamp": 1767908748103
				},
				{
					"id": 3,
					"event": "test event",
					"rsuEndpoint": {
						"ip": "192.168.1.12",
						"port": 502,
						"timestamp": null
					},
					"status": null,
					"timestamp": 1767908748103
				},
				{
					"id": 56,
					"event": "test event updated",
					"rsuEndpoint": {
						"ip": "192.168.1.10",
						"port": 502,
						"timestamp": null
					},
					"status": null,
					"timestamp": 1767900237250
				}
			],
			"timestamp": 1767908748103,
			"pluginConfigStatus": {}
		}
	],
	"count": 1
}
```

---

### 4. Remove RSU assignment

- **Method**: `POST`
- **Path**: `/api/rsu-registration/remove-rsu`

**Request body**

```json
{
	"unitConfig": {
		"unitId": "Unit002",
		"name": "Test TRU Unit",
		"maxConnections": 10,
		"pluginHeartbeatInterval": 30,
		"healthMonitorPluginHeartbeatInterval": 60,
		"rsuStatusMonitorInterval": 120,
		"timestamp": 1767900237451
	},
	"rsuConfigs": [
		{
			"action": "remove",
			"event": "test event updated",
			"rsu": {
				"ip": "192.168.1.10",
				"port": 502
			}
		}
	],
	"timestamp": 1767900237458
}
```

**Successful response**

```json
{
	"message": "RSU removed successfully",
	"data": {
		"subject": "unit.*.register.rsu.config",
		"payload": "b2s=",
		"headers": null
	}
}
```

On failure, this endpoint uses the common error format shown above.

