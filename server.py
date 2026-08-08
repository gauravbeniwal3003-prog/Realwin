import os

if __name__ == "__main__":
    # If Render service was created with Python environment in dashboard,
    # forward execution to Node.js application process (npm start)
    os.execvp("npm", ["npm", "start"])
