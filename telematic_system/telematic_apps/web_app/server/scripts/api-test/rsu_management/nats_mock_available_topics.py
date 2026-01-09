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

SUBJECT_PATTERN = "unit.*.topic.rsu.available_topics"
NATS_URL = os.getenv("NATS_URL", "nats://127.0.0.1:4222")


def build_response(unit_id: str) -> Dict[str, Any]:
    return {
        "unitId": unit_id,
        "rsuTopics": [
            {
                "rsuEndpoint": {"IP": "192.168.1.10", "Port": 502},
                "topics": [
                    {"name": "bsm", "selected": False},
                    {"name": "spat", "selected": False},
                    {"name": "map", "selected": False},
                ],
            },
            {
                "rsuEndpoint": {"IP": "192.168.1.11", "Port": 502},
                "topics": [
                    {"name": "bsm", "selected": False},
                    {"name": "tim", "selected": False},
                ],
            },
        ],
    }


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
        unit_id = req.get("unitId") or extract_unit_id_from_subject(subject)
        resp = build_response(unit_id or "unknown")
        payload = json.dumps(resp).encode()
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
