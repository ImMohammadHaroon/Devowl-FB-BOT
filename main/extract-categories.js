const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { PATHS } = require('./paths');
const COOKIE_PATH = PATHS.cookies;

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: "new",
  });

  const page = await browser.newPage();
  if (fs.existsSync(COOKIE_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
  } else {
    console.log('No cookies found.');
    await browser.close();
    return;
  }

  console.log('Navigating to marketplace...');
  await page.goto('https://www.facebook.com/marketplace/create/item', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  console.log('Clicking Category...');
  const focusClicked = await page.evaluate(() => {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.innerText.includes('Category') || label.getAttribute('aria-label') === 'Category') {
        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
        label.click(); // Opens the dropdown
        return true;
      }
    }
    return false;
  });

  if (!focusClicked) {
      console.log('Could not click category label');
      await browser.close();
      return;
  }

  await new Promise(r => setTimeout(r, 3000));
  console.log('Taking debug screenshot...');
  // Pressing arrow down incase it needs keyboard action to open
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(PATHS.data, 'debug-categories.png') });

  console.log('Extracting Categories...');
  const categories = await page.evaluate(() => {
    // Broad selector for the items inside the menu
    const items = document.querySelectorAll('[role="option"], [role="menuitem"], div[role="dialog"] div[dir="auto"], div[role="listbox"] div[dir="auto"]');
    const cats = new Set();
    for (const item of items) {
      const text = item.innerText ? item.innerText.trim() : '';
      if (text && text.length > 0 && text.length < 50 && !text.toLowerCase().includes('category') && !text.toLowerCase().includes('search')) {
        cats.add(text);
      }
    }
    return Array.from(cats);
  });

  console.log("=== FACEBOOK CATEGORIES ===");
  console.log(JSON.stringify(categories, null, 2));

  await browser.close();
})();
