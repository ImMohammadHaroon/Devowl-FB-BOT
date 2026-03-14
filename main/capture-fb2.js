const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { PATHS } = require('./paths');
const COOKIE_PATH = PATHS.cookies;
const SCREENSHOT2_PATH = path.join(PATHS.data, 'fb_marketplace2.png');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  if (fs.existsSync(COOKIE_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
  }

  console.log('Navigating to marketplace create page...');
  await page.goto('https://www.facebook.com/marketplace/create/item', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  console.log('Waiting 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Evaluating DOM to fill basic fields (Title, Price)...');
  await page.evaluate(() => {
    // Fill Title
    const titleInput = Array.from(document.querySelectorAll('input:not([type="hidden"])')).find(el => {
      const label = el.closest('label');
      return (label && label.innerText.includes('Title')) || el.placeholder === 'Title' || el.getAttribute('aria-label') === 'Title';
    });
    if (titleInput) {
      titleInput.focus();
      titleInput.value = "Test Item";
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Fill Price
    const priceInput = Array.from(document.querySelectorAll('input:not([type="hidden"])')).find(el => {
      const label = el.closest('label');
      return (label && label.innerText.includes('Price')) || el.placeholder === 'Price' || el.getAttribute('aria-label') === 'Price';
    });
    if (priceInput) {
      priceInput.focus();
      priceInput.value = "100";
      priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  console.log('Clicking category...');
  await page.evaluate(() => {
    const catLabel = Array.from(document.querySelectorAll('label')).find(l => l.innerText.includes('Category'));
    if (catLabel) {
      catLabel.click();
    }
  });
  
  await new Promise(r => setTimeout(r, 2000));

  console.log('Selecting first category suggestion...');
  await page.evaluate(() => {
    const opt = document.querySelector('[role="option"], [role="menuitem"]');
    if (opt) {
      opt.click();
    }
  });

  await new Promise(r => setTimeout(r, 3000));

  console.log(`Taking screenshot: ${SCREENSHOT2_PATH}`);
  await page.screenshot({ path: SCREENSHOT2_PATH, fullPage: true });

  console.log('Done.');
  await browser.close();
})();
