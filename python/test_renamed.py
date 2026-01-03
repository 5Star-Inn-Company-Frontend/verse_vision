import sys
import os
import json
import time
import subprocess
import threading

# Path to offline_server.py
SERVER_PATH = os.path.join(os.path.dirname(__file__), 'offline_server.py')

def run_test():
    print("Starting offline_server.py...")
    process = subprocess.Popen(
        [sys.executable, SERVER_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )

    def read_stderr():
        for line in process.stderr:
            print(f"SERVER_LOG: {line.strip()}")
    
    t = threading.Thread(target=read_stderr, daemon=True)
    t.start()

    # Wait a bit for initialization (loading models/bibles)
    time.sleep(15) 

    try:
        # Test 1: NIV (now niv.json)
        print("\n--- Test 1: NIV ---")
        payload = {"command": "detect", "text": "John 3:16 NIV"}
        process.stdin.write(json.dumps(payload) + "\n")
        process.stdin.flush()
        
        output = process.stdout.readline()
        print(f"OUTPUT: {output.strip()}")
        
        # Test 2: GNT (now gnt.json)
        print("\n--- Test 2: GNT ---")
        payload = {"command": "detect", "text": "John 3:16 GOOD NEWS TRANSLATION"}
        process.stdin.write(json.dumps(payload) + "\n")
        process.stdin.flush()
        
        output = process.stdout.readline()
        print(f"OUTPUT: {output.strip()}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Closing server...")
        process.terminate()

if __name__ == "__main__":
    run_test()
