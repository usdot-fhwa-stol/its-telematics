#!/usr/bin/env python3
"""
Publish a test Ingestion message to NATS using subject pattern:
  unit.<unitId>.stream.rsu.<rsuIp>.<topicName>

Defaults can be overridden with environment variables:
- NATS_URL (default: nats://localhost:4222)
- UNIT_ID (default: TRU_001)
- RSU_IP (default: 192.168.1.100)
- TOPIC_NAME (default: safety)
- EVENT (default: test event)
- TIMESTAMP (default: 2024-01-15T14:30:45.123Z)

Usage:
  python scripts/send_data_ingestion.py
"""
import asyncio
import time
import json
import os
from datetime import datetime

from nats.aio.client import Client as NATS


def build_payload():
    metadata = {
        "unitId": os.getenv("UNIT_ID", "Unit002"),
        "topicName": os.getenv("TOPIC_NAME", "safety"),
        "rsuIp": os.getenv("RSU_IP", "192.168.1.12"),
        "port": 502,
        "timestamp": os.getenv("TIMESTAMP", int(datetime.utcnow().timestamp() * 1000)),
        "event": os.getenv("EVENT", "test_event"),
    }
    payload = {
        "J2735Message": {
            "messageId": "BSM",
            "value": {
                "coreData": {
                    "msgCnt": 45,
                    "id": "A234B5",
                    "secMark": 45000,
                    "lat": 401234567,
                    "long": -791234567,
                    "elev": 300,
                    "speed": 450,
                    "heading": 1800,
                    "angle": 0,
                    "accelSet": {
                        "long": 0,
                        "lat": 0,
                        "vert": 0,
                        "yaw": 0,
                    },
                    "brakes": {
                        "wheelBrakes": "00000",
                        "traction": "00000",
                        "abs": "00000",
                        "scs": "00000",
                        "brakeBoost": "00000",
                        "auxBrakes": "00000",
                    },
                    "size": {
                        "width": 220,
                        "length": 500,
                    },
                }
            }
        }
    }
    return {"metadata": metadata, "payload": payload}


async def main():
    second_to_micro = 1_000_000
    nats_url = os.getenv("NATS_URL", "nats://localhost:4222")
    msg = build_payload()

    unit_id = msg["metadata"]["unitId"]
    rsu_ip = msg["metadata"]["rsuIp"].replace(".", "_")
    topic_name = msg["metadata"]["topicName"]

    subject = f"unit.{unit_id}.stream.rsu.{rsu_ip}.{topic_name}"
    rsu_ip = "192_168_1_10"
    subject2 = f"unit.{unit_id}.stream.rsu.{rsu_ip}.{topic_name}"
    subject3 = f"unit.{unit_id}.stream.rsu.{rsu_ip}.{topic_name}_3"
    subject4 = f"unit.{unit_id}.stream.rsu.{rsu_ip}.{topic_name}_4"

    nc = NATS()
    await nc.connect(servers=[nats_url])
    count = 0
    while True:
        
        timestamp =int(time.time() * 1000)
        msg["metadata"]["timestamp"] = timestamp
        data = json.dumps(msg).encode("utf-8")
        await nc.publish(subject, data)
        await nc.flush(1)
        count += 1
        print(f"published msg count: {count}")
        
        print(f"Published to {subject} on {nats_url} at {timestamp}")
        
        
        msg["metadata"]["timestamp"] = timestamp
        data = json.dumps(msg).encode("utf-8")
        await nc.publish(subject2, data)
        await nc.flush(1)
        print(f"Published to {subject2} on {nats_url} at {timestamp}")
        # print(f"Published to {subject} on {nats_url} at {datetime.utcnow().isoformat()}Z")
        
        
        # msg["metadata"]["timestamp"] = int(time.time_ns () / 1000)
        # data = json.dumps(msg).encode("utf-8")
        # await nc.publish(subject3, data)
        # await nc.flush(1)

        # print(f"Published to {subject3} on {nats_url} at {datetime.utcnow().isoformat()}Z")
        
        
        # msg["metadata"]["timestamp"] = int(time.time_ns () / 1000)
        # data = json.dumps(msg).encode("utf-8")
        # await nc.publish(subject4, data)
        # await nc.flush(1)
        # print(f"Published to {subject4} on {nats_url} at {datetime.utcnow().isoformat()}Z")
        await asyncio.sleep(0.001)
        if count >= 100:
            break
    # print(json.dumps(msg, indent=2))

    await nc.close()


if __name__ == "__main__":
    asyncio.run(main())
