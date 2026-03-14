const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Use app.getPath('userData') for production, and fall back to local folder for development/scripts
// However, when running via 'node main/script.js', 'app' will be undefined.
let userDataPath;

try {
  userDataPath = app.getPath('userData');
} catch (e) {
  // Fallback for standalone scripts or if app is not ready
  userDataPath = path.join(__dirname, '..');
}

const PATHS = {
  userData: userDataPath,
  session: path.join(userDataPath, 'session'),
  data: path.join(userDataPath, 'data'),
  images: path.join(userDataPath, 'data', 'images'),
  listings: path.join(userDataPath, 'data', 'listings'),
  cookies: path.join(userDataPath, 'session', 'facebook_cookies.json'),
};

function ensureDirs() {
  const dirs = [PATHS.session, PATHS.data, PATHS.images, PATHS.listings];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

module.exports = { PATHS, ensureDirs };
