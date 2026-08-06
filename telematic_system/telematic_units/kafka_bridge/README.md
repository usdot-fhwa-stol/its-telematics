## Kafka-Nats Bridge Setup 

1. kafka and scheduling service containers need to be up
	a. Verify that "intersection_type" is set to "stop_controlled_intersection" in scheduling service manifest.json file		
2. Need to comment out anything referring to the Redshift DB in the worker.go code and rebuild with "docker-compose build worker"

3. Telematics cloud server docker-compose up everything (nats uri environment variables needs to be VM ethernet interface IP address)

4. In cda-telematics/telematic_system/telematic_units, run "sudo docker-compose up -d kafka-nats-bridge"

5. Check the status of the telematic cloud worker with "sudo docker logs -f telematic_cloud_server_worker_1"

6. Send appropriate HTTP curl requests to test

7. Can check the status of the nats bridge with the "kafka_nats_bridge_logger.log" file created inside of the container
	
## HTTP Curl Requests for Testing

1. request all available topics from carma streets (JAVA version)
```
	curl -X GET -v http://localhost:8080/requestAvailableTopics/<unit_id>
```

- request all available topics from carma streets (Go version)
```
	curl -X GET-v http://localhost:8080/requestAvailableTopics?unit_id=<unit_id>
```


2. Request data for a list of selected topics  (Go version)
```
	curl -d '{"unit_id": "<unit_id>", "unit_type": "<unit_type>", "timestamp": 1663084528513000325, "topics": ["<topic_name_1>","<topic_name_2>"]}'  -H "Content-Type: application/json" -X POST -v http://localhost:8080/publishSelectedTopics
```


- Request data for a list of selected topics (Java version)
```
	curl -d '{"unit_id": "<unit_id>", "unit_type": "<unit_type>", "timestamp": 1663084528513000325, "topics": ["<topic_name_1>","<topic_name_2>"]}'  -H "Content-Type: application/json" -X POST -v http://localhost:8080/requestSelectedTopics
```

3. get list of registered units:
	```
	curl -X GET -v http://localhost:8080/registeredUnits

	```
- Sample response for available topics from carma streets
	```
	{"unit_id": "streets_id", "unit_type": "infrastructure", "unit_name": "West Intersection", "event_name": "test", "location": "test", "testing_type": "Integration", "timestamp": 1678377501418782.0, "topics": [{"name": "v2xhub_bsm_in"}, {"name": "v2xhub_mobility_operation_in"}, {"name": "vehicle_status_intent_output"}, {"name": "desired_phase_plan"}, {"name": "tsc_config_state"}, {"name": "v2xhub_scheduling_plan_sub"}, {"name": "v2xhub_map_msg_in"}, {"name": "modified_spat"}, {"name": "v2xhub_mobility_path_in"}]}
	```
### Nats CLI for testing
1. request all available topcis:	
	```
	nats request "streets_id.available_topics" '' --raw
	```
2. request to publish the specific topics:
	```
	nats request "streets_id.publish_topics" '{"unit_id": "streets_id", "timestamp": 1663084528513000325, "topics": ["v2xhub_bsm_in","v2xhub_mobilitypath_in"]}' --raw
	```

