# Use minimal official Humble image
FROM ros:humble-ros-base as base

SHELL ["/bin/bash", "-c"]

# Install only what the bridge needs
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-colcon-common-extensions \
    && rm -rf /var/lib/apt/lists/*

# Install NATS dependency
RUN pip3 install --no-cache-dir nats-py

FROM base AS dep

WORKDIR /ws

COPY ros2_nats_bridge src/ros2_nats_bridge
RUN sudo src/ros2_nats_bridge/docker/checkout.sh
RUN src/ros2_nats_bridge/docker/install.sh

FROM base AS install
COPY --from=dep /opt/ros/humble /opt/ros/humble

WORKDIR /ws
COPY --from=dep /ws/build /ws/build
COPY --from=dep /ws/install /ws/install
# Make ros2_nats_bridge source code available
COPY --from=dep /ws/src/ros2_nats_bridge /ws/src/

COPY ros2_nats_bridge/docker/ros_entrypoint.sh ros_entrypoint.sh
RUN chmod +x ros_entrypoint.sh

RUN sudo rm -rf src /var/lib/apt/lists/*

RUN echo "source /ws/install/setup.bash" >> ~/.bashrc

CMD ["bash"]