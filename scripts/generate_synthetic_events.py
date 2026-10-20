import requests
import time
import random

# Core ingestion endpoint
INGEST_URL = "http://localhost:8000/api/v1/dashboard/ingest"

# Synthetic telemetry data pools
EVENT_TYPES = ["alert", "flow"]
SEVERITIES = [1, 2, 3]  # 1: Critical, 2: High, 3: Medium
CATEGORIES = [
    "Web Application Attack",
    "Denial of Service",
    "Attempted Information Leak",
    "A Network Trojan was detected"
]

def generate_events(count=25):
    print(f"[*] Starting synthetic event generation to {INGEST_URL}...")
    
    for i in range(1, count + 1):
        evt_type = random.choice(EVENT_TYPES)
        src_ip = random.choice(["192.168.1.45", "10.0.0.12", "198.51.100.14", "172.16.0.88"])
        dest_ip = random.choice(["192.168.1.1", "10.0.0.1", "172.16.0.1"])
        
        payload = {
            "event_type": evt_type,
            "src_ip": src_ip,
            "src_port": random.randint(1024, 65535),
            "dest_ip": dest_ip,
            "dest_port": random.choice([80, 443, 8080, 22, 3306]),
            "proto": "TCP" if evt_type == "alert" else random.choice(["TCP", "UDP"]),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        
        if evt_type == "alert":
            payload["alert"] = {
                "category": random.choice(CATEGORIES),
                "signature": f"ET MALWARE Suspicious Activity on {src_ip}",
                "severity": random.choice(SEVERITIES)
            }
            
        try:
            res = requests.post(INGEST_URL, json=payload, timeout=5)
            # Treat both 200 OK and 201 Created as successful ingestion
            if res.status_code in (200, 201):
                print(f"[+] [{i}/{count}] Ingested: {src_ip} -> {dest_ip} ({evt_type})")
            else:
                print(f"[-] Failed ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"[-] Connection Error: {e}")
            
        time.sleep(0.1)

if __name__ == "__main__":
    generate_events()