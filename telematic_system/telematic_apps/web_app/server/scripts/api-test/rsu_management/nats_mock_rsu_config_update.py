#!/usr/bin/env python3
"""
Mock NATS responder for RSU configuration updates.

Listens on subject pattern "unit.*.register.rsu.config" (or value from
TRU_CONFIG_SUBJECT env var) and replies to requests with a simple
"ok" payload. This is intended to mock the downstream RSU systems
so the TRU registration flow can be exercised end-to-end without
real RSUs.

Requires: nats-py
Install:  pip install nats-py

Env vars:
- NATS_URL          (default: nats://127.0.0.1:4222)
- TRU_CONFIG_SUBJECT (optional override for subject pattern,
                      default: unit.*.register.rsu.config)
"""
import asyncio
import json
import os
import sys
from typing import Any

try:
    from nats.aio.client import Client as NATS
except ImportError:  # pragma: no cover - runtime dependency check
    print("Missing dependency: nats-py. Install with: pip install nats-py", file=sys.stderr)
    sys.exit(1)


NATS_URL = os.getenv("NATS_URL", "nats://127.0.0.1:4222")
SUBJECT_PATTERN = os.getenv("TRU_CONFIG_SUBJECT", "unit.*.register.rsu.config")


async def main() -> None:
    nc = NATS()
    await nc.connect(servers=[NATS_URL])

    async def handler(msg):
        subject: str = msg.subject
        reply: str = msg.reply
        data: bytes = msg.data

        # Log incoming message for debugging purposes
        try:
            decoded: Any = json.loads(data.decode())
        except Exception:
            decoded = data.decode(errors="replace")
        print(f"[RSU-CONFIG-MOCK] Received on '{subject}': {decoded}")

        # Simple OK response payload. Use plain text "ok" for minimalism.
        response_payload = b"ok"

        if reply:
            await nc.publish(reply, response_payload)
            print(f"[RSU-CONFIG-MOCK] Replied with 'ok' on reply subject '{reply}'")
        else:
            # Fallback: publish to derived response subject if no reply inbox.
            resp_subject = f"{subject}.response"
            await nc.publish(resp_subject, response_payload)
            print(f"[RSU-CONFIG-MOCK] Published 'ok' on '{resp_subject}' (no reply subject)")

    # Subscribe with wildcard to cover all unit-specific config subjects.
    await nc.subscribe(SUBJECT_PATTERN, cb=handler)

    print(f"[RSU-CONFIG-MOCK] Listening on '{SUBJECT_PATTERN}' @ {NATS_URL}")

    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("[RSU-CONFIG-MOCK] Shutting down...")
    finally:
        await nc.drain()


if __name__ == "__main__":
    asyncio.run(main())
