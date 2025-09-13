import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Directory selection
  openDirectory: () => {
    return new Promise((resolve) => {
      ipcRenderer.send('dialog:openDirectory');
      ipcRenderer.once('dialog:openDirectory-reply', (_event, result) => {
        resolve(result);
      });
    });
  },

  // App information
  getAppVersion: (callback: (version: string) => void) => {
    ipcRenderer.send('get-app-version');
    ipcRenderer.once('get-app-version-reply', (_event, version) => {
      callback(version);
    });
  },

  // Platform information
  platform: process.platform,

  // Version information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      openDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      getAppVersion: () => Promise<string>;
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
  }
}