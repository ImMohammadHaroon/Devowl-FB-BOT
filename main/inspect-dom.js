/**
 * DOM Inspector Script
 * Run this with: node main/inspect-dom.js
 * It will load your saved cookies, open the Marketplace create page,
 * and dump all form elements with their selectors.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { PATHS } = require('./paths');
const COOKIE_PATH = PATHS.cookies;

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = (await browser.pages())[0];

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  // Load cookies
  if (fs.existsSync(COOKIE_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    await page.setCookie(...cookies);
    console.log('Cookies loaded.');
  } else {
    console.log('No cookies found. Please login first.');
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

  // Dump DOM info
  const domInfo = await page.evaluate(() => {
    const results = {
      inputs: [],
      textareas: [],
      buttons: [],
      comboboxes: [],
      labels: [],
      fileInputs: [],
      allAriaLabels: [],
    };

    // All inputs
    document.querySelectorAll('input').forEach((el) => {
      const label = el.closest('label');
      results.inputs.push({
        type: el.type,
        ariaLabel: el.getAttribute('aria-label'),
        placeholder: el.placeholder,
        name: el.name,
        id: el.id,
        labelAriaLabel: label?.getAttribute('aria-label'),
        labelText: label?.textContent?.trim()?.substring(0, 80),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
        classes: el.className?.substring(0, 100),
      });
    });

    // All textareas
    document.querySelectorAll('textarea').forEach((el) => {
      const label = el.closest('label');
      results.textareas.push({
        ariaLabel: el.getAttribute('aria-label'),
        placeholder: el.placeholder,
        labelAriaLabel: label?.getAttribute('aria-label'),
        labelText: label?.textContent?.trim()?.substring(0, 80),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      });
    });

    // All buttons and role="button"
    document.querySelectorAll('[role="button"], button').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 60) {
        results.buttons.push({
          tag: el.tagName.toLowerCase(),
          text: text,
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
        });
      }
    });

    // Comboboxes
    document.querySelectorAll('[role="combobox"]').forEach((el) => {
      results.comboboxes.push({
        tag: el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute('aria-label'),
        text: el.textContent?.trim()?.substring(0, 60),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      });
    });

    // Labels with aria-label
    document.querySelectorAll('label[aria-label]').forEach((el) => {
      results.labels.push({
        ariaLabel: el.getAttribute('aria-label'),
        text: el.textContent?.trim()?.substring(0, 80),
        hasInput: !!el.querySelector('input'),
        hasTextarea: !!el.querySelector('textarea'),
        hasSelect: !!el.querySelector('select'),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      });
    });

    // All elements with aria-label
    document.querySelectorAll('[aria-label]').forEach((el) => {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.length < 60) {
        results.allAriaLabels.push({
          tag: el.tagName.toLowerCase(),
          ariaLabel: ariaLabel,
          role: el.getAttribute('role'),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
        });
      }
    });

    return results;
  });

  const outputPath = path.join(PATHS.data, 'dom-dump.json');
  fs.writeFileSync(outputPath, JSON.stringify(domInfo, null, 2));
  console.log(`\nDOM dump saved to: ${outputPath}`);

  // Print summary
  console.log('\n═══════════════════════════════════');
  console.log('  FACEBOOK MARKETPLACE DOM DUMP');
  console.log('═══════════════════════════════════\n');

  console.log('── LABELS with aria-label ──');
  domInfo.labels.forEach((l) => {
    console.log(`  [${l.visible ? 'V' : 'H'}] aria-label="${l.ariaLabel}" | text="${l.text}" | input=${l.hasInput} textarea=${l.hasTextarea}`);
  });

  console.log('\n── INPUTS ──');
  domInfo.inputs.forEach((inp) => {
    if (inp.visible) {
      console.log(`  [V] type="${inp.type}" | aria-label="${inp.ariaLabel}" | placeholder="${inp.placeholder}" | label="${inp.labelAriaLabel || inp.labelText}"`);
    }
  });

  console.log('\n── TEXTAREAS ──');
  domInfo.textareas.forEach((ta) => {
    console.log(`  [${ta.visible ? 'V' : 'H'}] aria-label="${ta.ariaLabel}" | label="${ta.labelAriaLabel || ta.labelText}"`);
  });

  console.log('\n── BUTTONS (visible) ──');
  domInfo.buttons.filter((b) => b.visible).forEach((btn) => {
    console.log(`  [V] text="${btn.text}" | aria-label="${btn.ariaLabel}" | role="${btn.role}"`);
  });

  console.log('\n── COMBOBOXES ──');
  domInfo.comboboxes.forEach((cb) => {
    console.log(`  [${cb.visible ? 'V' : 'H'}] aria-label="${cb.ariaLabel}" | text="${cb.text}"`);
  });

  console.log('\nDone! Keeping browser open so you can inspect manually.');
  console.log('Press Ctrl+C to close.');
})();
