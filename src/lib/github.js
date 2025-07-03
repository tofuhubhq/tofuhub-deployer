import https from 'https';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';


async function repoExistsOnGithub(name, githubToken, org = null) {
  const perPage = 100;
  let page = 1;
  let morePages = true;

  const pathPrefix = org ? `/orgs/${org}/repos` : '/user/repos';

  while (morePages) {
    const path = `${pathPrefix}?per_page=${perPage}&page=${page}`;

    const repos = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.github.com',
        path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'User-Agent': 'tofuhub-cli',
          'Accept': 'application/vnd.github+json'
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!Array.isArray(data)) return resolve([]);
            resolve(data);
          } catch (err) {
            resolve([]);
          }
        });
      });

      req.on('error', () => resolve([]));
      req.end();
    });

    if (repos.some(repo => repo.name === name)) {
      return true;
    }

    if (repos.length < perPage) {
      morePages = false;
    } else {
      page++;
    }
  }

  return false;
}

function generateUniqueRepoName(baseName) {
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${baseName}-${suffix}`;
}

export async function createGithubRepoAndPush(repoDir, baseName, githubToken, org = null) {
  let name = baseName;

  if (await repoExistsOnGithub(name, githubToken, org)) {
    name = generateUniqueRepoName(baseName);
    console.log(`ℹ️ Repo "${baseName}" already exists in ${org || 'your GitHub account'}. Using "${name}" instead.`);
  }

  const parentDir = path.dirname(repoDir);
  const newRepoDir = path.join(parentDir, name);

  if (repoDir !== newRepoDir) {
    fs.renameSync(repoDir, newRepoDir);
    repoDir = newRepoDir;
  }

  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'User-Agent': 'tofuhub-cli',
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };

  const repoData = JSON.stringify({ name, private: true });
  const pathToCreate = org ? `/orgs/${org}/repos` : '/user/repos';

  // ✅ Wrap the request in a Promise
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: pathToCreate,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(repoData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode === 201) {
            const repoUrl = result.clone_url.replace('https://', `https://${githubToken}@`);
            execSync(`git remote set-url origin ${repoUrl}`, { cwd: repoDir });
            execSync(`git push origin main`, { cwd: repoDir });
            console.log(`✅ Repo created and pushed: ${result.html_url}`);
            resolve({repoUrl: result.html_url, repoDir: newRepoDir}); // 🟢 now correctly resolves
          } else {
            console.error(`❌ GitHub repo creation failed (${res.statusCode}): ${body}`);
            reject(new Error(`GitHub API error: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse GitHub response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ GitHub request failed:', err);
      reject(err);
    });

    req.write(repoData);
    req.end();
  });
}