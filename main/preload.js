const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // License Activation
  checkLicense: () => ipcRenderer.invoke('license:check'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
  openMain: () => ipcRenderer.invoke('license:open-main'),

  // CSV Export/Import functionality removed

  // Images
  importImages: () => ipcRenderer.invoke('import-images'),

  // Session
  checkSession: () => ipcRenderer.invoke('check-session'),
  facebookLogin: () => ipcRenderer.invoke('facebook-login'),
  facebookLogout: () => ipcRenderer.invoke('facebook-logout'),

  // Bot controls
  startBot: (data) => ipcRenderer.invoke('start-bot', data),
  pauseBot: () => ipcRenderer.invoke('pause-bot'),
  resumeBot: () => ipcRenderer.invoke('resume-bot'),
  stopBot: () => ipcRenderer.invoke('stop-bot'),

  // Listeners
  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('log-message');
  },
  onListingStatusUpdate: (callback) => {
    ipcRenderer.on('listing-status-update', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('listing-status-update');
  },
  onBotComplete: (callback) => {
    ipcRenderer.on('bot-complete', () => callback());
    return () => ipcRenderer.removeAllListeners('bot-complete');
  },
});
