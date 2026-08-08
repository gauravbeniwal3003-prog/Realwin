import os
import subprocess
import sys

if __name__ == "__main__":
    # Ensure Node modules are installed
    if not os.path.exists("node_modules"):
        print("==> Installing Node dependencies (npm install)...")
        subprocess.run(["npm", "install"], check=True)

    # Ensure project is compiled
    if not os.path.exists("dist/server.cjs"):
        print("==> Compiling application (npm run build)...")
        subprocess.run(["npm", "run", "build"], check=True)

    print("==> Starting Node server (npm start)...")
    os.execvp("npm", ["npm", "start"])
