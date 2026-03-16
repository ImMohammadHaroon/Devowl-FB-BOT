const { launchBrowser } = require('./browser');
const { loadCookies } = require('./cookieManager');
const fs = require('fs');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const MARKETPLACE_URL = 'https://www.facebook.com/marketplace/create/item';

async function runAutomation(listings, settings, callbacks) {
  const { onLog, onStatusUpdate, onComplete, onError, isPaused, isStopped } = callbacks;
  const { postingOrder = 'sequential' } = settings;

  let orderedListings = [...listings];
  let postedCount = 0;
  let failedCount = 0;
  let stopDueToIncompleteTab = false;

  if (postingOrder === 'random') {
    for (let i = orderedListings.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [orderedListings[i], orderedListings[j]] = [orderedListings[j], orderedListings[i]];
    }
  }

  onLog('info', 'Launching browser...');
  const page = await launchBrowser(false);

  onLog('info', 'Loading saved cookies...');
  const cookiesLoaded = await loadCookies(page);
  if (!cookiesLoaded) {
    onLog('error', 'No saved session found. Please login to Facebook first.');
    // Browser left open intentionally
    return;
  }

  onLog('info', 'Verifying Facebook session...');
  await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 30000 });

  const cookies = await page.cookies();
  const isLoggedIn = cookies.some((c) => c.name === 'c_user');
  if (!isLoggedIn) {
    onLog('error', 'Session expired. Please login to Facebook again.');
    // Browser left open intentionally
    return;
  }
  onLog('success', 'Facebook session verified!');

  for (let i = 0; i < orderedListings.length; i++) {
    if (isStopped()) break;
    while (isPaused()) {
      await new Promise((r) => setTimeout(r, 1000));
      if (isStopped()) break;
    }

    const listing = orderedListings[i];
    onLog('info', `───── Preparing Tab ${i + 1}/${orderedListings.length} for: "${listing.title}" ─────`);
    onStatusUpdate(listing.id, 'Posting');

    try {
      // Use the initial page for the first tab, spawn new pages for the rest
      const targetPage = i === 0 ? page : await page.browser().newPage();
      
      // Inherit viewport and anti-automation tricks if necessary
      if (i > 0) {
         await targetPage.setUserAgent(
           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
         );
      }

      await postListing(targetPage, listing, onLog);
      onStatusUpdate(listing.id, 'Posted');
      postedCount++;
      onLog('success', `✅ Tab ${i + 1} generated successfully!`);
    } catch (err) {
      onStatusUpdate(listing.id, 'Failed');
      failedCount++;
      onLog('error', `❌ Failed to post "${listing.title}": ${err.message}`);
      onError(err.message);
      stopDueToIncompleteTab = true;
    }

    if (stopDueToIncompleteTab) {
      onLog('error', 'Current tab was not fully filled. Stopping to avoid opening the next tab with incomplete data.');
      break;
    }

    if (i < orderedListings.length - 1 && !isStopped()) {
      onLog('info', 'Opening next tab immediately...');
    }
  }

  // NOTE: We deliberately do NOT call await closeBrowser() here
  // because the user wants to leave the N tabs open for review.
  onLog('info', `Campaign generation complete. Browser left open for review.`);
  if (!isStopped()) onComplete({ postedCount, failedCount });
}

/**
 * Robust keyboard-based filling for Facebook's React inputs
 */
async function fillTextField(page, labelText, textToType, onLog) {
  const focused = await page.evaluate((text) => {
    const target = String(text || '').toLowerCase();
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      const labelText = (label.innerText || '').toLowerCase();
      const aria = (label.getAttribute('aria-label') || '').toLowerCase();
      if (labelText.includes(target) || aria === target) {
        const input = label.querySelector('input, textarea');
        if (input) {
          input.focus();
          // Select all to clear existing text
          input.select();
          return true;
        }
      }
    }
    // Fallback search
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
    for (const input of inputs) {
      const placeholder = (input.placeholder || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      if (placeholder === target || aria === target) {
        input.focus();
        input.select();
        return true;
      }
    }
    return false;
  }, labelText);

  if (focused) {
    await page.keyboard.press('Backspace');
    await page.keyboard.type(textToType, { delay: 0 });
    onLog('success', `${labelText} filled.`);
    return true;
  }
  return false;
}

