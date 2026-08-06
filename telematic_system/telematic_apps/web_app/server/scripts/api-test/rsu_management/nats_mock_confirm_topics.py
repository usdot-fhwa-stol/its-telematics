#!/usr/bin/env python3
"""
Mock NATS responder for available topics.
Listens on subject pattern "unit.*.data.selection.available.topics" and replies
with a TRUTopicsMessage-like JSON payload expected by the Java service.

Requires: nats-py
Install: pip install nats-py

Env vars:
- NATS_URL (default: nats://127.0.0.1:4222)
"""
import asyncio
import json
import os
import sys
from typing import Any, Dict, List

try:
	from nats.aio.client import Client as NATS
except ImportError:
	print("Missing dependency: nats-py. Install with: pip install nats-py", file=sys.stderr)
	sys.exit(1)

SUBJECT_PATTERN = "unit.*.topic.rsu.selected_topics"
NATS_URL = os.getenv("NATS_URL", "nats://127.0.0.1:4222")

def mark_selected_true(payload: Any) -> Any:
    if isinstance(payload, dict):
        new_payload: Dict[str, Any] = {}
        for key, value in payload.items():
            if key == "selected" and isinstance(value, bool):
                new_payload[key] = True
            else:
                new_payload[key] = mark_selected_true(value)
        return new_payload
    elif isinstance(payload, list):
        return [mark_selected_true(item) for item in payload]
    else:
        return payload


# Fallback RSU endpoint definitions used only when the request
# does not provide rsu information. This keeps the mock
# compatible with the rest of the service expectations.
DEFAULT_RSU_ENDPOINTS: List[Dict[str, Any]] = [
    {"ip": "192.168.1.10", "port": 502},
    {"ip": "192.168.1.11", "port": 502},
]


def ensure_rsu_endpoints(payload: Any) -> Any:
    if not isinstance(payload, dict):
        return payload

    rsutopics = payload.get("rsuTopics")
    if not isinstance(rsutopics, list):
        return payload

    default_idx = 0
    for rsu in rsutopics:
        if not isinstance(rsu, dict):
            continue
        endpoint = rsu.get("rsu")
        if endpoint is None and default_idx < len(DEFAULT_RSU_ENDPOINTS):
            # Assign a default endpoint only when none is provided
            rsu["rsu"] = DEFAULT_RSU_ENDPOINTS[default_idx]
            default_idx += 1
    return payload


async def main():
    nc = NATS()
    await nc.connect(servers=[NATS_URL])

    async def handler(msg):
        subject = msg.subject
        reply = msg.reply
        data = msg.data
        try:
            req = json.loads(data.decode())
        except Exception:
            req = {}
        # Update any "selected" flags in the incoming payload to True
        updated = mark_selected_true(req) if isinstance(req, (dict, list)) else req
        # Ensure rsuEndpoint objects are present so the Java service
        # can correctly map selections back to configured RSUs.
        updated = ensure_rsu_endpoints(updated) if isinstance(updated, dict) else updated
        payload = json.dumps(updated).encode()
        if reply:
            await nc.publish(reply, payload)
        else:
            # If not a request-style message, just publish to a derived response subject
            await nc.publish(f"{subject}.response", payload)

    # Subscribe with wildcard to cover all units
    await nc.subscribe(SUBJECT_PATTERN, cb=handler)

    print(f"Responder listening on '{SUBJECT_PATTERN}' @ {NATS_URL}")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        await nc.drain()


def extract_unit_id_from_subject(subject: str) -> str:
    # subject format: unit.<unitId>.data.selection.available.topics
    parts = subject.split('.')
    if len(parts) >= 2 and parts[0] == 'unit':
        return parts[1]
    return ""


if __name__ == "__main__":
    asyncio.run(main())
