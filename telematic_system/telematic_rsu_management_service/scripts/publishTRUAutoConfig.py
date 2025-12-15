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
		"Unit": {
			"UnitID": "Unit002",
			"MaxConnections": 10,
			"BridgePluginHeartbeatInterval": 10,
			"HealthMonitorPluginHeartbeatInterval": 10,
			"RSUStatusMonitorInterval": 10,
		},
		"RSUConfigs": [
			{
				# "action": "add",
				"event": "test event 2",
				"rsu": {"IP": "192.168.1.10", "Port": 502},
				# "snmp": {
				# 	"PrivacyProtocol": "TLS",
				# 	"SecurityLevel": "high",
				# 	"AuthProtocol": "SHA256",
				# 	"AuthPassPhrase": "auth1234",
				# 	"User": "rsuuser",
				# 	"PrivacyPassPhrase": "privacy1234",
				# 	"RSUMIBVersion": "v1.0",
				# },
			},
			{
				# "action": "update",
				"event": "test event",
				"rsu": {"IP": "192.168.1.11", "Port": 502},
				# "snmp": {
				# 	"PrivacyProtocol": "TLS",
				# 	"SecurityLevel": "high",
				# 	"AuthProtocol": "SHA256",
				# 	"AuthPassPhrase": "auth1234",
				# 	"User": "rsuuser",
				# 	"PrivacyPassPhrase": "privacy1234",
				# 	"RSUMIBVersion": "v1.0",
				# },
			},
			{
				# "action": "delete",
				"event": "test event",
				"rsu": {"IP": "192.168.1.12", "Port": 502},
				# "snmp": {
				# 	"PrivacyProtocol": "TLS",
				# 	"SecurityLevel": "high",
				# 	"AuthProtocol": "SHA256",
				# 	"AuthPassPhrase": "auth1234",
				# 	"User": "rsuuser",
				# 	"PrivacyPassPhrase": "privacy1234",
				# 	"RSUMIBVersion": "v1.0",
				# },
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
