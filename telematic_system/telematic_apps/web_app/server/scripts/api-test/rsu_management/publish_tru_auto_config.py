#!/usr/bin/env python3
import asyncio
import json
import os
import sys
from datetime import datetime

try:
	from nats.aio.client import Client as NATS
except ImportError:
	print("Missing dependency: nats-py. Install with: pip install nats-py", file=sys.stderr)
	sys.exit(1)


SUBJECT = os.environ.get("NATS_SUBJECT", "unit.unit_1.register.rsu.autoconfig")
NATS_URL = os.environ.get("NATS_URL", "nats://127.0.0.1:4222")


def build_message() -> dict:
	# Epoch time in milliseconds
	epoch_ms = int(datetime.utcnow().timestamp() * 1000)
	return {
		"unitConfig": {
			"unitId": "Unit003",
			"name": "Test Unit 001",
			"maxConnections": 10,
			"pluginHeartbeatInterval": 10,
			"healthMonitorPluginHeartbeatInterval": 10,
			"rsuStatusMonitorInterval": 10,
			"timestamp": epoch_ms,
		},
		"rsuConfigs": [
			{
				"event": "test event 2",
				"rsu": {"ip": "192.168.1.10", "port": 502, "timestamp": epoch_ms},
				"snmp": {
					"privacyProtocol": "TLS",
					"securityLevel": "high",
					"authProtocol": "SHA256",
					"authPassPhrase": "auth1234",
					"user": "rsuuser",
					"privacyPassPhrase": "privacy1234",
					"rsuMibVersion": "v1.0",
				},
			},
			{
				"event": "test event",
				"rsu": {"ip": "192.168.1.11", "port": 502, "timestamp": epoch_ms},
				"snmp": {
					"privacyProtocol": "TLS",
					"securityLevel": "high",
					"authProtocol": "SHA256",
					"authPassPhrase": "auth1234",
					"user": "rsuuser",
					"privacyPassPhrase": "privacy1234",
					"rsuMibVersion": "v1.0",
				},
			},
			{
				"event": "test event",
				"rsu": {"ip": "192.168.1.12", "port": 502, "timestamp": epoch_ms},
				"snmp": {
					"privacyProtocol": "TLS",
					"securityLevel": "high",
					"authProtocol": "SHA256",
					"authPassPhrase": "auth1234",
					"user": "rsuuser",
					"privacyPassPhrase": "privacy1234",
					"rsuMibVersion": "v1.0",
				},
			},
		],
		"timestamp": epoch_ms,
	}


async def main():
	msg = build_message()
	payload = json.dumps(msg).encode("utf-8")

	nc = NATS()
	await nc.connect(servers=[NATS_URL])
	try:
		await nc.publish(SUBJECT, payload)
		await nc.flush(timeout=2)
		print(f"Published to '{SUBJECT}' via {NATS_URL}:\n{json.dumps(msg, indent=2)}")
	finally:
		await nc.drain()


if __name__ == "__main__":
	try:
		asyncio.run(main())
	except KeyboardInterrupt:
		pass
