import os
import subprocess
import sys

if __name__ == "__main__":
    sys.stdout.flush()
    # Fallback if dist/server.cjs was not generated during build phase
    if not os.path.exists("dist/server.cjs"):
        print("==> [STARTUP FALLBACK] Compiling Node application...")
        sys.stdout.flush()
        subprocess.run(["npm", "install"], check=True)
        subprocess.run(["npm", "run", "build"], check=True)

    print("==> [STARTUP] Launching Node.js application (node dist/server.cjs)...")
    sys.stdout.flush()
    os.execvp("node", ["node", "dist/server.cjs"])
