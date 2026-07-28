# Use minimal official Humble image
FROM ros:humble-ros-base

SHELL ["/bin/bash", "-c"]

# Install only what the bridge needs
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-colcon-common-extensions \
    && rm -rf /var/lib/apt/lists/*

# Install NATS dependency
RUN pip3 install --no-cache-dir nats-py

# Set workspace
WORKDIR /ws

# Copy bridge source
COPY ros2_nats_bridge src/ros2_nats_bridge

# Build the bridge
# Note: If your bridge uses custom message packages from other repos,
# you must include those packages in the /ws/src folder before building.
RUN source /opt/ros/humble/setup.bash && \
    colcon build --packages-select ros2_nats_bridge

# Entrypoint script to handle environment sourcing
COPY ros2_nats_bridge/docker/ros_entrypoint.sh /ros_entrypoint.sh
RUN chmod +x /ros_entrypoint.sh

# Use the bridge user (consistent with your other containers)
RUN useradd -m bridge_user
USER bridge_user

ENTRYPOINT ["/ros_entrypoint.sh"]
CMD ["ros2", "run", "ros2_nats_bridge", "your_node_executable"]