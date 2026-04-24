FROM python:3.9

RUN set -xe \
    && apt-get update \
    && apt-get install -y \
    iputils-ping \
    git \
    vim \
    python3-pip
    
COPY requirements.txt /tmp
WORKDIR /tmp
RUN pip install --upgrade -r requirements.txt

WORKDIR /ws

ADD kafka_nats_bridge src/kafka_nats_bridge

WORKDIR /ws/src/kafka_nats_bridge/src

CMD [ "python", "-u", "main.py" ]
