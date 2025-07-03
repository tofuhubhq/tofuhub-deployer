#!/bin/bash

set -euxo pipefail

export HOME="${HOME:-/root}"
echo "📦 Starting Tofuhub bootstrap (non-interactive mode)..."

export DEBIAN_FRONTEND=noninteractive

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

### 4. Test Everything ###
echo "🧪 Verifying installation..."

docker --version
docker compose version || docker-compose version
ollama --version || echo "⚠️ Ollama version check skipped (likely needs shell reload)"

### 5. Start Ollama server and load llama3 ###
echo "🛠️ Starting Ollama server in background..."
nohup ollama serve > /var/log/ollama.log 2>&1 &

echo "⏳ Waiting for Ollama server to become available..."
until curl -s http://localhost:11434 > /dev/null; do
  sleep 1
done
echo "✅ Ollama server is up!"

echo "🚀 Pulling llama3 model..."
ollama run llama3 || echo "⚠️ Model load failed"
