import random
import time
from datetime import datetime, timezone
import requests

API_URL = "http://localhost:8000/api/v1/ingest"

ATTACK_TYPES = [
    {"signature": "ET EXPLOIT SQL Injection Attempt", "severity": 3, "category": "SQL Injection"},
    {"signature": "ET SCAN Nmap Port Scan Detected", "severity": 1, "category": "Port Scan"},
    {"signature": "ET AUTH SSH Brute Force Attack", "severity": 3, "category": "Brute Force"},
    {"signature": "ET WEB_SERVER XSS Attack Scripting", "severity": 2, "category": "XSS Attack"},
    {"signature": "ET DOS Volumetric UDP Flood", "severity": 3, "category": "DDoS Attack"}
]

SOURCE_IPS = ["192.168.1.105", "10.0.0.42", "172.16.0.12", "185.220.101.5", "45.154.255.8"]
TARGET_IPS = ["10.0.0.1", "10.0.0.2", "192.168.1.1"]


def generate_eve_event() -> dict:
    attack = random.choice(ATTACK_TYPES)
    src_ip = random.choice(SOURCE_IPS)
    dest_ip = random.choice(TARGET_IPS)

    return {
        "event_type": "alert",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "src_ip": src_ip,
        "src_port": random.randint(1024, 65535),
        "dest_ip": dest_ip,
        "dest_port": random.choice([22, 80, 443, 3306, 5432]),
        "proto": random.choice(["TCP", "UDP"]),
        "alert": {
            "action": "allowed",
            "gid": 1,
            "signature_id": random.randint(2000000, 2099999),
            "rev": 1,
            "signature": attack["signature"],
            "category": attack["category"],
            "severity": attack["severity"]
        }
    }


def main():
    print("[+] Starting live NEXUS NIDS telemetry generator pipeline...")
    print(f"[+] Target ingestion endpoint: {API_URL}")

    while True:
        try:
            payload = generate_eve_event()
            res = requests.post(API_URL, json=payload, timeout=5)
            if res.status_code == 200:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Ingested Event: {payload['alert']['category']} -> {payload['src_ip']}")
            else:
                print(f"[-] Ingestion failed: {res.status_code} - {res.text}")
        except Exception as err:
            print(f"[-] Connection error: {err}")

        time.sleep(2)


if __name__ == "__main__":
    main()