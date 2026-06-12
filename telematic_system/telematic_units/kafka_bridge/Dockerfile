FROM python:3.12.13-alpine

RUN apk add --no-cache build-base zlib-dev
    
COPY requirements.txt /tmp
WORKDIR /tmp
RUN python -m pip install --upgrade -r requirements.txt

WORKDIR /ws

ADD kafka_nats_bridge src/kafka_nats_bridge

WORKDIR /ws/src/kafka_nats_bridge/src

CMD [ "python", "-u", "main.py" ]
