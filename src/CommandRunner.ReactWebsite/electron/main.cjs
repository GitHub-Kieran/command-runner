const path = require('path');
const { spawn } = require('child_process');

// Try to get Electron APIs - this is a workaround for the module loading issue
let electron;
try {
  electron = require('electron');
} catch (e) {
  // If require fails, try to access from global
  electron = global.electron || {};
}

// If electron is still not an object, try alternative loading
if (typeof electron !== 'object' || !electron.app) {
  try {
    // Try loading individual modules
    const app = require('electron').app;
    const BrowserWindow = require('electron').BrowserWindow;
    const ipcMain = require('electron').ipcMain;
    const dialog = require('electron').dialog;
    electron = { app, BrowserWindow, ipcMain, dialog };
  } catch (e) {
    console.error('Failed to load Electron APIs:', e);
    process.exit(1);
  }
}

const { app, BrowserWindow, ipcMain, dialog, protocol } = electron;
let mainWindow = null;
let apiProcess = null;

// Disable sandbox for AppImage on Linux to prevent permission issues
if (process.platform === 'linux') {
  console.log('Running on Linux, configuring sandbox settings...');

  // Always disable sandbox for packaged apps on Linux
  if (app.isPackaged) {
    console.log('Packaged Linux app detected, disabling sandbox completely');
    app.commandLine.appendSwitch('--no-sandbox');
    app.commandLine.appendSwitch('--disable-setuid-sandbox');
    app.commandLine.appendSwitch('--disable-dev-shm-usage');
    app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
    app.commandLine.appendSwitch('--no-first-run');
    app.commandLine.appendSwitch('--no-zygote');
    app.commandLine.appendSwitch('--disable-gpu');
  }
}

