variable "do_access_token" {
  type        = string
  description = "Digital Ocean access token"
}

variable "do_region" {
  type        = string
  default     = "ams3"
  description = "Region for the droplet"
}

variable "do_size" {
  type        = string
  default     = "s-1vcpu-1gb"
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
      "apt-get update -y",
      "apt-get install -y docker.io",
      "systemctl enable docker",
      "systemctl start docker",
       # Optional: Allow traffic to port 3000 (or whatever your runner uses)
      "ufw allow 3030",

      # Pull the runner image
      "docker pull tofuhub/cli-runner:v0.0.1",

      # Run the runner in the background
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
