/**
 * Random delay between min and max milliseconds
 */
function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Random pause alias with shorter defaults
 */
function randomPause(min = 500, max = 1500) {
  return randomDelay(min, max);
}

/**
 * Human-like typing with random delay between keystrokes
 */
async function humanType(page, selector, text, options = {}) {
  const { minDelay = 50, maxDelay = 120 } = options;

  const element = await page.$(selector);
  if (!element) return;

  for (const char of text) {
    await element.type(char, { delay: 0 });
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await new Promise((r) => setTimeout(r, delay));
  }
}

/**
 * Smooth mouse movement simulation
 */
async function smoothMouseMove(page, x, y, steps = 10) {
  const mouse = page.mouse;
  const startX = 0;
  const startY = 0;

  for (let i = 0; i <= steps; i++) {
    const currentX = startX + ((x - startX) * i) / steps;
    const currentY = startY + ((y - startY) * i) / steps;
    await mouse.move(currentX, currentY);
    await new Promise((r) => setTimeout(r, Math.random() * 20 + 10));
  }
}

module.exports = { randomDelay, randomPause, humanType, smoothMouseMove };
