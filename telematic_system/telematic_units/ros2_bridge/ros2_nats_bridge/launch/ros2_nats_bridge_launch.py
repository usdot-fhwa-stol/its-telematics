from launch import LaunchDescription
from launch_ros.actions import Node
import os
from ament_index_python.packages import get_package_share_directory

def generate_launch_description():

    return LaunchDescription([
        Node(
            package='ros2_nats_bridge',
            executable='main',
            name='ros2_nats_bridge',
            output='screen',
            emulate_tty=True,
            arguments=['--ros-args', '--log-level', 'info']
        )
    ])