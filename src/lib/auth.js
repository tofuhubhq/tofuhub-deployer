import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_DIR = path.join(os.homedir(), '.tofuhub');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');
const GITHUB_TOKEN_PATH = path.join(os.homedir(), '.tofuhub', 'github-token.json');

const ANON_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbHRuanJyemttYXp2YnJxYmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3ODk1NzcsImV4cCI6MjA1MjM2NTU3N30.2iz-ErTvlZ_o8rvYfFWWhlbo6RRTE0FWFlk7vQQkETg';

export function saveToken(token) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ token }, null, 2));
}

export function getToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    return ANON_TOKEN;
  }

  try {
    const data = fs.readFileSync(TOKEN_PATH);
    const parsed = JSON.parse(data);
    return parsed.token || ANON_TOKEN;
  } catch (err) {
    return ANON_TOKEN;
  }
}

export function deleteToken() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
}

export function getGithubToken() {
  return process.env.GITHUB_TOKEN || (
    fs.existsSync(GITHUB_TOKEN_PATH)
      ? JSON.parse(fs.readFileSync(GITHUB_TOKEN_PATH, 'utf-8')).access_token
      : null
  );
}