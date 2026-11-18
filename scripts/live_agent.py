import os
import sys
import time
import queue
import argparse
import threading
from collections import defaultdict
import requests
from scapy.all import sniff, IP, TCP, UDP, ICMP, conf

INGEST_URL = "http://localhost:8000/api/v1/ingest"
DEFAULT_OWNER = os.getenv("NEXUS_OWNER_EMAIL", "pankajpuri761@gmail.com")

event_queue = queue.Queue(maxsize=2000)
ip_packet_tracker = defaultdict(list)
ip_port_tracker = defaultdict(set)

SUSPICIOUS_PORTS = {
    21: ("FTP Cleartext Traffic", "medium", "T1071.002"),
    22: ("SSH Connection Attempt", "medium", "T1021.004"),
    23: ("Insecure Telnet Traffic Detected", "high", "T1021"),
    445: ("SMB Lateral Movement Probe", "high", "T1021.002"),
    3389: ("RDP Remote Access Session", "high", "T1021.001"),
    4444: ("Metasploit Default Reverse Shell Port", "critical", "T1059"),
    6667: ("IRC Botnet C2 Channel Signature", "critical", "T1071"),
}


def classify_packet(pkt):
    """Inspect IP/TCP/UDP/ICMP headers and classify threat severity."""
    if not pkt.haslayer(IP):
        return None

    ip_layer = pkt[IP]
    src_ip = ip_layer.src
    dest_ip = ip_layer.dst

    if src_ip == "127.0.0.1" and dest_ip == "127.0.0.1":
        return None

    now = time.time()
    ip_packet_tracker[src_ip] = [t for t in ip_packet_tracker[src_ip] if now - t < 5.0]
    ip_packet_tracker[src_ip].append(now)

    src_port = 0
    dest_port = 0
    protocol = "IP"
    event_type = "Normal Network Flow"
    severity = "low"
    rule_id = "NIDS-BASE-001"
    description = f"Standard IPv4 traffic {src_ip} -> {dest_ip}"

    if pkt.haslayer(TCP):
        tcp = pkt[TCP]
        src_port = int(tcp.sport)
        dest_port = int(tcp.dport)
        protocol = "TCP"

        ip_port_tracker[src_ip].add(dest_port)

        if len(ip_port_tracker[src_ip]) > 12:
            event_type = "TCP Port Scan Detected"
            severity = "high"
            rule_id = "NIDS-SCAN-104"
            description = f"Host {src_ip} probed {len(ip_port_tracker[src_ip])} distinct ports"
            ip_port_tracker[src_ip].clear()

        elif len(ip_packet_tracker[src_ip]) > 40 and tcp.flags == "S":
            event_type = "SYN Flood Burst Anomaly"
            severity = "critical"
            rule_id = "NIDS-DOS-201"
            description = f"High-frequency SYN packets from {src_ip} targeting port {dest_port}"

        elif dest_port in SUSPICIOUS_PORTS or src_port in SUSPICIOUS_PORTS:
            port_hit = dest_port if dest_port in SUSPICIOUS_PORTS else src_port
            event_type, severity, rule_id = SUSPICIOUS_PORTS[port_hit]
            description = f"{event_type} on port {port_hit} ({src_ip} -> {dest_ip})"

        elif dest_port == 443 or src_port == 443:
            event_type = "HTTPS Encrypted Session"
            severity = "low"
            rule_id = "NIDS-TLS-010"
            description = f"TLS encrypted flow {src_ip}:{src_port} -> {dest_ip}:{dest_port}"
        elif dest_port == 80 or src_port == 80:
            event_type = "HTTP Unencrypted Web Traffic"
            severity = "medium"
            rule_id = "NIDS-HTTP-011"
            description = f"Cleartext HTTP request {src_ip}:{src_port} -> {dest_ip}:{dest_port}"

    elif pkt.haslayer(UDP):
        udp = pkt[UDP]
        src_port = int(udp.sport)
        dest_port = int(udp.dport)
        protocol = "UDP"

        if dest_port == 53 or src_port == 53:
            if len(pkt) > 250:
                event_type = "Suspicious Large DNS Payload (Tunneling)"
                severity = "high"
                rule_id = "NIDS-DNS-302"
                description = f"Oversized DNS packet ({len(pkt)} bytes) between {src_ip} and {dest_ip}"
            else:
                event_type = "DNS Resolution Query"
                severity = "low"
                rule_id = "NIDS-DNS-005"
                description = f"Standard DNS lookup {src_ip} -> {dest_ip}"
        else:
            event_type = "UDP Datagram Flow"
            severity = "low"
            rule_id = "NIDS-UDP-002"

    elif pkt.haslayer(ICMP):
        protocol = "ICMP"
        if len(ip_packet_tracker[src_ip]) > 15:
            event_type = "ICMP Ping Flood / Sweep"
            severity = "high"
            rule_id = "NIDS-ICMP-109"
            description = f"Rapid ICMP echo requests from {src_ip}"
        else:
            event_type = "ICMP Echo / Control Packet"
            severity = "low"
            rule_id = "NIDS-ICMP-003"

    return {
        "event_type": event_type,
        "severity": severity,
        "source_ip": src_ip,
        "destination_ip": dest_ip,
        "source_port": src_port,
        "destination_port": dest_port,
        "protocol": protocol,
        "rule_id": rule_id,
        "description": description,
    }


