console.log('Starting minimal Electron app...');
console.log('Node version:', process.version);
console.log('Electron version:', process.versions.electron);

try {
  // Try loading individual modules instead of destructuring
  const app = require('electron').app;
  const BrowserWindow = require('electron').BrowserWindow;
  console.log('Electron APIs loaded individually');
  console.log('App type:', typeof app);
  console.log('BrowserWindow type:', typeof BrowserWindow);

  let mainWindow;

  function createWindow() {
    console.log('Creating window...');
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true
      }
    });

    mainWindow.loadURL('data:text/html,<h1>Hello Electron!</h1><p>Minimal test successful</p>');

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.on('ready', () => {
    console.log('App ready');
    createWindow();
  });

  app.on('window-all-closed', () => {
    console.log('All windows closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

} catch (error) {
  console.error('Failed to load Electron:', error);
  process.exit(1);
}