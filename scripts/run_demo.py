import time
import subprocess
import requests
import sys

BACKEND_URL = "http://localhost:8000/health"
GENERATOR_SCRIPT = "scripts/generate_synthetic_events.py"

def check_backend_readiness(retries=15, delay=2):
    print("[*] Waiting for NEXUS NIDS Backend to be ready...")
    for i in range(retries):
        try:
            res = requests.get(BACKEND_URL, timeout=3)
            if res.status_code == 200:
                print("[+] Backend is UP and Healthy!")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(delay)
    return False

def main():
    print("==================================================")
    print("      NEXUS NIDS — Master Demonstration Runner     ")
    print("==================================================")

    # Check backend readiness
    if not check_backend_readiness():
        print("[!] Backend is not reachable on http://localhost:8000. Ensure Docker containers are running.")
        sys.exit(1)

    # Stream synthetic security events into database
    print("\n[*] Seeding initial security threat events...")
    try:
        subprocess.run([sys.executable, GENERATOR_SCRIPT], check=True)
    except subprocess.CalledProcessError as e:
        print(f"[!] Error running event generator: {e}")
        sys.exit(1)

    print("\n==================================================")
    print("   NEXUS NIDS Demo Environment Ready!")
    print("   - Web Dashboard:    http://localhost:3000")
    print("   - OpenAPI Docs:     http://localhost:8000/docs")
    print("   - Health Check:     http://localhost:8000/health")
    print("==================================================")

if __name__ == "__main__":
    main()