// Start API server
function startApiServer() {
  console.log('Starting API server...');

  const isDev = process.env.NODE_ENV === 'development';
  const isPackaged = app.isPackaged;

  let apiPath;
  let apiArgs = [];

  if (isDev) {
    // In development, run dotnet from the API project directory
    apiPath = 'dotnet';
    apiArgs = ['run', '--project', path.join(__dirname, '../../CommandRunner.Api/CommandRunner.Api.csproj')];
  } else {
    // In production, run the published executable
    if (process.platform === 'win32') {
      apiPath = path.join(process.resourcesPath, 'api', 'CommandRunner.Api.exe');
    } else {
      // For Linux .deb packages, try multiple possible locations
      const possiblePaths = [
        path.join(process.resourcesPath, 'api', 'CommandRunner.Api'),
        path.join('/usr/lib/commandrunner-reactwebsite', 'api', 'CommandRunner.Api'),
        path.join('/opt/Command Runner', 'api', 'CommandRunner.Api'),
        path.join('/usr/share/commandrunner-reactwebsite', 'api', 'CommandRunner.Api'),
        path.join('/usr/lib/commandrunner-reactwebsite', 'CommandRunner.Api'),
        path.join('/opt/Command Runner', 'CommandRunner.Api')
      ];

      console.log('Searching for API executable...');
      console.log('Current resources path:', process.resourcesPath);

      // List contents of resources directory for debugging
      try {
        const fs = require('fs');
        const resourcesContents = fs.readdirSync(process.resourcesPath);
        console.log('Contents of resources directory:', resourcesContents);

        // Check if there's an api subdirectory
        const apiDir = path.join(process.resourcesPath, 'api');
        if (fs.existsSync(apiDir)) {
          console.log('Contents of api directory:', fs.readdirSync(apiDir));
        } else {
          console.log('No api directory found in resources');
        }
      } catch (error) {
        console.error('Error reading resources directory:', error);
      }

      console.log('Trying these locations:');
      possiblePaths.forEach(p => console.log('  -', p));

      // Find the first existing path
      for (const testPath of possiblePaths) {
        if (require('fs').existsSync(testPath)) {
          apiPath = testPath;
          break;
        }
      }

      // If no path found, log all attempted paths
      if (!apiPath) {
        console.error('API executable not found in any of these locations:');
        possiblePaths.forEach(p => console.error('  -', p));
        console.error('Available files in resources path:', require('fs').readdirSync(process.resourcesPath));
        return; // Don't start API if we can't find it
      }
    }
    apiArgs = [];
  }

  console.log('API executable path:', apiPath);
  console.log('API arguments:', apiArgs);

  // Check if the API executable exists
  if (!isDev) {
    const fs = require('fs');
    if (!fs.existsSync(apiPath)) {
      console.error('API executable not found at:', apiPath);
      console.error('Contents of API directory:', fs.readdirSync(path.dirname(apiPath)));
      return;
    }
    console.log('API executable found and is executable');
  }

  try {
    const envVars = {
      ...process.env,
      ASPNETCORE_URLS: 'http://localhost:5081',
      ASPNETCORE_ENVIRONMENT: isPackaged ? 'Production' : 'Development',
      // Ensure the API can access user data directories
      USERPROFILE: process.env.USERPROFILE,
      APPDATA: process.env.APPDATA,
      LOCALAPPDATA: process.env.LOCALAPPDATA
    };

    console.log('API working directory:', isDev ? path.join(__dirname, '../../CommandRunner.Api') : path.dirname(apiPath));
    console.log('API environment variables:', Object.keys(envVars).filter(key => key.startsWith('ASPNETCORE')));

    apiProcess = spawn(apiPath, apiArgs, {
      cwd: isDev ? path.join(__dirname, '../../CommandRunner.Api') : path.dirname(apiPath),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: envVars
    });

    apiProcess.stdout.on('data', (data) => {
      console.log('API stdout:', data.toString());
    });

    apiProcess.stderr.on('data', (data) => {
      console.error('API stderr:', data.toString());
    });

    apiProcess.on('close', (code) => {
      console.log(`API process exited with code ${code}`);
      if (code !== 0) {
        console.error(`API process exited with error code ${code}`);
      }
    });

    apiProcess.on('error', (error) => {
      console.error('Failed to start API process:', error);
      console.error('API path:', apiPath);
      console.error('API args:', apiArgs);
      console.error('Working directory:', isDev ? path.join(__dirname, '../../CommandRunner.Api') : path.dirname(apiPath));
    });

    // Add a timeout to check if the API started successfully
    setTimeout(() => {
      if (apiProcess && !apiProcess.killed) {
        console.log('API process is still running after 5 seconds');
      } else {
        console.error('API process failed to start or exited early');
      }
    }, 5000);

    console.log('API server started successfully');
  } catch (error) {
    console.error('Error starting API server:', error);
  }
}

// Stop API server
function stopApiServer() {
  if (apiProcess) {
    console.log('Stopping API server...');
    apiProcess.kill();
    apiProcess = null;
  }
}

console.log('Electron APIs loaded successfully!');
console.log('App:', !!app);
console.log('BrowserWindow:', !!BrowserWindow);

// IPC handlers
ipcMain.on('dialog:openDirectory', async (event) => {
  try {
    console.log('Opening directory dialog...');
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });

    console.log('Directory dialog result:', result);
    event.reply('dialog:openDirectory-reply', {
      canceled: result.canceled,
      filePaths: result.filePaths
    });
  } catch (error) {
    console.error('Error opening directory dialog:', error);
    event.reply('dialog:openDirectory-reply', {
      canceled: true,
      filePaths: [],
      error: error.message
    });
  }
});

ipcMain.on('get-app-version', (event) => {
  event.reply('get-app-version-reply', app.getVersion());
});

function createWindow() {
  console.log('Creating window...');

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow file:// to make requests to localhost
    },
    icon: path.join(__dirname, '../../public/favicon.ico'),
    show: false // Don't show until ready-to-show
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5175');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });
}

// App event handlers
console.log('Setting up app event handlers...');

app.on('ready', () => {
  console.log('App ready event fired');
  startApiServer();
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    stopApiServer();
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('App before-quit event fired');
  stopApiServer();
});

app.on('activate', () => {
  console.log('App activate event fired');
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});