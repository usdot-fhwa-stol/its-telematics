#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("Missing dependency: requests. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)


API_URL = os.environ.get("API_URL", "http://localhost:8080/api/registration/update-tru-config")
API_TOKEN = os.environ.get("API_TOKEN", "")  # optional bearer token


def build_payload() -> dict:
    epoch_ms = int(datetime.utcnow().timestamp() * 1000)
    return {
		"Unit": {
			"UnitID": "Unit002",
		},
		"RSUConfigs": [
			{
				"action": "remove",
				"event": "new test event 3",
				"rsu": {"IP": "192.168.1.12", "Port": 502},
				"snmp": {
					"PrivacyProtocol": "TLS",
					"SecurityLevel": "high",
					"AuthProtocol": "SHA256",
					"AuthPassPhrase": "auth1234",
					"User": "rsuuser",
					"PrivacyPassPhrase": "privacy1234",
					"RSUMIBVersion": "v1.0",
				},
			}
		],
		"timestamp": epoch_ms,
	}


def main() -> int:
    payload = build_payload()
    headers = {"Content-Type": "application/json"}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"

    try:
        resp = requests.post(API_URL, data=json.dumps(payload), headers=headers, timeout=10)
        print(f"POST {API_URL} -> {resp.status_code}")
        try:
            print(json.dumps(resp.json(), indent=2))
        except ValueError:
            print(resp.text)
        return 0 if resp.ok else 1
    except requests.RequestException as e:
        print(f"Request failed: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