async function fillDescriptionField(page, textToType, onLog) {
  const filled = await page.evaluate((value) => {
    const target = String(value || '');

    const textareaCandidates = Array.from(document.querySelectorAll('textarea, div[role="textbox"], [contenteditable="true"]'));
    const descriptionNode = textareaCandidates.find((el) => {
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
      const name = (el.getAttribute('name') || '').toLowerCase();
      const id = (el.getAttribute('id') || '').toLowerCase();
      return aria.includes('description') || placeholder.includes('description') || name.includes('description') || id.includes('description');
    });

    if (!descriptionNode) return false;

    descriptionNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    descriptionNode.focus();

    const isTextArea = descriptionNode.tagName === 'TEXTAREA' || descriptionNode.tagName === 'INPUT';
    if (isTextArea) {
      descriptionNode.value = target;
      descriptionNode.dispatchEvent(new Event('input', { bubbles: true }));
      descriptionNode.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    descriptionNode.innerText = target;
    descriptionNode.dispatchEvent(new InputEvent('input', { bubbles: true, data: target, inputType: 'insertText' }));
    return true;
  }, textToType);

  if (filled) {
    onLog('success', 'Description filled.');
    return true;
  }

  return fillTextField(page, 'Description', textToType, onLog);
}

/**
 * Keyboard-based selection for Comboboxes
 */
async function selectCombobox(page, labelText, valueToSelect, onLog) {
  // Step 1: Click the label to open the dropdown
  const focusClicked = await page.evaluate((text) => {
    const target = String(text || '').toLowerCase();
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      const lText = (label.innerText || '').toLowerCase();
      const aria  = (label.getAttribute('aria-label') || '').toLowerCase();
      if (lText.includes(target) || aria === target) {
        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
        label.click();
        return true;
      }
    }
    return false;
  }, labelText);

  if (!focusClicked) return false;

  // Step 2: Fixed 2000ms wait – same as the proven capture-fb3.js approach
  await sleep(2000);

  // Step 3: Find the best matching option across ALL known Facebook dropdown selectors
  const normalize = (v) =>
    String(v || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const wanted = normalize(valueToSelect);

  const clicked = await page.evaluate((wanted) => {
    const norm = (v) =>
      String(v || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    // Cover every known Facebook dropdown container structure
    const OPTION_SELECTORS = [
      '[role="option"]',
      '[role="menuitem"]',
      'div[role="menu"] div[dir="auto"]',
      'div[role="dialog"] div[dir="auto"]',
      'div[role="listbox"] div[dir="auto"]',
      'ul[role="listbox"] li',
    ];

    const seen = new Set();
    const opts = [];
    for (const sel of OPTION_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        if (!seen.has(el)) { seen.add(el); opts.push(el); }
      });
    }

    // Score and pick best match
    let best = null;
    let bestScore = -1;
    for (const opt of opts) {
      const raw = (opt.innerText || opt.textContent || '').trim();
      if (!raw) continue;
      const cur = norm(raw);
      let score = -1;
      if (cur === wanted)                        score = 100;
      else if (cur.startsWith(wanted))           score = 90;
      else if (cur.includes(wanted))             score = 75;
      else if (wanted.includes(cur) && cur.length > 3) score = 55;
      if (score > bestScore) { best = opt; bestScore = score; }
    }

    if (best && bestScore >= 55) {
      best.click();
      return { ok: true, label: (best.innerText || best.textContent || '').trim() };
    }
    return { ok: false, count: opts.length };
  }, wanted);

  if (clicked.ok) {
    onLog('success', `${labelText} selected: ${clicked.label}`);
    return true;
  }

  // Step 4: Keyboard type fallback – type to filter, then press Enter
  onLog('warning', `${labelText} dropdown click failed (found ${clicked.count} opts). Trying keyboard type...`);
  await page.keyboard.type(valueToSelect, { delay: 0 });
  await sleep(1500);

  const keyboardClicked = await page.evaluate((wanted) => {
    const norm = (v) =>
      String(v || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const OPTION_SELECTORS = [
      '[role="option"]', '[role="menuitem"]',
      'div[role="menu"] div[dir="auto"]',
      'div[role="dialog"] div[dir="auto"]',
      'div[role="listbox"] div[dir="auto"]',
    ];
    const seen = new Set();
    const opts = [];
    for (const sel of OPTION_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        if (!seen.has(el)) { seen.add(el); opts.push(el); }
      });
    }
    for (const opt of opts) {
      const cur = norm(opt.innerText || opt.textContent || '');
      if (cur.includes(wanted) || wanted.includes(cur)) {
        opt.click();
        return (opt.innerText || opt.textContent || '').trim();
      }
    }
    return '';
  }, wanted);

  if (keyboardClicked) {
    onLog('success', `${labelText} selected via keyboard: ${keyboardClicked}`);
    return true;
  }

  // Step 5: Last resort – ArrowDown + Enter
  await page.keyboard.press('ArrowDown');
  await sleep(100);
  await page.keyboard.press('Enter');
  await sleep(200);
  onLog('warning', `${labelText} selected via ArrowDown+Enter fallback.`);
  return true;
}

/**
 * Fallback picker: selects first available option from a combobox
 */
