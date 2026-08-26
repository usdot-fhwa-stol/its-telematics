# ros2 nats bridge

## Overview

This is a ros2 nats bridge. this package is meant to create conection between ros nodes and nats server and allow for tranmition of data from both ends.

**Keywords:** ros2, nats, its-telematics

### License

The source code is released under a [Apache-2.0 license](../../../LICENSE).

The PACKAGE NAME package has been tested under [ROS] foxy on respectively Ubuntu 18.04.
This code, expect that it changes often and any fitness for a particular purpose is disclaimed.

[![Build Status]()]()

## Installation

### Building from Source

#### Dependencies

ROS: http://www.ros.org \
Nats.io: https://github.com/nats-io/nats.py \
carma-msgs: https://github.com/usdot-fhwa-stol/carma-msgs.git 

#### Building

To build from source, clone the latest version from this repository into your catkin workspace and compile the package using

	cd ws/src
	git clone --depth=1 https://github.com/usdot-fhwa-stol/carma-msgs.git --branch  $BRANCH
    git clone --depth=1 https://github.com/usdot-fhwa-stol/its-telematics.git --branch  $BRANCH
	cd ../
	colcon build

### Running in Docker

Docker is a great way to run an application with all dependencies and libraries bundles together. 
Make sure to [install Docker](https://docs.docker.com/get-docker/) first. 

command to start the container :

	docker run -ti --rm --name ros2_nats_bridge --network host ros2-nats-bridge:latest bash

### Unit Tests

Run the unit tests with

	colcon test --packages-select ros2_nats_bridge
	colcon test --packages-select --event-handlers console_cohesion+ ros2_nats_bridge #print unit test result

Run pytest for individual file:
	python3 -m pytest test_messages.py
	python3 -m pytest test_logger.py
	
## Usage

Run the main node with

	ros2 launch ros2_nats_bridge ros2_nats_bridge_launch.py

    or 

    ros2 run ros2_nats_bridge main

## Config files

Config file config/params.yaml

* **params.yaml** this config file includes all the parameters needed by ros2 nats bridge

## Launch files

* **ros2_nats_bridge_launch.py:** will launch ros2 to nats bridge 

## Nodes

### ros_package_template

This node creates a bridge between nats and ros and enables the software to publish ros messages in nats framework.

#### Subscribed Topics

* **`/*`** ([all type of messages available])

	all the topics that are selected by nats server is subscribed and published.

#### Parameters

* **`NATS_SERVER_IP_PORT`** (string, default: "nats://0.0.0.0:4222")

	The IP address of nats server.

#### Available topics
- Sample response for available topics from carma platform
	```
	{"unit_id": "DOT-45244", "unit_type": "platform", "unit_name": "BlueLexus", "timestamp": "1678998191815233965", "event_name": "wfd_full_integration_testing", "location": "TFHRC", "testing_type": "Integration", "topics": [{"name": "/environment/tcr_bounding_points", "type": "carma_v2x_msgs/msg/TrafficControlRequestPolygon"}, {"name": "/guidance/cooperative_lane_change_status", "type": "carma_planning_msgs/msg/LaneChangeStatus"}, {"name": "/hardware_interface/as/pacmod/parsed_tx/accel_rpt", "type": "pacmod3_msgs/msg/SystemRptFloat"}, {"name": "/hardware_interface/as/pacmod/parsed_tx/brake_rpt", "type": "pacmod3_msgs/msg/SystemRptFloat"}, {"name": "/hardware_interface/vehicle/twist", "type": "geometry_msgs/msg/TwistStamped"}, {"name": "/localization/current_pose", "type": "geometry_msgs/msg/PoseStamped"}, {"name": "/localization/gnss_pose", "type": "geometry_msgs/msg/PoseStamped"}, {"name": "/message/bsm_outbound", "type": "carma_v2x_msgs/msg/BSM"}, {"name": "/message/outgoing_geofence_request", "type": "carma_v2x_msgs/msg/TrafficControlRequest"}, {"name": "/parameter_events", "type": "rcl_interfaces/msg/ParameterEvent"}, {"name": "/rosout", "type": "rcl_interfaces/msg/Log"}]}
	```

## Bugs & Feature Requests

Please report bugs and request features using the [Issue Tracker](https://github.com/usdot-fhwa-stol/its-telematics/issues).


[ROS]: http://www.ros.org
[Nats.io]: https://github.com/nats-io/nats.py
[carma-msgs]: https://github.com/usdot-fhwa-stol/carma-msgs.git
