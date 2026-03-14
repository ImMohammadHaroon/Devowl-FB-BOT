const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { launchBrowser, closeBrowser, getPage } = require('./browser');
const { PATHS, ensureDirs } = require('./paths');
const { saveCookies, loadCookies, hasSavedSession } = require('./cookieManager');
const { runAutomation, stopAutomation, pauseAutomation, resumeAutomation } = require('./automation');
// CSV parser removed

let mainWindow;
let botState = {
  running: false,
  paused: false,
};

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Window Controls ───
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ─── CSV Import removed ───

// ─── Image Import ───
ipcMain.handle('import-images', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Images',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return [];

  const imagesDir = PATHS.images;
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const savedPaths = [];
  for (const filePath of result.filePaths) {
    const fileName = `${Date.now()}_${path.basename(filePath)}`;
    const destPath = path.join(imagesDir, fileName);
    fs.copyFileSync(filePath, destPath);
    savedPaths.push(destPath);
  }
  return savedPaths;
});

// ─── Cookie / Login ───
ipcMain.handle('check-session', async () => {
  return hasSavedSession();
});

ipcMain.handle('facebook-login', async () => {
  try {
    sendLog('info', 'Launching browser for Facebook login...');
    const page = await launchBrowser(true);
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 60000 });
    sendLog('info', 'Please log in to Facebook manually. The session will be saved automatically.');

    // Wait for user to log in — poll for logged-in state
    let loggedIn = false;
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const url = page.url();
      if (url.includes('facebook.com') && !url.includes('login') && !url.includes('checkpoint')) {
        const cookies = await page.cookies();
        const hasCUser = cookies.some((c) => c.name === 'c_user');
        if (hasCUser) {
          loggedIn = true;
          break;
        }
      }
    }

    if (loggedIn) {
      await saveCookies(page);
      sendLog('success', 'Facebook session saved successfully!');
      await closeBrowser();
      return { success: true };
    } else {
      sendLog('error', 'Login timed out. Please try again.');
      await closeBrowser();
      return { success: false, error: 'Login timed out' };
    }
  } catch (err) {
    sendLog('error', `Login error: ${err.message}`);
    await closeBrowser();
    return { success: false, error: err.message };
  }
});

// ─── Bot Controls ───
ipcMain.handle('start-bot', async (event, { listings, settings }) => {
  if (botState.running) return { success: false, error: 'Bot is already running' };

  botState.running = true;
  botState.paused = false;

  sendLog('info', 'Starting bot...');

  try {
    await runAutomation(listings, settings, {
      onLog: (level, message) => sendLog(level, message),
      onStatusUpdate: (listingId, status) => {
        mainWindow?.webContents.send('listing-status-update', { listingId, status });
      },
      onComplete: (stats) => {
        botState.running = false;
        mainWindow?.webContents.send('bot-complete');
        const posted = stats?.postedCount || 0;
        const failed = stats?.failedCount || 0;
        if (failed > 0) {
          sendLog('warning', `Bot finished: ${posted} posted, ${failed} failed.`);
        } else {
          sendLog('success', `🎉 All ${posted} listings posted successfully!`);
        }
      },
      onError: (error) => {
        sendLog('error', `Bot error: ${error}`);
      },
      isPaused: () => botState.paused,
      isStopped: () => !botState.running,
    });
  } catch (err) {
    botState.running = false;
    sendLog('error', `Bot crashed: ${err.message}`);
  }

  return { success: true };
});

ipcMain.handle('pause-bot', async () => {
  botState.paused = true;
  sendLog('warning', 'Bot paused.');
  return { success: true };
});

ipcMain.handle('resume-bot', async () => {
  botState.paused = false;
  sendLog('info', 'Bot resumed.');
  return { success: true };
});

ipcMain.handle('stop-bot', async () => {
  botState.running = false;
  botState.paused = false;
  sendLog('warning', 'Bot stopped. Browser left open.');
  return { success: true };
});

// ─── Helpers ───
function sendLog(level, message) {
  mainWindow?.webContents.send('log-message', {
    level,
    message,
    timestamp: new Date().toISOString(),
  });
}

// ─── App Lifecycle ───
app.whenReady().then(() => {
  ensureDirs();
  createWindow();
});

app.on('window-all-closed', async () => {
  await closeBrowser();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
