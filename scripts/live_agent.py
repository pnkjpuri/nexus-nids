import time
import requests
from scapy.all import sniff, IP, TCP, UDP, ICMP

INGEST_URL = "http://localhost:8000/api/v1/ingest"

# Suspicious port signature mappings
SUSPICIOUS_PORTS = {
    22: ("SSH Connection Activity", "low"),
    80: ("HTTP Web Traffic", "low"),
    443: ("HTTPS Encrypted Traffic", "low"),
    3389: ("RDP Remote Desktop Connection", "medium"),
    445: ("SMB Directory Share Request", "medium"),
    8000: ("NEXUS API Endpoint Call", "low"),
    3000: ("NEXUS Dashboard UI Call", "low")
}

def analyze_packet(packet):
    if not packet.haslayer(IP):
        return

    src_ip = packet[IP].src
    dest_ip = packet[IP].dst
    protocol = "OTHER"
    src_port = None
    dest_port = None

    if packet.haslayer(TCP):
        protocol = "TCP"
        src_port = packet[TCP].sport
        dest_port = packet[TCP].dport
    elif packet.haslayer(UDP):
        protocol = "UDP"
        src_port = packet[UDP].sport
        dest_port = packet[UDP].dport
    elif packet.haslayer(ICMP):
        protocol = "ICMP"

    # Identify attack type or traffic signature
    event_type = "Network Packet Activity"
    severity = "low"
    description = f"Live packet captured between {src_ip} and {dest_ip}"

    # Simple heuristic checks for live demonstration
    if dest_port in SUSPICIOUS_PORTS:
        event_type, severity = SUSPICIOUS_PORTS[dest_port]
    elif protocol == "ICMP":
        event_type = "ICMP Ping Scan / Probe"
        severity = "medium"

    payload = {
        "event_type": event_type,
        "severity": severity,
        "source_ip": src_ip,
        "destination_ip": dest_ip,
        "source_port": src_port,
        "destination_port": dest_port,
        "protocol": protocol,
        "description": description,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    try:
        response = requests.post(INGEST_URL, json=payload, timeout=2)
        if response.status_code in [200, 201]:
            print(f"[+] Captured Live Packet: {event_type} [{src_ip}:{src_port} -> {dest_ip}:{dest_port}]")
    except Exception as e:
        print(f"[-] Ingestion Error: {e}")

if __name__ == "__main__":
    print(f"[+] Starting NEXUS Real-Time Host Sniffer Agent...")
    print(f"[+] Target Ingestion Endpoint: {INGEST_URL}")
    print("[+] Monitoring interface packets... Press Ctrl+C to stop.")
    
    # Sniff network interface packets continuously
    sniff(prn=analyze_packet, store=False)