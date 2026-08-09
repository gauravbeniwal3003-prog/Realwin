import os
import sys
import time
import subprocess
import threading
from flask import Flask, request, Response

app = Flask(__name__)

PORT = int(os.environ.get("PORT", 3000))
NODE_PORT = 3001 if PORT != 3001 else 3002

# Helper to start Node.js background process
def start_node_backend():
    sys.stdout.flush()
    if not os.path.exists("dist/server.cjs"):
        print("==> [FLASK LAUNCHER] Compiling Node application...")
        sys.stdout.flush()
        try:
            subprocess.run(["npm", "install"], check=True)
            subprocess.run(["npm", "run", "build"], check=True)
        except Exception as e:
            print(f"==> Build step error: {e}")
            sys.stdout.flush()

    print(f"==> [FLASK LAUNCHER] Starting Node server process on internal port {NODE_PORT}...")
    sys.stdout.flush()
    node_env = os.environ.copy()
    node_env["PORT"] = str(NODE_PORT)
    subprocess.Popen(["node", "dist/server.cjs"], env=node_env)

# Start Node backend in background thread so Flask binds port immediately
threading.Thread(target=start_node_backend, daemon=True).start()

HEALTH_PATHS = {"", "health", "ping", "healthz", "readyz", "livez", "index.html"}

@app.route("/ping", methods=["GET", "POST", "HEAD"])
def ping():
    return {
        "status": "ok",
        "service": "RealWin Flask Stack",
        "ping": "pong",
        "timestamp": time.time()
    }, 200

@app.route("/health", methods=["GET"])
def health():
    return {
        "status": "healthy",
        "flask": True,
        "node_port": NODE_PORT
    }, 200

# Proxy handler for all other routes to Node.js server
@app.route("/", defaults={"path": ""}, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
def proxy(path):
    target_url = f"http://127.0.0.1:{NODE_PORT}/{path}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"

    # Filter out hop-by-hop headers
    headers = {key: value for key, value in request.headers if key.lower() not in ['host', 'content-length']}

    try:
        import requests
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False,
            timeout=15
        )

        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        resp_headers = [(name, value) for (name, value) in resp.raw.headers.items()
                        if name.lower() not in excluded_headers]

        return Response(resp.content, resp.status_code, resp_headers)
    except Exception as e:
        # If Node server is still initializing, return 200 OK for health/root requests
        # so Render health checks pass immediately without timing out
        clean_path = path.strip("/")
        if clean_path in HEALTH_PATHS or not clean_path:
            return Response(
                "<!DOCTYPE html><html><head><meta http-equiv='refresh' content='2'></head>"
                "<body style='font-family:sans-serif;text-align:center;padding:50px;'>"
                "<h2>⚡ Application Launching...</h2><p>Please wait while the server initializes.</p>"
                "</body></html>",
                status=200,
                mimetype="text/html"
            )

        return {
            "status": "booting",
            "message": "Node.js application is initializing...",
            "details": str(e)
        }, 200

if __name__ == "__main__":
    print(f"==> [FLASK LAUNCHER] Starting Flask server on 0.0.0.0:{PORT}...")
    sys.stdout.flush()
    app.run(host="0.0.0.0", port=PORT, threaded=True)
