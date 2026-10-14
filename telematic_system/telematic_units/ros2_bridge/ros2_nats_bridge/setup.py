from setuptools import setup
import os
from glob import glob

package_name = 'ros2_nats_bridge'

setup(
    name=package_name,
    version='1.0.0',
    packages=[package_name],
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('share/' + package_name, glob('launch/*_launch.py')),
        (os.path.join('share', package_name, 'config'), glob('config/*.yaml'))

    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Samir Tabriz',
    maintainer_email='samir.manafzadehtabriz@leidos.com',
    description='ros2_nats_bridge package at start time it will publish data from ros topics into nats topics',
    license='BSD',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'main = ros2_nats_bridge.main:main'
        ],
    },
)