import os
import subprocess
from setuptools import setup
from setuptools.command.develop import develop
from setuptools.command.install import install

def build_node_app():
    print("==> [BUILD PHASE] Executing npm install && npm run build...")
    try:
        subprocess.run(["npm", "install"], check=True)
        subprocess.run(["npm", "run", "build"], check=True)
    except Exception as e:
        print(f"==> Build phase error: {e}")

class CustomDevelopCommand(develop):
    def run(self):
        build_node_app()
        develop.run(self)

class CustomInstallCommand(install):
    def run(self):
        build_node_app()
        install.run(self)

setup(
    name="realwin",
    version="1.0.0",
    py_modules=["server"],
    cmdclass={
        'develop': CustomDevelopCommand,
        'install': CustomInstallCommand,
    },
)
