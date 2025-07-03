#!/bin/bash

TOFUHUB_API_TOKEN_VAR=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbHRuanJyemttYXp2YnJxYmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3ODk1NzcsImV4cCI6MjA1MjM2NTU3N30.2iz-ErTvlZ_o8rvYfFWWhlbo6RRTE0FWFlk7vQQkETg

set -euxo pipefail

export HOME="${HOME:-/root}"
echo "📦 Starting Tofuhub bootstrap (non-interactive mode)..."
echo TOFUHUB_API_TOKEN="$TOFUHUB_API_TOKEN_VAR" >> /etc/environment
export TOFUHUB_API_TOKEN="$TOFUHUB_API_TOKEN_VAR"

export DEBIAN_FRONTEND=noninteractive

echo "🔐 Generating self-signed cert..."

mkdir -p /etc/tofuhub/certs
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/tofuhub/certs/key.pem \
  -out /etc/tofuhub/certs/cert.pem \
  -subj "/CN=localhost"


### 4. Install Node.js and npm ###
echo "📦 Installing Node.js and npm..."

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "✅ Node.js and npm installed."
node -v
npm -v

### 5. Clone tofuhub-deployer repo ###
echo "📥 Cloning Tofuhub Deployer..."
git clone https://github.com/tofuhubhq/tofuhub-deployer.git
cd tofuhub-deployer

### 5. Run npm install in current directory ###
echo "📂 Running npm install in $(pwd)..."
npm install || echo "⚠️ npm install failed"

echo "🚀 Starting Tofuhub Deployer in background..."
nohup npm run start > /var/log/tofuhub-deployer.log 2>&1 &

### 1. Install Docker (via official script) ###
echo "🐳 Installing Docker from official script..."

curl -fsSL https://get.docker.com | sh

systemctl enable docker
systemctl start docker

echo "✅ Docker installed."

### 2. Docker Compose CLI Compatibility ###
echo "🔧 Ensuring Docker Compose CLI compatibility..."

# Handle edge case where plugin is not linked in $PATH
ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

docker compose version || docker-compose version

echo "✅ Docker Compose ready."

### 3. Install Ollama ###
echo "🦙 Installing Ollama..."

curl -fsSL https://ollama.com/install.sh | bash || echo "⚠️ Ollama install script may have exited nonzero"

echo "✅ Ollama installed (or attempted)."

### 6. Test Everything ###
echo "🧪 Verifying installation..."

docker --version
docker compose version || docker-compose version

ollama --version || echo "⚠️ Ollama version check skipped (likely needs shell reload)"

### 7. Start Ollama server and load llama3 ###
echo "🛠️ Starting Ollama server in background..."
nohup ollama serve > /var/log/ollama.log 2>&1 &

echo "⏳ Waiting for Ollama server to become available..."
until curl -s http://localhost:11434 > /dev/null; do
  sleep 1
done
echo "✅ Ollama server is up!"

echo "🚀 Pulling llama3 model..."
ollama run llama3 || echo "⚠️ Model load failed"
