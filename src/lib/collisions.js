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
import { fetchPackage } from "./repo.js";
import { getInputs, getSteps } from "./state.js";

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

async function doCheckCollisions(schemaInputs, inputs) {
  const found = Object
    .entries(schemaInputs)
    .find(([key, value]) =>
      value.primitive === 'access_token' &&
      value.provider === 'digitalocean'
    )

  if (!found) return;
  
  
  const token = inputs[found[0]] 
  console.info(token)
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

export async function checkCollisions() {
  const steps = getSteps();
  const inputs = getInputs();

  // Before we even start execution, we check for collisions.
  // This way we are sure we are not going to get stuck half way through.
  const endResults = {};
  for (const step of steps) {
    const { package: packageName } = step;

    const pkgDetails = await fetchPackage(
      `https://api.tofuhub.co/functions/v1/packages/${packageName}`,
      process.env.TOFUHUB_API_TOKEN
    );
    // We do an extra collision check just before starting the real execution
    const results = await doCheckCollisions(pkgDetails.versions.configuration.inputs, inputs)
    endResults = {...endResults, ...results}
  }

  return endResults;
} 