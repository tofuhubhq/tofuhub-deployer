const DIGITAL_OCEAN_API = `https://api.digitalocean.com/v2`;

export async function checkDropletNameExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/droplets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.droplets.some((droplet) => droplet.name === name);
}

export async function checkVolumeNameExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/volumes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.volumes.some((vol) => vol.name === name);
}

export async function checkProjectNameExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/projects`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`DigitalOcean API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.projects ?? []).some(project => project.name === name);
}

export async function checkDomainExists(domain, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/domains`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.domains.some((d) => d.name === domain);
}

export async function checkDNSRecordExists(domain, subdomain, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/domains/${domain}/records`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.domain_records.some((r) => r.name === subdomain);
}

export async function checkDatabaseClusterExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/databases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.databases?.some((db) => db.name === name);
}

export async function checkAppNameExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/apps`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.apps.some((app) => app.spec.name === name);
}

export async function checkFirewallNameExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/firewalls`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.firewalls.some((fw) => fw.name === name);
}

export async function checkLoadBalancerNameExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/load_balancers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.load_balancers.some((lb) => lb.name === name);
}

export async function checkVPCNameExists(name, token) {
  const res = await fetch(`${DIGITAL_OCEAN_API}/vpcs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.vpcs.some((vpc) => vpc.name === name);
}

export async function deleteDropletById(droplet_id, token) {
  const res = await fetch(`https://api.digitalocean.com/v2/droplets/${droplet_id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete droplet ${droplet_id}: ${err}`);
  }

  return { success: true, droplet_id };
}