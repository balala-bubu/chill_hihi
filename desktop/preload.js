/* The page talks to the shell only through this small bridge (see PET.bridge in src/01-core/02-pet-config.js). */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petBridge', {
  platform: process.platform,
  setIgnore: (b) => ipcRenderer.send('pet:ignore', !!b),   // true: mouse clicks pass through to the desktop
  hide: () => ipcRenderer.send('pet:hide'),
  onCmd: (fn) => ipcRenderer.on('pet:cmd', (_e, m) => fn(m)),
});
