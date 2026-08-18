import os
import subprocess
import sys

print("=== Starting Realwin App Server Wrapper ===")

# Build Node bundle if dist/server.cjs does not exist
dist_file = os.path.join(os.path.dirname(__file__), "dist", "server.cjs")
if not os.path.exists(dist_file):
    print("Building Node distribution bundle...")
    try:
        subprocess.run(["npm", "install", "--include=dev"], check=True)
        subprocess.run(["npm", "run", "build"], check=True)
    except Exception as e:
        print(f"Build warning: {e}")

# Handover execution directly to Node.js / npm start
print("Launching Node.js server...")
sys.stdout.flush()
os.execvp("npm", ["npm", "start"])
