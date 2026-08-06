Kafka data from the nats server is received in the following json format:

{'payload': {'metadata': {'timestamp': 1664295886951, 'intersection_type': 'Carma/stop_controlled_intersection'}, 'payload': []}, 
'unit_id': 'kafka_id', 'unit_type': 'infrastructure', 'unit_name': 'West Intersection', 'event_name': 'UC3', 'location': 'TFHRC', 
'testing_type': 'Integration', 'msg_type': 'v2xhub_scheduling_plan_sub', 'topic_name': 'v2xhub_scheduling_plan_sub', 
'timestamp': 1664389254620257.0}

The InfluxPublisher converts this data into an influx record in the following format:

UC3,unit_id=kafka_id,unit_type=infrastructure,location=TFHRC,testing_type=Integration,topic_name=v2xhub_scheduling_plan_sub payload="[]",metadata.intersection_type="Carma/stop_controlled_intersection",metadata.timestamp=1664467407325 1664467407333590