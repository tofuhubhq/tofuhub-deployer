#!/bin/bash

set -euxo pipefail

export HOME="${HOME:-/root}"
echo "📦 Starting Tofuhub bootstrap (non-interactive mode)..."

export DEBIAN_FRONTEND=noninteractive

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
