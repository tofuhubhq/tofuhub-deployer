import {
  checkDropletNameExists,
  checkProjectNameExists,
  checkVolumeNameExists,
  checkDomainExists,
  checkDNSRecordExists,
  checkDatabaseClusterExists,
  checkAppNameExists,
  checkFirewallNameExists,
  checkLoadBalancerNameExists,
  checkVPCNameExists
} from "./digitalocean.js";

import fs from "fs";
import path from "path";

const PRIMITIVES = [
  "domain",
  "access_token",
  "project",
  "project_description",
  "vpc",
  "region",
  "database",
  "database_engine",
  "database_version",
  "size",
  "count",
  "image",
  "username",
  "password",
  "file_path",
  "ssh_key_name"
];

const PRIMARY_PRIMITIVES = PRIMITIVES.filter(prim => ['project', 'droplet', 'vpc', 'domain', 'database'].includes(prim))

const checkerMap = {
  droplet: checkDropletNameExists,
  project: checkProjectNameExists,
  volume: checkVolumeNameExists,
  domain: checkDomainExists,
  dns_record: checkDNSRecordExists,
  database: checkDatabaseClusterExists,
  app: checkAppNameExists,
  firewall: checkFirewallNameExists,
  load_balancer: checkLoadBalancerNameExists,
  vpc: checkVPCNameExists,
};

