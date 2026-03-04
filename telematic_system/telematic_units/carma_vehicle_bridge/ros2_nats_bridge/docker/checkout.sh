#!/bin/bash

#  Copyright (C) 2018-2022 LEIDOS.
#
#  Licensed under the Apache License, Version 2.0 (the "License"); you may not
#  use this file except in compliance with the License. You may obtain a copy of
#  the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#  License for the specific language governing permissions and limitations under
#  the License.

# CARMA packages checkout script
# Optional argument to set the root checkout directory with no ending '/' default is '~'

set -exo pipefail

dir=/ws
while [[ $# -gt 0 ]]; do
      arg="$1"
      case $arg in
            -d|--develop)
                  BRANCH=develop
                  shift
            ;;
            -r|--root)
                  dir=$2
                  shift
                  shift
            ;;
      esac
done

cd ${dir}/src
sudo apt-get update

# clone carma repos

if [[ "$BRANCH" = "develop" ]]; then
      git clone --depth=1 https://github.com/usdot-fhwa-stol/carma-msgs.git --branch  $BRANCH
      git clone --depth=1 https://github.com/usdot-fhwa-stol/novatel_gps_driver.git --branch $BRANCH
else
      git clone --depth=1 https://github.com/usdot-fhwa-stol/carma-msgs.git --branch carma-system-4.5.0
      git clone --depth=1 https://github.com/usdot-fhwa-stol/novatel_gps_driver.git --branch carma-system-4.5.0
fi

sudo git clone https://github.com/NewEagleRaptor/raptor-dbw-ros2.git raptor-dbw-ros2 --branch foxy
cd raptor-dbw-ros2
sudo git reset --hard 4ad958dd07bb9c7128dc75bc7397bc8f5be30a3c
cd ..

rm -rf can_dbc_parser raptor_dbw_can raptor_dbw_joystick raptor_pdu

# Install automotive_autonomy_msgs
sudo git clone https://github.com/astuff/automotive_autonomy_msgs.git automotive_autonomy_msgs --branch master
cd automotive_autonomy_msgs
sudo git reset --hard 191dce1827023bef6d69b31e8c2514cf82bf10c5
cd ..

# Install Pacmod3
sudo git clone https://github.com/astuff/pacmod3_msgs.git --branch main
cd pacmod3_msgs
sudo git reset --hard f16e787d5e3d32d0958c0346363501f0be449b2f
cd ..

# Install novatel msgs
sudo git clone https://github.com/novatel/novatel_oem7_driver.git novatel_oem7_driver --branch ros2-dev
cd novatel_oem7_driver
sudo git checkout 3055e220bb9715b59c3ef53ab0aba05a495d9d5
sudo mv src/novatel_oem7_msgs ../novatel_oem7_msgs
cd ..
sudo rm -rf novatel_oem7_driver

# Required to build pacmod_msgs
git clone https://github.com/astuff/astuff_sensor_msgs.git astuff_sensor_msgs --branch 3.0.1

sudo apt-get install -y ros-foxy-lgsvl-msgs \
                   ros-foxy-udp-msgs \
                   ros-foxy-rosapi-msgs \
                   ros-foxy-rosbridge-msgs \
                   ros-foxy-automotive-platform-msgs \
                   ros-foxy-gps-msgs \
                   ros-foxy-nmea-msgs \
                   ros-foxy-gps-tools \
                   ros-foxy-osqp-vendor \
                   ros-foxy-osrf-testing-tools-cpp \
                   ros-foxy-std-msgs \
                   ros-foxy-velodyne-msgs \
                   apt-transport-https

sudo sh -c 'echo "deb [trusted=yes] https://s3.amazonaws.com/autonomoustuff-repo/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/autonomoustuff-public.list'
sudo apt update
sudo apt install -y ros-foxy-pacmod3-msgs ros-foxy-pcl-msgs

#autoware ai
sudo git clone https://github.com/usdot-fhwa-stol/autoware.ai.git
cd autoware.ai
sudo sed -i.bak '/find_package(ros_environment REQUIRED)/d' messages/*/CMakeLists.txt
sudo sed -i.bak '/find_package(ros_environment REQUIRED)/d' jsk_common_msgs/*/CMakeLists.txt

sudo mv jsk_common_msgs ../carma-msgs/jsk_common_msgs
sudo mv jsk_recognition ../carma-msgs/jsk_recognition
sudo mv messages ../carma-msgs/messages

cd ..
sudo rm -rf autoware.ai

#autoware auto
sudo git clone https://github.com/usdot-fhwa-stol/autoware.auto.git autoware.auto --branch develop
cd autoware.auto
sudo mv autoware_auto_msgs ../carma-msgs/autoware_auto_msgs
cd ..
sudo rm -rf autoware.auto