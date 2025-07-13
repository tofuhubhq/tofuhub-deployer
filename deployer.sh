#!/bin/bash

TOFUHUB_API_TOKEN_VAR=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbHRuanJyemttYXp2YnJxYmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3ODk1NzcsImV4cCI6MjA1MjM2NTU3N30.2iz-ErTvlZ_o8rvYfFWWhlbo6RRTE0FWFlk7vQQkETg

set -euxo pipefail

export HOME="${HOME:-/root}"
export DEBIAN_FRONTEND=noninteractive

echo "📦 Starting Tofuhub bootstrap (non-interactive mode)..."

ufw disable

# Save token to a safe env file used by systemd
echo "TOFUHUB_API_TOKEN=$TOFUHUB_API_TOKEN_VAR" > /etc/tofuhub.env
chmod 600 /etc/tofuhub.env

echo "🔐 Generating self-signed cert..."
mkdir -p /etc/tofuhub/certs
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/tofuhub/certs/key.pem \
  -out /etc/tofuhub/certs/cert.pem \
  -subj "/CN=localhost"

echo "🔍 Verifying Docker is running..."
until docker info >/dev/null 2>&1; do
  echo "⏳ Docker not ready yet..."
  sleep 1
done
echo "✅ Docker is ready."

### Install Node.js and npm
echo "📦 Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v
npm -v
echo "✅ Node.js and npm installed."

### Clone and setup deployer
echo "📥 Cloning Tofuhub Deployer..."
git clone https://github.com/tofuhubhq/tofuhub-deployer.git /tofuhub-deployer
cd /tofuhub-deployer

echo "📂 Installing dependencies..."
npm install || echo "⚠️ npm install failed"

### ─────────────────────────────────────────────────────────────
### Build the Vue “console” app and copy its production bundle
### ─────────────────────────────────────────────────────────────

echo "🏗️  Building Vue console..."
CONSOLE_SRC_DIR="/tofuhub-deployer/console"
CONSOLE_DIST_DIR="$CONSOLE_SRC_DIR/dist"
STATIC_TARGET_DIR="/tofuhub-deployer/public"

# 1. Install the console’s deps (npm ci is reproducible & faster in CI)
cd "$CONSOLE_SRC_DIR"
npm ci

# 2. Build for production;  Vue-CLI: `npm run build`  •  Vite: `npm run build` too
# npm run build

echo "CONSOLE_SRC_DIR=$CONSOLE_SRC_DIR"
echo "CONSOLE_DIST_DIR=$CONSOLE_DIST_DIR"
echo "STATIC_TARGET_DIR=$STATIC_TARGET_DIR"

# 3. Move artefacts where the Fastify app expects them
echo "Removing public"
rm -rf "$STATIC_TARGET_DIR"
echo "Creating public"
mkdir -p "$STATIC_TARGET_DIR"
echo "Coping dist into public"
cp -r "$CONSOLE_DIST_DIR"/* "$STATIC_TARGET_DIR"

echo "✅ Vue console built and copied to $STATIC_TARGET_DIR"
### ─────────────────────────────────────────────────────────────

### Create systemd unit for Tofuhub Deployer
echo "🧩 Creating systemd service for Tofuhub Deployer..."

cat <<EOF > /etc/systemd/system/tofuhub-deployer.service
[Unit]
Description=Tofuhub Deployer
After=network.target docker.service

[Service]
WorkingDirectory=/tofuhub-deployer
ExecStart=/usr/bin/npm run start
Restart=always
EnvironmentFile=/etc/tofuhub.env
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
StandardOutput=append:/var/log/tofuhub-deployer.log
StandardError=append:/var/log/tofuhub-deployer.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tofuhub-deployer
systemctl start tofuhub-deployer

echo "🚀 Tofuhub Deployer service started."

### Install Ollama
#echo "🦙 Installing Ollama..."
#curl -fsSL https://ollama.com/install.sh | bash || echo "⚠️ Ollama install script may have exited nonzero"
#echo "✅ Ollama installed (or attempted)."

### Verify everything
echo "🧪 Verifying installation..."
docker --version
docker compose version || docker-compose version
#ollama --version || echo "⚠️ Ollama version check skipped"

### Start Ollama
#echo "🛠️ Starting Ollama server in background..."
#nohup ollama serve > /var/log/ollama.log 2>&1 &

#echo "⏳ Waiting for Ollama server to become available..."
#until curl -s http://localhost:11434 > /dev/null; do
#  sleep 1
#done
#echo "✅ Ollama server is up!"

#echo "🚀 Pulling llama3 model..."
#ollama run llama3 || echo "⚠️ Model load failed"
