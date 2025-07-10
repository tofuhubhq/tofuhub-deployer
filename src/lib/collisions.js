import {
  checkDropletNameExists,
  checkProjectNameExists
  // checkVolumeNameExists,
  // checkDomainExists,
  // checkDNSRecordExists,
  // checkDatabaseClusterExists,
  // checkAppNameExists,
  // checkFirewallNameExists,
  // checkLoadBalancerNameExists,
  // checkVPCNameExists
} from "./digitalocean.js";

import fs from "fs";
import path from "path";


const checkerMap = {
  droplet: checkDropletNameExists,
  project: checkProjectNameExists,
  // volume: checkVolumeNameExists,
  // dns_zone: checkDomainExists,
  // dns_record: checkDNSRecordExists,
  // database: checkDatabaseClusterExists,
  // app: checkAppNameExists,
  // firewall: checkFirewallNameExists,
  // load_balancer: checkLoadBalancerNameExists,
  // vpc: checkVPCNameExists,
};

export async function check(inputs) {
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
        "description": "Digital ocean domain",
        "primitive": "dns_zone",
        "provider": "digitalocean"
      },
      "do_access_token": {
        "type": "string",
        "required": false,
        "default": "",
        "description": "Digital ocean access token",
        "primitive": "access_token",
        "provider": "digitalocean",
        "secret": true
      },
      "do_project_name": {
        "type": "string",
        "required": false,
        "default": "",
        "description": "Digital ocean project name",
        "primitive": "project",
        "provider": "digitalocean"
      },
      "do_project_description": {
        "type": "string",
        "required": false,
        "default": "",
        "description": "Digital ocean project description",
        "primitive": "project_description",
        "provider": "digitalocean"
      },
      "do_vpc_region": {
        "type": "string",
        "required": true,
        "description": "Digital ocean vpc region",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "do_db_name": {
        "type": "string",
        "required": true,
        "description": "Digital ocean db name",
        "primitive": "database",
        "provider": "digitalocean"
      },
      "do_db_engine": {
        "type": "string",
        "required": true,
        "description": "Digital ocean db engine",
        "primitive": "database_engine",
        "provider": "digitalocean"
      },
      "do_db_version": {
        "type": "string",
        "required": true,
        "description": "Digital ocean db version",
        "primitive": "database_version",
        "provider": "digitalocean"
      },
      "do_db_size": {
        "type": "string",
        "required": true,
        "description": "Digital ocean db size",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "do_db_region": {
        "type": "string",
        "required": true,
        "description": "Digital ocean db region",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "do_db_node_count": {
        "type": "string",
        "required": true,
        "description": "Digital ocean db node count",
        "primitive": "count",
        "provider": "digitalocean"
      },
      "do_mosquitto_region": {
        "type": "string",
        "required": true,
        "description": "Digital ocean mosquitto region",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "do_mosquitto_image": {
        "type": "string",
        "required": true,
        "description": "Digital ocean mosquitto image",
        "primitive": "image",
        "provider": "digitalocean"
      },
      "do_mosquitto_size": {
        "type": "string",
        "required": true,
        "description": "Digital ocean mosquitto size",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "do_mosquitto_username": {
        "type": "string",
        "required": true,
        "description": "Digital ocean mosquitto username",
        "primitive": "username",
        "provider": "digitalocean"
      },
      "do_mosquitto_password": {
        "type": "string",
        "required": true,
        "description": "Digital ocean mosquitto password",
        "primitive": "password",
        "provider": "digitalocean",
        "secret": true
      },
      "do_chirpstack_droplet_count": {
        "type": "string",
        "required": true,
        "description": "Digital ocean access token",
        "primitive": "count",
        "provider": "digitalocean"
      },
      "do_chirpstack_droplet_size": {
        "type": "string",
        "required": true,
        "description": "Digital ocean access token",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "do_chirpstack_droplet_image": {
        "type": "string",
        "required": true,
        "description": "Digital ocean access token",
        "primitive": "image",
        "provider": "digitalocean"
      },
      "do_chirpstack_droplet_region": {
        "type": "string",
        "required": true,
        "description": "Digital ocean access token",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "redis_droplet_size": {
        "type": "string",
        "required": false,
        "default": "s-1vcpu-1gb",
        "description": "Droplet size for redis",
        "primitive": "size",
        "provider": "digitalocean"
      },
      "redis_droplet_image": {
        "type": "string",
        "required": false,
        "default": "ubuntu-22-04-x64",
        "description": "Image for redis Droplet",
        "primitive": "image",
        "provider": "digitalocean"
      },
      "redis_region": {
        "type": "string",
        "required": true,
        "description": "Region for redis Droplet",
        "primitive": "region",
        "provider": "digitalocean"
      },
      "redis_password": {
        "type": "string",
        "required": true,
        "description": "Password to secure redis",
        "primitive": "password",
        "provider": "digitalocean",
        "secret": true
      },
      "private_key_path": {
        "type": "string",
        "required": false,
        "default": "~/.ssh/id_rsa",
        "description": "Path to your private SSH key",
        "primitive": "file_path",
        "provider": "digitalocean"
      },
      "do_ssh_key_name": {
        "type": "string",
        "required": true,
        "description": "SSH key name",
        "primitive": "ssh_key_name",
        "provider": "digitalocean"
      }
    }
  }  
  
  const schemaInputs = config.inputs || {};

  const token = inputs.do_access_token;
  if (!token) {
    throw new Error("Missing 'do_access_token' in inputs");
  }

  const results = {};

  for (const [key, value] of Object.entries(inputs)) {
    const inputDef = schemaInputs[key];

    
    if (!inputDef) continue;

    const { provider, primitive } = inputDef;
    
    if (provider !== "digitalocean") {
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