import os
import time
import random
import argparse
import requests

INGEST_URL = "http://localhost:8000/api/v1/ingest"
DEFAULT_OWNER = os.getenv("NEXUS_OWNER_EMAIL", "analyst@example.com")

ATTACK_WAVES = [
    {
        "event_type": "SQL Injection Payload",
        "severity": "critical",
        "rule_id": "OWASP-SQLI-942",
        "protocol": "HTTP",
        "dest_port": 80,
        "description": "UNION SELECT authentication bypass pattern in URI query",
    },
    {
        "event_type": "SYN Flood DDoS Attack",
        "severity": "critical",
        "rule_id": "NIDS-DOS-201",
        "protocol": "TCP",
        "dest_port": 443,
        "description": "Half-open TCP SYN flood exhausting connection table",
    },
    {
        "event_type": "SSH Brute Force Attempt",
        "severity": "high",
        "rule_id": "MITRE-T1110-022",
        "protocol": "SSH",
        "dest_port": 22,
        "description": "Repeated invalid root credential authentication attempts",
    },
    {
        "event_type": "SMB EternalBlue Exploit Probe",
        "severity": "critical",
        "rule_id": "CVE-2017-0144",
        "protocol": "TCP",
        "dest_port": 445,
        "description": "Malformed SMBv1 transaction buffer overflow signature",
    },
    {
        "event_type": "DNS Data Exfiltration Tunnel",
        "severity": "high",
        "rule_id": "MITRE-T1048-053",
        "protocol": "UDP",
        "dest_port": 53,
        "description": "High-entropy base64 subdomain query detected",
    },
    {
        "event_type": "Nmap SYN Stealth Port Scan",
        "severity": "medium",
        "rule_id": "NIDS-SCAN-104",
        "protocol": "TCP",
        "dest_port": 8080,
        "description": "Sequential port enumeration across internal subnet",
    },
]

EXTERNAL_ATTACKERS = [
    "185.220.101.42",
    "45.33.32.156",
    "91.134.192.18",
    "103.21.244.12",
    "192.168.29.188",
]
INTERNAL_TARGETS = ["10.0.0.10", "10.0.0.15", "192.168.29.1", "172.16.1.5"]


def main():
    parser = argparse.ArgumentParser(description="NEXUS NIDS Multi-Vector Threat Simulator")
    parser.add_argument("--owner", default=DEFAULT_OWNER, help="Target user email to receive alerts")
    args = parser.parse_args()

    owner_email = args.owner.strip().lower()
    sensor_key = os.environ["NEXUS_SENSOR_KEY"].strip()
    session = requests.Session()
    session.headers.update({"X-Sensor-Key": sensor_key})

    print("==========================================================")
    print("  NEXUS NIDS - Multi-Vector Threat Traffic Simulator")
    print("==========================================================")
    print(f"[+] Target Endpoint : {INGEST_URL}")
    print(f"[+] Target Account  : {owner_email}")
    print("[+] Press Ctrl+C to stop.\n")

    count = 0
    try:
        while True:
            scenario = random.choice(ATTACK_WAVES)
            src_ip = random.choice(EXTERNAL_ATTACKERS)
            dest_ip = random.choice(INTERNAL_TARGETS)

            payload = {
                "simulated": True,
                "event_type": scenario["event_type"],
                "severity": scenario["severity"],
                "rule_id": scenario["rule_id"],
                "source_ip": src_ip,
                "destination_ip": dest_ip,
                "source_port": random.randint(49152, 65535),
                "destination_port": scenario["dest_port"],
                "protocol": scenario["protocol"],
                "description": scenario["description"],
            }

            try:
                res = session.post(INGEST_URL, json=payload, timeout=2.0)
                if res.status_code in (200, 201):
                    count += 1
                    print(
                        f"[SIM #{count}] [{owner_email}] [{scenario['severity'].upper():<8}] "
                        f"{scenario['event_type']:<30} | {src_ip} -> {dest_ip}:{scenario['dest_port']}"
                    )
                else:
                    print(f"[-] HTTP {res.status_code}: {res.text}")
            except requests.exceptions.RequestException as e:
                print(f"[-] Connection Error: {e}")
                time.sleep(2.0)

            time.sleep(random.uniform(0.3, 1.1))

    except KeyboardInterrupt:
        print(f"\n[+] Simulation stopped cleanly. Total events streamed: {count}")


if __name__ == "__main__":
    main()
