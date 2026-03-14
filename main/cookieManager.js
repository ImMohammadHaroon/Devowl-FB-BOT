const fs = require('fs');
const path = require('path');

const { PATHS } = require('./paths');

const COOKIE_PATH = PATHS.cookies;

async function saveCookies(page) {
  const cookies = await page.cookies();
  const dir = path.dirname(COOKIE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
}

async function loadCookies(page) {
  if (!hasSavedSession()) return false;
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
    return true;
  } catch {
    return false;
  }
}

function hasSavedSession() {
  return fs.existsSync(COOKIE_PATH);
}

function clearCookies() {
  if (fs.existsSync(COOKIE_PATH)) {
    fs.unlinkSync(COOKIE_PATH);
  }
}

module.exports = { saveCookies, loadCookies, hasSavedSession, clearCookies };
