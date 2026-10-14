#!/usr/bin/env python

import pytest
import json
import datetime


class CallBack():
    def __init__(self, msg_type, topic_name, nc, unit_id, unit_type, unit_name, event_name, location, testing_type):
        """
            initilize CallBack class
            declare Nats client 
            publish message to nats server
        """

        self.unit_id = unit_id
        self.unit_type = unit_type
        self.unit_name = unit_name
        self.event_name = event_name
        self.location = location
        self.testing_type = testing_type
        self.msg_type = msg_type
        self.origin_topic_name = topic_name
        self.topic_name = unit_id + ".data" + topic_name.replace("/", ".")
        self.nc = nc

    def listener_callback(self, msg):
        """
            listener callback function to publish message to nats server
            convert message to json format
        """
        ordereddict_msg = {}
        ordereddict_msg["unit_id"] = self.unit_id
        ordereddict_msg["unit_type"] = self.unit_type
        ordereddict_msg["unit_name"] = self.unit_name
        ordereddict_msg["event_name"] = self.event_name
        ordereddict_msg["location"] = self.location
        ordereddict_msg["testing_type"] = self.testing_type
        ordereddict_msg["msg_type"] = self.msg_type
        ordereddict_msg["topic_name"] = self.origin_topic_name
        ordereddict_msg["timestamp"] = datetime.datetime.utcnow(
        ).timestamp()*1000000
        json_message = json.dumps(ordereddict_msg).encode('utf8')
        return json_message


def test_callback():
    msg_type, topic_name, nc, unit_id, unit_type, unit_name, event_name, location, testing_type = "ROSType", "DemoTopic", "", "sampleUnitid", "sampleunittype", "sampleUnitName", "UseCase", "TFHRC", "Integration"
    callback = CallBack(msg_type, topic_name, nc, unit_id,
                        unit_type, unit_name, event_name, location, testing_type)
    json_message_str = callback.listener_callback(msg=[])
    json_ = json.loads(json_message_str)
    assert (json_["timestamp"] != 0)
    assert (json_["unit_id"] == "sampleUnitid")
    assert (json_["unit_type"] == "sampleunittype")
    assert (json_["unit_name"] == "sampleUnitName")
    assert (json_["event_name"] == "UseCase")
    assert (json_["location"] == "TFHRC")
    assert (json_["testing_type"] == "Integration")
    assert (json_["topic_name"] == "DemoTopic")
    assert (json_["msg_type"] == "ROSType")
