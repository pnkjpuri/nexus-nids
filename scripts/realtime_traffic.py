import time
import random
import requests

INGEST_URL = "http://localhost:8000/api/v1/ingest"

ATTACK_SCENARIOS = [
    {"event_type": "SQL Injection Attempt", "severity": "critical", "description": "Malicious SELECT query detected in HTTP payload", "protocol": "HTTP", "dest_port": 80},
    {"event_type": "SSH Brute Force Attack", "severity": "high", "description": "Multiple failed root login attempts detected", "protocol": "SSH", "dest_port": 22},
    {"event_type": "SYN Flood DoS Probe", "severity": "critical", "description": "High frequency TCP SYN flags from single host", "protocol": "TCP", "dest_port": 443},
    {"event_type": "ICMP Ping Sweep", "severity": "medium", "description": "Network discovery sweep across internal subnet", "protocol": "ICMP", "dest_port": 0},
    {"event_type": "RDP Access Attempt", "severity": "medium", "description": "Unauthorized Remote Desktop connection request", "protocol": "RDP", "dest_port": 3389},
    {"event_type": "HTTPS Encrypted Session", "severity": "low", "description": "Normal outbound SSL handshake", "protocol": "TLS", "dest_port": 443}
]

IPS = ["192.168.29.188", "10.0.0.45", "172.16.0.12", "192.168.1.105", "49.44.137.9"]

def main():
    print("[+] Launching NEXUS NIDS Live Threat Simulator...")
    print(f"[+] Target Endpoint: {INGEST_URL}")
    print("[+] Streaming attack patterns to PostgreSQL... Press Ctrl+C to stop.\n")
    
    count = 0
    while True:
        scenario = random.choice(ATTACK_SCENARIOS)
        src_ip = random.choice(IPS)
        dest_ip = "192.168.29.1" if src_ip != "192.168.29.1" else "10.0.0.1"
        
        payload = {
            "event_type": scenario["event_type"],
            "severity": scenario["severity"],
            "source_ip": src_ip,
            "destination_ip": dest_ip,
            "source_port": random.randint(49152, 65535),
            "destination_port": scenario["dest_port"],
            "protocol": scenario["protocol"],
            "description": scenario["description"]
        }
        
        try:
            res = requests.post(INGEST_URL, json=payload, timeout=2)
            if res.status_code in [200, 201]:
                count += 1
                print(f"[{count}] Live Event Ingested: {scenario['event_type']} ({scenario['severity'].upper()}) -> {src_ip}")
            else:
                print(f"[-] Failed [{res.status_code}]: {res.text}")
        except Exception as e:
            print(f"[-] Connection Error: {e}")
            
        time.sleep(0.8)

if __name__ == "__main__":
    main()