export async function checkCollisions(inputs) {
  // const config = JSON.parse(fs.readFileSync(TOFUHUB_CONFIG_PATH, "utf-8"));
  const config = {
    "name": "lorawan-postgres-redis-mosquitto-do",
    "version": "0.0.34",
    "description": "Deploys a full lorawan stack on DigitalOcean",
    "repository": "https://github.com/tofuhubhq/lorawan-postgres-redis-mosquitto-do.git",
    "commit": "1a5045b6ac065cbade6e705c2e74b4b87c08b559",
    "homepage": "https://tofuhub.co",
    "author": "Tommaso Girotto",
    "tags": ["lorawan", "iot", "postgres", "valkey"],
    "license": "MIT",
    "type": "package",
    "inputs": {
      "do_domain": {
        "type": "string",
        "required": false,
        "default": "",
        "description": "DigitalOcean domain",
        "primitive": "domain",
        "provider": "digitalocean"
      },
      "do_access_token": {
        "type": "string",
        "required": false,
        "default": "",
        "description": "DigitalOcean access token",
        "primitive": "access_token",
        "provider": "digitalocean",
        "secret": true
      },
      "do_project_name": {
        "type": "string",
        "required": false,
        "default": "",
        "description": "DigitalOcean project name",
        "primitive": "project",
        "provider": "digitalocean"
      },
      "do_project_description": {
        "type": "string",
        "required": false,
        "default": "",
        "description": "DigitalOcean project description",
        "primitive": "project_description",
        "provider": "digitalocean"
      },
      "do_vpc_name": {
        "type": "string",
        "required": true,
        "description": "DigitalOcean VPC name",
        "primitive": "vpc",
        "provider": "digitalocean"
      },
      "do_vpc_region": {
        "type": "string",
        "required": true,
        "description": "DigitalOcean VPC region",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "do_ssh_firewall_name": {
        "type": "string",
        "required": true,
        "description": "Firewall name for SSH access",
        "primitive": "firewall",
        "provider": "digitalocean"
      },
      "do_db_name": {
        "type": "string",
        "required": true,
        "description": "Database name",
        "primitive": "database",
        "provider": "digitalocean"
      },
      "do_db_engine": {
        "type": "string",
        "required": true,
        "description": "Database engine",
        "primitive": "database_engine",
        "provider": "digitalocean"
      },
      "do_db_version": {
        "type": "string",
        "required": true,
        "description": "Database version",
        "primitive": "database_version",
        "provider": "digitalocean"
      },
      "do_db_size": {
        "type": "string",
        "required": true,
        "description": "Database size",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "do_db_region": {
        "type": "string",
        "required": true,
        "description": "Database region",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "do_db_node_count": {
        "type": "number",
        "required": true,
        "description": "Number of database nodes",
        "primitive": "count",
        "provider": "digitalocean"
      },
      "do_mosquitto_name": {
        "type": "string",
        "required": true,
        "description": "Name for the Mosquitto droplet",
        "primitive": "name",
        "provider": "digitalocean"
      },
      "do_mosquitto_firewall_name": {
        "type": "string",
        "required": true,
        "description": "Firewall name for Mosquitto",
        "primitive": "firewall",
        "provider": "digitalocean"
      },
      "do_mosquitto_region": {
        "type": "string",
        "required": true,
        "description": "Mosquitto region",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "do_mosquitto_image": {
        "type": "string",
        "required": true,
        "description": "Image for Mosquitto droplet",
        "primitive": "image",
        "provider": "digitalocean"
      },
      "do_mosquitto_size": {
        "type": "string",
        "required": true,
        "description": "Size of Mosquitto droplet",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "do_mosquitto_username": {
        "type": "string",
        "required": true,
        "description": "Mosquitto username",
        "primitive": "username",
        "provider": "digitalocean"
      },
      "do_mosquitto_password": {
        "type": "string",
        "required": true,
        "description": "Mosquitto password",
        "primitive": "password",
        "provider": "digitalocean",
        "secret": true
      },
      "do_chirpstack_droplet_count": {
        "type": "number",
        "required": true,
        "description": "Number of ChirpStack droplets",
        "primitive": "count",
        "provider": "digitalocean"
      },
      "do_chirpstack_droplet_size": {
        "type": "string",
        "required": true,
        "description": "ChirpStack droplet size",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "do_chirpstack_droplet_image": {
        "type": "string",
        "required": true,
        "description": "ChirpStack image",
        "primitive": "image",
        "provider": "digitalocean"
      },
      "do_chirpstack_droplet_region": {
        "type": "string",
        "required": true,
        "description": "ChirpStack region",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "do_chirpstack_firewall_name": {
        "type": "string",
        "required": true,
        "description": "Firewall name for Chirpstack",
        "primitive": "firewall",
        "provider": "digitalocean"
      },
      "redis_droplet_name": {
        "type": "string",
        "required": true,
        "default": "redis",
        "description": "Name for Redis droplet",
        "primitive": "name",
        "provider": "digitalocean"
      },
      "redis_droplet_size": {
        "type": "string",
        "required": true,
        "default": "s-1vcpu-1gb",
        "description": "Size for Redis droplet",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "redis_droplet_image": {
        "type": "string",
        "required": true,
        "default": "ubuntu-22-04-x64",
        "description": "Image for Redis droplet",
        "primitive": "image",
        "provider": "digitalocean"
      },
      "redis_region": {
        "type": "string",
        "required": true,
        "description": "Region for Redis droplet",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "redis_password": {
        "type": "string",
        "required": true,
        "description": "Password for Redis",
        "primitive": "password",
        "provider": "digitalocean",
        "secret": true
      },
      "do_loadbalancer_name": {
        "type": "string",
        "required": true,
        "description": "Name of the load balancer",
        "primitive": "name",
        "provider": "digitalocean"
      },
      "do_ssh_key_name": {
        "type": "string",
        "required": true,
        "description": "SSH key name",
        "primitive": "ssh_key_name",
        "provider": "digitalocean"
      },
      "private_key_path": {
        "type": "string",
        "required": false,
        "default": "~/.ssh/id_rsa",
        "description": "Path to your private SSH key",
        "primitive": "file_path",
        "provider": "digitalocean"
      }
    }
  }  
  
  const schemaInputs = config.inputs || {};

  const found = Object.entries(schemaInputs).find(([key, value]) => value.primitive === 'access_token' && value.provider === 'digitalocean')

  if (!found.length) return;
  
  const token = inputs[found[0]] 

  // const token = inputs.do_access_token;
  if (!token) {
    throw new Error("Missing 'do_access_token' in inputs");
  }

  const results = {};

  for (const [key, value] of Object.entries(inputs)) {
    const inputDef = schemaInputs[key];

    if (!inputDef) {
      results[key] = { exists: false };
      continue;
    }

    const { provider, primitive } = inputDef;
    
    if (provider !== "digitalocean" || !PRIMARY_PRIMITIVES.includes(primitive)) {
      results[key] = { exists: false };
      continue; // unsupported provider
    }

    const checkerFn = checkerMap[primitive];
    if (!checkerFn) {
      console.warn(`No checker function defined for resource type: ${primitive}`);
      continue;
    }

    try {
      const exists = await checkerFn(value, token);
      results[key] = exists
        ? { exists: true, message: `Resource already exists: ${value}` }
        : { exists: false };
    } catch (err) {
      results[key] = { error: true, message: err.message };
    }
  }

  return results;
}