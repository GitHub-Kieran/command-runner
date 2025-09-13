"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Directory selection
    openDirectory: () => {
        return new Promise((resolve) => {
            electron_1.ipcRenderer.send('dialog:openDirectory');
            electron_1.ipcRenderer.once('dialog:openDirectory-reply', (_event, result) => {
                resolve(result);
            });
        });
    },
    // App information
    getAppVersion: (callback) => {
        electron_1.ipcRenderer.send('get-app-version');
        electron_1.ipcRenderer.once('get-app-version-reply', (_event, version) => {
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
