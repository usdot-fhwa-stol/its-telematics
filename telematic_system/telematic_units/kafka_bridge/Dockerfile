FROM python:3.12.13-alpine

RUN set -xe \
    && apt-get update \
    && apt-get install -y \
    python3-pip
    
COPY requirements.txt /tmp
WORKDIR /tmp
RUN pip install --upgrade -r requirements.txt

WORKDIR /ws

ADD kafka_nats_bridge src/kafka_nats_bridge

WORKDIR /ws/src/kafka_nats_bridge/src

CMD [ "python", "-u", "main.py" ]
