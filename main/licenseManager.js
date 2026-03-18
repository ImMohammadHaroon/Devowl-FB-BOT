const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');

// Keys are hardcoded inside licenseManager.js as a JavaScript Set
const VALID_KEYS = new Set([
  "A1B2-C3D4-E5F6-G7H8",
  "UR7F-ETEN-ECKB-I22X",
  // add more keys here after running keygen.js
]);

function getMachineId() {
  const id = machineIdSync({ original: true });
  return crypto.createHash('sha256').update(id).digest('hex');
}

function getLicensePath() {
  return path.join(app.getPath('userData'), 'license.dat');
}

function getRegistryPath() {
  return path.join(app.getPath('userData'), 'key-registry.dat');
}

function saveLicense(key, activatedOn) {
  const data = { key, activatedOn, machineId: getMachineId() };
  const jsonStr = JSON.stringify(data);
  const b64 = Buffer.from(jsonStr).toString('base64');
  fs.writeFileSync(getLicensePath(), b64, 'utf8');
}

function loadLicense() {
  try {
    const filePath = getLicensePath();
    if (!fs.existsSync(filePath)) return null;
    const b64 = fs.readFileSync(filePath, 'utf8');
    const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

function isLicenseValid() {
  const license = loadLicense();
  if (!license) {
    return { valid: false, reason: 'not_found' };
  }
  
  const currentMachineId = getMachineId();
  if (license.machineId !== currentMachineId) {
    return { valid: false, reason: 'device_mismatch' };
  }
  
  const now = Date.now();
  const activatedOn = new Date(license.activatedOn).getTime();
  const daysPassed = (now - activatedOn) / (1000 * 60 * 60 * 24);
  
  if (daysPassed > 30) {
    // Return expiredOn as a formatted date string like YYYY-MM-DD
    const expiredOn = new Date(activatedOn + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { valid: false, reason: 'expired', expiredOn };
  }
  
  return { valid: true, reason: 'ok' };
}

function loadRegistry() {
  try {
    const filePath = getRegistryPath();
    if (!fs.existsSync(filePath)) return {};
    const b64 = fs.readFileSync(filePath, 'utf8');
    const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (err) {
    return {};
  }
}

function saveRegistry(registryObj) {
  const jsonStr = JSON.stringify(registryObj);
  const b64 = Buffer.from(jsonStr).toString('base64');
  fs.writeFileSync(getRegistryPath(), b64, 'utf8');
}

function validateAndActivateKey(key) {
  const formatRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!formatRegex.test(key)) {
    return { success: false, reason: 'invalid_format' };
  }
  
  if (!VALID_KEYS.has(key)) {
    return { success: false, reason: 'invalid_key' };
  }
  
  const registry = loadRegistry();
  const currentMachineId = getMachineId();
  
  if (registry[key]) {
    if (registry[key] !== currentMachineId) {
      return { success: false, reason: 'device_mismatch' };
    }
  } else {
    registry[key] = currentMachineId;
    saveRegistry(registry);
  }
  
  saveLicense(key, new Date().toISOString());
  return { success: true };
}

module.exports = {
  getMachineId,
  getLicensePath,
  getRegistryPath,
  saveLicense,
  loadLicense,
  isLicenseValid,
  loadRegistry,
  saveRegistry,
  validateAndActivateKey
};
