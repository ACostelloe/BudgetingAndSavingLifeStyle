const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure auto-updater
autoUpdater.setAutoDownload(true);
autoUpdater.setAutoInstallOnAppQuit(true);
autoUpdater.checkForUpdatesAndNotify();

let mainWindow;
let serverProcess;

// Keep a global reference of the window object
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates on startup (only in production)
    // Also check periodically (every 4 hours)
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
      setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 4 * 60 * 60 * 1000); // 4 hours
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Uncomment to open DevTools in development
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, serve from the built client
    // The server will serve static files, so we load from localhost
    mainWindow.loadURL('http://localhost:5000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start the backend server
function startServer() {
  if (isDev) {
    // In development, server runs separately
    return;
  }

  const { spawn } = require('child_process');
  const serverPath = path.join(__dirname, '../server/dist/index.js');
  
  // Set Electron user data path for database persistence
  const userDataPath = app.getPath('userData');
  
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_USER_DATA: userDataPath,
    },
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('Update available.');
});

autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('Update not available.');
});

autoUpdater.on('error', (err) => {
  sendStatusToWindow('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
  sendStatusToWindow(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('Update downloaded');
  // Prompt user to restart
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

function sendStatusToWindow(text) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', text);
  }
}

// IPC handlers
ipcMain.handle('restart-app', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('check-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// App event handlers
app.whenReady().then(() => {
  createWindow();
  startServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

