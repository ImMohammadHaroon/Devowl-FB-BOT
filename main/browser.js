const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer');

let browser = null;
let page = null;
let ownsBrowser = false;

const REMOTE_DEBUGGING_PORT = 9222;

function getWindowsBrowserCandidates() {
  return [
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  ];
}

function getChromeLaunchOptions() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;

  const userDataDir = path.join(localAppData, 'Google', 'Chrome', 'User Data');
  if (!fs.existsSync(userDataDir)) return null;

  for (const executablePath of getWindowsBrowserCandidates()) {
    if (!fs.existsSync(executablePath)) continue;

    return {
      executablePath,
      label: `Google Chrome main profile (${executablePath})`,
      userDataDir,
      profileDirectory: getLastUsedProfileDirectory(userDataDir),
    };
  }

  return null;
}

function getLastUsedProfileDirectory(userDataDir) {
  const fallbackProfile = 'Default';
  if (!userDataDir) return fallbackProfile;

  try {
    const localStatePath = path.join(userDataDir, 'Local State');
    if (!fs.existsSync(localStatePath)) return fallbackProfile;

    const raw = fs.readFileSync(localStatePath, 'utf8');
    const parsed = JSON.parse(raw);
    const profileName = parsed?.profile?.last_used;

    if (typeof profileName === 'string' && profileName.trim()) {
      return profileName.trim();
    }
  } catch {
    // Ignore profile parsing issues and use Default
  }

  return fallbackProfile;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(500, () => {
      request.destroy(new Error('Request timed out'));
    });
  });
}

async function connectToRunningChrome() {
  try {
    const version = await getJson(`http://127.0.0.1:${REMOTE_DEBUGGING_PORT}/json/version`);
    if (!version?.webSocketDebuggerUrl) return null;

    return await puppeteer.connect({
      browserURL: `http://127.0.0.1:${REMOTE_DEBUGGING_PORT}`,
      defaultViewport: null,
    });
  } catch {
    return null;
  }
}

async function launchBrowser(headless = false) {
  if (browser) {
    try {
      const pages = await browser.pages();
      if (pages.length > 0) {
        page = pages[0];
        return page;
      }
    } catch {
      browser = null;
      page = null;
      ownsBrowser = false;
    }
  }

  browser = await connectToRunningChrome();
  ownsBrowser = false;

  let lastError = null;
  if (!browser) {
    const launchOptions = getChromeLaunchOptions();
    if (!launchOptions) {
      throw new Error('Google Chrome is not installed or the Chrome user data directory was not found.');
    }

    try {
      const launchArgs = [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
      ];

      if (launchOptions.profileDirectory) {
        launchArgs.push(`--profile-directory=${launchOptions.profileDirectory}`);
      }

      browser = await puppeteer.launch({
        headless: false,
        executablePath: launchOptions.executablePath,
        userDataDir: launchOptions.userDataDir,
        defaultViewport: null,
        args: launchArgs,
        ignoreDefaultArgs: ['--enable-automation'],
      });
      ownsBrowser = true;
    } catch (error) {
      lastError = new Error(`Launch failed with ${launchOptions.label}: ${error.message}`);
      browser = null;
      ownsBrowser = false;
    }
  }

  if (!browser) {
    throw new Error(
      `${lastError?.message || 'Unable to use Google Chrome.'} To work on your old Chrome profile, either close Chrome completely and retry, or start Chrome with --remote-debugging-port=${REMOTE_DEBUGGING_PORT} and then run the bot.`
    );
  }

  const pages = await browser.pages();
  page = pages.length > 0 ? pages[0] : await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  return page;
}

async function closeBrowser() {
  try {
    if (browser) {
      if (ownsBrowser) {
        await browser.close();
      } else {
        browser.disconnect();
      }
    }
  } catch {
    // Ignore close errors
  }
  browser = null;
  page = null;
  ownsBrowser = false;
}

function getPage() {
  return page;
}

function getBrowser() {
  return browser;
}

module.exports = { launchBrowser, closeBrowser, getPage, getBrowser };
