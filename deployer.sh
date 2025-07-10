#!/bin/bash

# ⚠️ Replace this with secure retrieval method in production
TOFUHUB_API_TOKEN_VAR=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbHRuanJyemttYXp2YnJxYmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3ODk1NzcsImV4cCI6MjA1MjM2NTU3N30.2iz-ErTvlZ_o8rvYfFWWhlbo6RRTE0FWFlk7vQQkETg

set -euxo pipefail

export HOME="${HOME:-/root}"
export DEBIAN_FRONTEND=noninteractive

echo "📦 Starting Tofuhub bootstrap (optimized)..."

ufw disable || true

# Save token securely
echo "TOFUHUB_API_TOKEN=$TOFUHUB_API_TOKEN_VAR" > /etc/tofuhub.env
chmod 600 /etc/tofuhub.env

# 🔐 Fast self-signed cert with ECC
echo "🔐 Generating self-signed cert..."
mkdir -p /etc/tofuhub/certs
openssl req -x509 -nodes -days 365 \
  -newkey ec:<(openssl ecparam -name prime256v1) \
  -keyout /etc/tofuhub/certs/key.pem \
  -out /etc/tofuhub/certs/cert.pem \
  -subj "/CN=localhost"

# 🐳 Wait for Docker
echo "🔍 Verifying Docker is running..."
until docker info >/dev/null 2>&1; do
  echo "⏳ Waiting for Docker..."
  sleep 1
done
echo "✅ Docker is ready."

# 🚀 Start Ollama install in background
echo "🦙 Installing Ollama in background..."
curl -fsSL https://ollama.com/install.sh | bash &

# 📦 Install Node.js via binary (much faster than apt)
echo "📦 Installing Node.js via binary..."
NODE_VERSION=20.14.0
curl -fsSL https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz | tar -xJ -C /usr/local --strip-components=1
node -v
npm -v
echo "✅ Node.js installed."

# 📥 Clone Deployer repo (shallow)
echo "📥 Cloning Tofuhub Deployer..."
git clone --depth=1 https://github.com/tofuhubhq/tofuhub-deployer.git /tofuhub-deployer
cd /tofuhub-deployer

echo "📂 Installing Deployer dependencies..."
npm install || echo "⚠️ npm install failed (may be cached)"

# 🧩 Create systemd unit
echo "🧩 Creating systemd service..."
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

# 🧪 Verify key components
docker --version
docker compose version || docker-compose version
ollama --version || echo "⚠️ Ollama not ready yet"

# 🛠️ Start Ollama and poll for availability
echo "🛠️ Starting Ollama..."
nohup ollama serve > /var/log/ollama.log 2>&1 &

echo "⏳ Waiting for Ollama to become available..."
for i in {1..15}; do
  if curl -s http://localhost:11434 > /dev/null; then
    echo "✅ Ollama is ready."
    break
  fi
  sleep 1
done

# 🦙 Run llama3 model in background (non-blocking)
echo "🚀 Pulling llama3 model in background..."
nohup ollama run llama3 > /var/log/ollama-llama3.log 2>&1 &

echo "✅ Bootstrap complete (llama3 model will load in background)."