def packet_callback(pkt):
    alert_payload = classify_packet(pkt)
    if alert_payload and not event_queue.full():
        event_queue.put(alert_payload)


def ingestion_worker(session: requests.Session, owner_email: str):
    """Background worker draining the queue and posting to FastAPI scoped to owner_email."""
    sent_count = 0
    while True:
        try:
            payload = event_queue.get(timeout=1.0)
            payload["owner_email"] = owner_email
            res = session.post(INGEST_URL, json=payload, timeout=2.0)
            if res.status_code in (200, 201):
                sent_count += 1
                sev = payload["severity"].upper()
                print(
                    f"[LIVE #{sent_count}] [{owner_email}] [{sev}] {payload['event_type']} | "
                    f"{payload['source_ip']}:{payload['source_port']} -> "
                    f"{payload['destination_ip']}:{payload['destination_port']}"
                )
            event_queue.task_done()
        except queue.Empty:
            continue
        except requests.exceptions.RequestException as e:
            print(f"[!] Backend unreachable ({e}). Retrying...")
            time.sleep(2.0)


def main():
    parser = argparse.ArgumentParser(description="NEXUS NIDS Live Host Packet Sniffer")
    parser.add_argument("--owner", default=DEFAULT_OWNER, help="Target user email to receive alerts")
    args = parser.parse_args()

    owner_email = args.owner.strip().lower()
    http_session = requests.Session()
    http_session.headers.update({"X-Owner-Email": owner_email})

    print("==========================================================")
    print("  NEXUS NIDS - Live Host Packet Sniffer & IDS Engine")
    print("==========================================================")
    print(f"[+] Active Interface : {conf.iface.name} ({conf.iface.ip})")
    print(f"[+] Target API       : {INGEST_URL}")
    print(f"[+] Target Account   : {owner_email}")
    print("[+] Press Ctrl+C to stop.\n")

    worker = threading.Thread(target=ingestion_worker, args=(http_session, owner_email), daemon=True)
    worker.start()

    try:
        sniff(prn=packet_callback, store=0, filter="ip")
    except PermissionError:
        print("\n[ERROR] Administrator privileges required to sniff raw sockets!")
        print("        Right-click PowerShell -> 'Run as Administrator' and run again.")
    except Exception as e:
        print(f"\n[ERROR] Packet capture failed: {e}")
        print("        Ensure Npcap (https://npcap.com) is installed with WinPcap API compatibility.")


if __name__ == "__main__":
    main()