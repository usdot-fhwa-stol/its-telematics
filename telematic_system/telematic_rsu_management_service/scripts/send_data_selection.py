#!/usr/bin/env python3
"""
Simple client to call DataSelectionController endpoints with TRUTopicsMessage payloads.

Endpoints:
- GET /api/data-selection/available-topics
- POST /api/data-selection/confirm-topics

Env vars:
- BASE_URL (default: http://localhost:8080)

Usage:
    python3 scripts/data_selection_client.py available 123
    python3 scripts/data_selection_client.py confirm 123

This will send example TRUTopicsMessage payloads for unitId 123.
"""
import os
import sys
import json
import requests
from typing import Dict, Any

BASE_URL = os.getenv("BASE_URL", "http://localhost:8080")
AVAILABLE_ENDPOINT = f"{BASE_URL}/api/data-selection/available-topics"
CONFIRM_ENDPOINT = f"{BASE_URL}/api/data-selection/confirm-topics"


def build_tru_topics_message(unit_id: str) -> Dict[str, Any]:
    """Builds a TRUTopicsMessage payload matching the Java DTOs."""
    return {
        "unitId": unit_id,
        "rsuTopics": [
            {
                "rsuEndpoint": {"IP": "192.168.1.10", "Port": 502},
                "topics": [
                    {"name": "bsm", "selected": False},
                ],
            },
            {
                "rsuEndpoint": {"IP": "192.168.1.11", "Port": 502},
                "topics": [
                    {"name": "bsm", "selected": False},
                ],
            },
        ],
    }


def build_empty_tru_topics_message(unit_id: str) -> Dict[str, Any]:
    """Builds a TRUTopicsMessage payload matching the Java DTOs."""
    return {
        "unitId": unit_id,
        "rsuTopics": [],
    }

def request_available_topics(unit_id: str):
    payload = build_empty_tru_topics_message(unit_id)
    print(f"Requesting available topics for unit {unit_id} -> {AVAILABLE_ENDPOINT}")
    resp = requests.get(AVAILABLE_ENDPOINT, json=payload, timeout=15)
    print(f"Status: {resp.status_code}")
    try:
        print(json.dumps(resp.json(), indent=2))
    except Exception:
        print(resp.text)


def confirm_topics(unit_id: str):
    payload = build_tru_topics_message(unit_id)
    # As an example, mark some topics as selected prior to confirmation
    for rsu in payload["rsuTopics"]:
        for topic in rsu["topics"]:
            topic["selected"] = topic["name"] in ("spat", "bsm")
    print(f"Confirming topics for unit {unit_id} -> {CONFIRM_ENDPOINT}")
    resp = requests.post(CONFIRM_ENDPOINT, json=payload, timeout=15)
    print(f"Status: {resp.status_code}")
    try:
        print(json.dumps(resp.json(), indent=2))
    except Exception:
        print(resp.text)


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("available", "confirm"):
        print("Usage: python3 data_selection_client.py <available|confirm> <unitId>")
        sys.exit(1)
    action = sys.argv[1]
    unit_id = sys.argv[2]
    if action == "available":
        request_available_topics(unit_id)
    else:
        confirm_topics(unit_id)


if __name__ == "__main__":
    main()
