FROM ros:foxy-ros1-bridge AS base

SHELL ["/bin/bash", "-c"]

RUN set -xe \
    && sudo apt-get update \
    && sudo apt-get install -y \
    git \
    vim \
    python3-pip

RUN sudo pip install --upgrade pip nats-py

FROM base AS dep

WORKDIR /ws

COPY ros2_nats_bridge src/ros2_nats_bridge
RUN sudo src/ros2_nats_bridge/docker/checkout.sh
RUN src/ros2_nats_bridge/docker/install.sh

FROM base AS install
COPY --from=dep /opt/ros/foxy /opt/ros/foxy

WORKDIR /ws
COPY --from=dep /ws/build /ws/build
COPY --from=dep /ws/install /ws/install
# Make ros2_nats_bridge source code available
COPY --from=dep /ws/src/ros2_nats_bridge /ws/src/

COPY ros2_nats_bridge/docker/ros_entrypoint.sh ros_entrypoint.sh
RUN chmod +x ros_entrypoint.sh

RUN sudo rm -rf src /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /ws && \
    echo "source /ws/install/setup.bash" >> /home/app/.bashrc && \
    chown app:app /home/app/.bashrc

USER app

CMD ["bash"]