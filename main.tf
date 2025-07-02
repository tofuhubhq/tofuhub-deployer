variable "do_access_token" {
  type        = string
  description = "Digital Ocean access token"
}

variable "do_region" {
  type        = string
  default     = "nyc2"
  description = "Region for the droplet"
}

variable "do_size" {
  type        = string
  default     = "s-8vcpu-16gb"
  description = "Droplet size"
}

provider "digitalocean" {
  token = var.do_access_token
}

resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "digitalocean_ssh_key" "generated_key" {
  name      = "tofuhub-temp-key"
  public_key = tls_private_key.ssh_key.public_key_openssh
}

resource "digitalocean_droplet" "runner" {
  name              = "tofuhub-runner"
  region            = var.do_region
  size              = var.do_size
  image             = "ubuntu-22-04-x64"
  ssh_keys          = [digitalocean_ssh_key.generated_key.id]
  backups           = false
  ipv6              = false
  monitoring        = false
  tags              = ["tofuhub"]

  connection {
    host        = self.ipv4_address
    type        = "ssh"
    user        = "root"
    private_key = tls_private_key.ssh_key.private_key_pem
    timeout     = "2m"
  }

    provisioner "remote-exec" {
    inline = [
      # Wait for apt lock
      "while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do echo 'Waiting for apt lock...'; sleep 1; done",

      # Update and install Docker + curl
      "apt-get update -y",
      "apt-get install -y docker.io curl",

      # Start Docker
      "systemctl enable docker",
      "systemctl start docker",

      # Optional: UFW rules for runner and Ollama
      "ufw allow 3030",
      "ufw allow 11434",
      "ufw --force enable",

      # Install Ollama
      "curl -fsSL https://ollama.com/install.sh | sh",

      # Preload a model
      "ollama pull llama3",

      # Start Ollama server in background
      "nohup ollama serve > /var/log/ollama.log 2>&1 &",

      # Pull the runner container
      "docker pull tofuhub/cli-runner:v0.0.1",

      # Run the runner
      "docker run -d --name tofuhub-runner -p 3030:3030 tofuhub/cli-runner:v0.0.1"
    ]
  }
}

resource "digitalocean_firewall" "tofuhub_runner" {
  name = "tofuhub-runner-fw"

  droplet_ids = [digitalocean_droplet.runner.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "3030"
    source_addresses = ["0.0.0.0/0"]
  }

  outbound_rule {
    protocol         = "tcp"
    port_range       = "all"
    destination_addresses = ["0.0.0.0/0"]
  }

  outbound_rule {
    protocol         = "udp"
    port_range       = "all"
    destination_addresses = ["0.0.0.0/0"]
  }
}
