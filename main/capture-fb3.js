const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { PATHS } = require('./paths');
const COOKIE_PATH = PATHS.cookies;
const SCREENSHOT_PATH = path.join(PATHS.data, 'fb_marketplace3.png');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 900 }
  });

  const page = await browser.newPage();
  if (fs.existsSync(COOKIE_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
  }

  console.log('Navigating to marketplace...');
  await page.goto('https://www.facebook.com/marketplace/create/item', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  console.log('Filling Title...');
  await page.evaluate(() => {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.innerText.includes('Title')) {
        const input = label.querySelector('input');
        if (input) {
          input.focus();
          input.value = "Awesome Phone";
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  });

  console.log('Filling Price...');
  await page.evaluate(() => {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.innerText.includes('Price')) {
        const input = label.querySelector('input');
        if (input) {
          input.focus();
          input.value = "500";
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  });

  console.log('Clicking Category...');
  await page.evaluate(() => {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.innerText.includes('Category') || label.getAttribute('aria-label') === 'Category') {
        label.click();
      }
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('Selecting category from menu...');
  await page.evaluate(() => {
    const items = document.querySelectorAll('div[role="dialog"] div[dir="auto"], div[role="menu"] div[dir="auto"], [role="option"]');
    for (const item of items) {
      if (item.innerText && item.innerText.includes('Electronics') || item.innerText.includes('Phones') || item.innerText.includes('Mobile') || item.innerText.includes('Tools')) {
        item.click();
        return;
      }
    }
    // Just click the first option if the above fails
    const firstOpt = document.querySelector('[role="option"]');
    if (firstOpt) firstOpt.click();
  });

  console.log('Waiting for dynamic fields to appear...');
  await new Promise(r => setTimeout(r, 4000));

  // Capture the scrollable container if possible
  console.log(`Taking screenshot: ${SCREENSHOT_PATH}`);
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

  console.log('Done.');
  await browser.close();
})();
