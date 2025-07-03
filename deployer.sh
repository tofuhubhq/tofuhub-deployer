#!/bin/bash

set -e

echo "📦 Starting Tofuhub bootstrap..."

### 1. Install Docker ###
echo "🐳 Installing Docker..."

apt update -y
apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker
systemctl enable docker
systemctl start docker

echo "✅ Docker installed."


### 2. Install Docker Compose CLI ###
echo "🔧 Installing Docker Compose CLI wrapper..."

ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

# Test version
docker compose version || docker-compose version

echo "✅ Docker Compose ready."


### 3. Install Ollama ###
echo "🦙 Installing Ollama..."

curl -fsSL https://ollama.com/install.sh | bash

echo "✅ Ollama installed."


### 4. Test Installation ###
echo "🧪 Verifying installation..."

docker --version
docker compose version || docker-compose version
ollama --version || echo "ℹ️ Ollama version check skipped"

echo "🏁 Bootstrap completed successfully!"
