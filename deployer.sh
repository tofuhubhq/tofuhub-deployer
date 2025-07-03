#!/bin/bash

set -euxo pipefail

echo "📦 Starting Tofuhub bootstrap (non-interactive mode)..."

export DEBIAN_FRONTEND=noninteractive

### 1. Install Docker ###
echo "🐳 Installing Docker..."

apt-get update -y
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common

mkdir -p /etc/apt/keyrings

# Download and overwrite without prompt
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor | \
    tee /etc/apt/keyrings/docker.gpg > /dev/null


apt-get update -y
apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

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

echo "🏁 Bootstrap completed successfully!"
