#!/usr/bin/env python3
"""
setup_and_run.py

Cross-platform orchestrator to set up environment variables and start the
Real Estate CRM system using Docker Compose.

It detects the operating system (Windows or Linux/Mac), kills interfering processes,
and runs the appropriate helper scripts.
"""

import os
import sys
import platform
import subprocess
import time

PORTS_TO_KILL = [3000, 3001, 5000, 5433, 6383, 8000, 8001, 8002, 8003, 8004]

REQUIRED_IMAGES = [
    "python:3.11-slim",
    "node:20",
    "node:20-alpine",
    "ankane/pgvector:v0.5.1",
    "redis:7-alpine"
]

def run_command(command, shell=False, check=True):
    """Run a system command and print output."""
    try:
        print(f"Executing: {' '.join(command) if isinstance(command, list) else command}")
        subprocess.run(command, shell=shell, check=check)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error executing command: {e}")
        # Don't exit on errors during killing/pulling (best effort)
        if "kill" not in str(command) and "pull" not in str(command) and "Setup" not in str(command): 
            sys.exit(1)
    except OSError as e:
        print(f"❌ OS Error: {e}")
        sys.exit(1)

def pull_images():
    """Pre-pull required Docker images to avoid build timeouts."""
    print("\n⬇️  Pre-pulling Docker images...")
    for image in REQUIRED_IMAGES:
        print(f"   Pulling {image}...")
        try:
            subprocess.run(["docker", "pull", image], check=True)
        except subprocess.CalledProcessError:
             print(f"⚠️  Failed to pull {image}. Build might fail if not cached.")
        except FileNotFoundError:
            print("⚠️  Docker command not found. Skipping image pull.")

def kill_processes_on_ports():
    """Kill processes running on required ports."""
    system = platform.system()
    print(f"\n🧹 Cleaning up ports: {PORTS_TO_KILL}...")

    if system == "Windows":
        for port in PORTS_TO_KILL:
            command = f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force }}"
            try:
                subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-Command", command], check=False)
            except Exception:
                pass # Ignore if port is free
    else:
        # Linux/Mac
        for port in PORTS_TO_KILL:
            try:
                # use fuser to find and kill
                subprocess.run(["fuser", "-k", f"{port}/tcp"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL, check=False)
            except Exception:
                pass
    
    time.sleep(1) # Give OS a moment to release ports
    print("✅ Ports processed.")


import argparse

def get_api_key(cli_key=None):
    """Get Cohere API Key from CLI argument or prompt user."""
    if cli_key:
        print(f"🔑 Using API Key provided via command line.")
        return cli_key

    print("\n🔑 API Key Configuration")
    print("--------------------------------------------------")
    print("Please enter your Cohere API Key to configure the AI services.")
    print("If you don't have one, press Enter to use a placeholder (AI features may fail).")
    api_key = input("Cohere API Key: ").strip()
    if not api_key:
        print("⚠️  No API key provided. Using placeholder.")
        return "placeholder_key"
    print("✅ API Key received.")
    return api_key

def get_gemini_api_key(cli_key=None):
    """Get Gemini API Key from CLI argument or prompt user."""
    if cli_key:
        print(f"🔑 Using Gemini API Key provided via command line.")
        return cli_key

    print("\n🔑 Google/Gemini API Key Configuration")
    print("--------------------------------------------------")
    print("Please enter your Google (Gemini) API Key (Optional).")
    print("Press Enter to skip if you don't have one.")
    api_key = input("Gemini API Key (Optional): ").strip()
    if not api_key:
        print("ℹ️  Skipping Gemini API Key. Using placeholder.")
        return "placeholder_key"
    print("✅ API Key received.")
    return api_key

def main():
    parser = argparse.ArgumentParser(description="Setup and Run Real Estate CRM")
    parser.add_argument("--api-key", help="Cohere API Key", default=None)
    parser.add_argument("--gemini-api-key", help="Google/Gemini API Key", default=None)
    args = parser.parse_args()

    system = platform.system()
    print(f"🖥️  Detected OS: {system}")

    cwd = os.getcwd()
    print(f"📂 Working Directory: {cwd}")

    # 0. Kill existing processes
    kill_processes_on_ports()
    
    # 0.5. Pre-pull images
    pull_images()

    # 0.6 Get API Keys
    cohere_api_key = get_api_key(args.api_key)
    gemini_api_key = get_gemini_api_key(args.gemini_api_key)

    if system == "Windows":
        run_command(["powershell", "-ExecutionPolicy", "Bypass", "-Command", "chmod +x ./setup_envs.ps1"])
        print("\n--- Step 1: Setting up Environment Variables ---")
        # Pass API keys as arguments
        run_command(["powershell", "-ExecutionPolicy", "Bypass", "-File", ".\\setup_envs.ps1", "-CohereApiKey", cohere_api_key, "-GeminiApiKey", gemini_api_key])
    else:
        run_command(["chmod", "+x", "./setup_envs.sh"])
        print("\n--- Step 1: Setting up Environment Variables ---")
        # Pass API keys as arguments
        run_command(["./setup_envs.sh", cohere_api_key, gemini_api_key])

    # 2. Sequential Build (critical for stability)
    print("\n--- Step 2: Building Services Sequentially ---")
    services = [
        "embedding",
        "customer_chatbot", 
        "broker_chatbot",
        "broker_interviewer",
        "whatsApp_api",
        "backend", 
        "frontend"
    ]
    
    for service in services:
        print(f"\n🔨 Building {service}...")
        try:
           # Explicitly build one by one
           run_command(["docker", "compose", "build", service])
        except Exception as e:
            print(f"❌ Failed to build {service}: {e}")
            sys.exit(1)

    # 3. Start Docker Containers
    print("\n--- Step 3: Starting Docker Containers ---")
    if system == "Windows":
        run_command(["powershell", "-ExecutionPolicy", "Bypass", "-Command", "chmod +x ./run_docker.ps1"])
        # We use --no-build because we already built them
        run_command(["docker", "compose", "up", "--no-build"]) 
    else:
        run_command(["chmod", "+x", "./run_docker.sh"])
        # Override run_docker.sh to just run without build, or just call run_docker.sh which has COMPOSE_PARALLEL_LIMIT set
        # But run_docker.sh has --build flag. We should just run docker compose directly here or modify run_docker.
        # It is cleaner to just run docker compose up here directly like we did for build.
        run_command(["docker", "compose", "up", "--no-build"])

    # Script technically ends here for the python process, but the subprocess 
    # running docker compose will keep running attached to stdout until user stops it.
    print("\n✅ Setup and Run Sequence logic finished.")

if __name__ == "__main__":
    main()