async function selectAnyComboboxOption(page, labelText, onLog) {
  const focusClicked = await page.evaluate((text) => {
    const target = String(text || '').toLowerCase();
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      const labelText = (label.innerText || '').toLowerCase();
      const aria = (label.getAttribute('aria-label') || '').toLowerCase();
      if (labelText.includes(target) || aria === target) {
        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
        label.click();
        return true;
      }
    }
    return false;
  }, labelText);

  if (!focusClicked) return false;

  await page.waitForSelector('[role="option"], [role="menuitem"], div[role="dialog"] div[dir="auto"], div[role="listbox"] div[dir="auto"]', { timeout: 2500 }).catch(() => {});

  const selectedLabel = await page.evaluate(() => {
    const options = document.querySelectorAll('[role="option"], [role="menuitem"], div[role="dialog"] div[dir="auto"], div[role="listbox"] div[dir="auto"]');
    for (const opt of options) {
      const txt = (opt.innerText || '').trim();
      if (!txt) continue;
      opt.click();
      return txt;
    }
    return '';
  });

  if (selectedLabel) {
    onLog('success', `${labelText} auto-selected: ${selectedLabel}`);
    return true;
  }

  return false;
}

async function expandMoreDetails(page, onLog) {
  const expanded = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('button, [role="button"], div[tabindex], span[tabindex]'));
    const trigger = nodes.find((el) => {
      const txt = (el.innerText || el.textContent || '').toLowerCase().trim();
      return txt.includes('more details');
    });
    if (!trigger) return false;
    trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
    trigger.click();
    return true;
  });

  if (expanded) {
    await sleep(250);
    onLog('info', 'Expanded More details section.');
  }

  return expanded;
}

async function postListing(page, listing, onLog) {
  onLog('info', 'Opening Marketplace create page...');
  await page.goto(MARKETPLACE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input:not([type="hidden"]), textarea, input[type="file"]', { timeout: 15000 });

  // 1. Upload Images
  if (listing.images && listing.images.length > 0) {
    onLog('info', `Uploading images...`);
    try {
      const fileInputs = await page.$$('input[type="file"]');
      if (fileInputs.length > 0) {
        const validImages = listing.images.filter((img) => fs.existsSync(img));
        if (validImages.length > 0) {
          await fileInputs[0].uploadFile(...validImages);
          await sleep(1200); // Let thumbnails mount before field filling
        }
      }
    } catch (err) {
      onLog('warning', `Image upload error: ${err.message}`);
    }
  }

  // 2. Title
  onLog('info', 'Filling Title...');
  if (!await fillTextField(page, 'Title', listing.title, onLog)) {
    throw new Error("Could not find Title field");
  }

  // 3. Price
  onLog('info', 'Filling Price...');
  if (!await fillTextField(page, 'Price', String(listing.price), onLog)) {
    throw new Error("Could not find Price field");
  }

  // 4. Condition
  if (listing.condition) {
    onLog('info', 'Selecting Condition...');
    if (!await selectCombobox(page, 'Condition', listing.condition, onLog)) {
      onLog('warning', 'Condition field not found for this category/layout. Skipping condition.');
    }
    await sleep(300);
  }

  // 5. Availability (inside More details on many category layouts)
  if (listing.availability) {
    onLog('info', 'Setting Availability...');
    await expandMoreDetails(page, onLog);

    let availabilitySelected = await selectCombobox(page, 'Availability', listing.availability, onLog);
    if (!availabilitySelected) {
      onLog('warning', 'Availability exact match not found. Auto-selecting an available option...');
      availabilitySelected = await selectAnyComboboxOption(page, 'Availability', onLog);
    }

    if (!availabilitySelected) {
      onLog('warning', 'Availability field not found on this listing layout, skipping.');
    } else {
      await sleep(200);
    }
  }

  // 6. Description
  onLog('info', 'Filling Description...');
  if (listing.description && !await fillDescriptionField(page, listing.description, onLog)) {
    onLog('warning', 'Description field not found for this layout. Skipping description.');
  }

  // 7. Location (Combobox)
  if (listing.location) {
    onLog('info', 'Setting Location...');
    if (!await selectCombobox(page, 'Location', listing.location, onLog)) {
      // Location can also be a regular text field on some versions
       const locationTyped = await fillTextField(page, 'Location', listing.location, onLog);
       if (!locationTyped) {
         onLog('warning', 'Location field not found for this layout. Skipping location.');
       } else {
         await sleep(160);
         await page.keyboard.press('ArrowDown').catch(() => {});
         await page.keyboard.press('Enter').catch(() => {});
       }
    }
  }

  // 8. Completed Form Filling
  onLog('success', '🎉 Form filled successfully. Stopping without publishing.');
}

module.exports = { runAutomation, stopAutomation: () => {}, pauseAutomation: () => {}, resumeAutomation: () => {} };
