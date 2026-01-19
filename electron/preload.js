const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, ...args) => callback(...args)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, ...args) => callback(...args)),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged,
});

