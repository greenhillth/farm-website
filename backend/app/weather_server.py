# mqtt_ingest.py
import json
import threading
from paho.mqtt.client import Client
from queue import Queue

inbound = Queue()


def on_connect(client, userdata, flags, rc):
    print("MQTT connected:", rc)
    client.subscribe("ecowitt/#", qos=1)


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except Exception:
        payload = {"raw": msg.payload.decode("utf-8", "ignore")}
    inbound.put((msg.topic, payload))


def start_mqtt():
    c = Client(client_id="backend-subscriber")
    c.username_pw_set("wx", "<yourpassword>")
    c.on_connect = on_connect
    c.on_message = on_message
    c.connect("10.0.0.100", 1885, keepalive=60)
    t = threading.Thread(target=c.loop_forever, daemon=True)
    t.start()
    return c
