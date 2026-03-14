const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { PATHS } = require('./paths');
const COOKIE_PATH = PATHS.cookies;
const SCREENSHOT_PATH = path.join(PATHS.data, 'fb_marketplace.png');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  // Load cookies
  if (fs.existsSync(COOKIE_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
    console.log('Cookies loaded.');
  } else {
    console.log('No cookies found.');
    await browser.close();
    return;
  }

  console.log('Navigating to marketplace create page...');
  await page.goto('https://www.facebook.com/marketplace/create/item', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  console.log('Waiting 5 seconds for page to fully render...');
  await new Promise((r) => setTimeout(r, 5000));

  console.log(`Taking screenshot: ${SCREENSHOT_PATH}`);
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

  console.log('Done.');
  await browser.close();
})();
