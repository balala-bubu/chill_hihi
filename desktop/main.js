'use strict';
/* chill_hihi desktop pet (macOS): a transparent, frameless, always-on-top window around the web page in "pet mode".
   - the page is served from a tiny local http server (YouTube refuses to play from file://)
   - the window ignores the mouse over transparent pixels; the page tells us when the pointer is over the pet (preload.js)
   - everything else (layout, size, performance, pause ...) lives in the menu-bar icon */
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, globalShortcut, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const WEB = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..');
const VENDOR = {
  '/vendor/three.min.js': path.join(__dirname, 'vendor', 'three.min.js'),
  '/vendor/matter.min.js': path.join(__dirname, 'vendor', 'matter.min.js'),
};
const SIZES = {
  full: { s: [160, 212], m: [200, 264], l: [260, 344] },   // a small upright window: the player with the dog lying on top
  mini: { s: [300, 220], m: [340, 250], l: [430, 315] },
};
const SIZE_NAMES = { s: '小', m: '中', l: '大' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream' };

/* ---------- settings ---------- */
const DEFAULTS = { layout: 'full', size: 'm', card: false, quality: 'balanced', autoEco: true, dog: false, follow: true, onTop: true, mediaKeys: false, x: null, y: null };
let S = { ...DEFAULTS };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function loadSettings() {
  try { S = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch (_) { S = { ...DEFAULTS }; }
  if (!SIZES[S.layout]) S.layout = DEFAULTS.layout;
  if (!SIZES[S.layout][S.size]) S.size = DEFAULTS.size;
}
let saveT = 0;
function saveSettings() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { fs.writeFileSync(settingsFile(), JSON.stringify(S, null, 2)); } catch (_) {} }, 300);
}

/* ---------- local web server ---------- */
let port = 0;
function sendFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}
function startServer() {
  const modelsDir = path.join(WEB, 'models') + path.sep;
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      if (VENDOR[p]) return sendFile(res, VENDOR[p]);
      if (p === '/index.html') {
        // use the bundled three / matter instead of the CDN, so the scene starts without a network round trip
        const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8')
          .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/build\/three\.min\.js/, '/vendor/three.min.js')
          .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/matter-js@[\d.]+\/build\/matter\.min\.js/, '/vendor/matter.min.js');
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
        return res.end(html);
      }
      if (p.startsWith('/models/')) {
        const f = path.normalize(path.join(WEB, p));
        if (f.startsWith(modelsDir)) return sendFile(res, f);
      }
      res.writeHead(404); res.end('not found');
    } catch (_) { res.writeHead(500); res.end('error'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(); }));
}

/* ---------- window ---------- */
let win = null, tray = null;
let userPaused = false, autoPaused = false, followT = 0, lastCur = { x: 1e9, y: 1e9 };

const onBattery = () => { try { return powerMonitor.isOnBatteryPower(); } catch (_) { return false; } };
const effQuality = () => (S.autoEco && onBattery() ? 'eco' : S.quality);
const pageUrl = () => `http://127.0.0.1:${port}/index.html?pet=${S.layout}&quality=${effQuality()}&dog=${S.dog ? 1 : 0}&card=${S.card ? 1 : 0}`;
const cmd = (m) => { if (win && !win.isDestroyed()) win.webContents.send('pet:cmd', m); };
const pushPaused = () => cmd({ type: 'paused', v: userPaused || autoPaused });

function fitToScreen(b) {
  const wa = screen.getDisplayMatching(b).workArea;
  return {
    ...b,
    x: Math.min(Math.max(b.x, wa.x - Math.round(b.width * 0.3)), wa.x + wa.width - Math.round(b.width * 0.7)),
    y: Math.min(Math.max(b.y, wa.y), wa.y + wa.height - Math.round(b.height * 0.6)),
  };
}
function defaultBounds(w, h) {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - w - 24, y: wa.y + wa.height - h - 24, width: w, height: h };
}
function initialBounds() {
  const [w, h] = SIZES[S.layout][S.size];
  if (S.x == null || S.y == null) return defaultBounds(w, h);
  return fitToScreen({ x: S.x, y: S.y, width: w, height: h });
}
function resizeKeepingCorner(w, h) {   // the pet stays where it is: the bottom-right corner is the anchor
  const b = win.getBounds();
  const nb = fitToScreen({ x: b.x + b.width - w, y: b.y + b.height - h, width: w, height: h });
  win.setBounds(nb);
  S.x = nb.x; S.y = nb.y; saveSettings();
}

function createWindow() {
  const b = initialBounds();
  win = new BrowserWindow({
    ...b,
    frame: false, transparent: true, hasShadow: false, backgroundColor: '#00000000',
    resizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true,
    alwaysOnTop: S.onTop, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
      autoplayPolicy: 'no-user-gesture-required',   // the music starts from a click on the pet, but later tracks must not be blocked
    },
  });
  if (process.platform === 'darwin') {
    win.setAlwaysOnTop(S.onTop, 'floating');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  if (!S.card) win.setIgnoreMouseEvents(true, { forward: true });   // transparent style: click-through until the page says the pointer is over something
  win.once('ready-to-show', () => win.showInactive());
  win.on('show', refreshMenu); win.on('hide', () => { refreshMenu(); });
  win.on('moved', () => { const p = win.getBounds(); S.x = p.x; S.y = p.y; saveSettings(); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(`http://127.0.0.1:${port}/`)) e.preventDefault(); });
  win.webContents.on('did-finish-load', () => { if (userPaused || autoPaused) pushPaused(); });
  win.loadURL(pageUrl());
}

/* ---------- actions ---------- */
function setLayout(l) {
  if (S.layout === l) return;
  S.layout = l;
  const [w, h] = SIZES[l][S.size];
  resizeKeepingCorner(w, h);
  win.loadURL(pageUrl());   // a reload: the two layouts are different scenes (the music stops, the shelf keeps your albums)
  refreshMenu();
}
function setCard(v) {   // rounded card (the original grey-white scene) or a fully transparent window with only the pet
  if (S.card === v) return;
  S.card = v; saveSettings();
  win.setIgnoreMouseEvents(!v, { forward: true });
  win.loadURL(pageUrl());
  refreshMenu();
}
function setSize(sz) {
  S.size = sz;
  const [w, h] = SIZES[S.layout][sz];
  resizeKeepingCorner(w, h);
  refreshMenu();
}
function setQuality(q) { S.quality = q; saveSettings(); cmd({ type: 'quality', v: effQuality() }); refreshMenu(); }
function setPaused(v) { userPaused = v; pushPaused(); refreshMenu(); }
function setDog(v) { S.dog = v; saveSettings(); cmd({ type: 'dog', v }); refreshMenu(); }
function setOnTop(v) {
  S.onTop = v; saveSettings();
  if (process.platform === 'darwin') win.setAlwaysOnTop(v, 'floating'); else win.setAlwaysOnTop(v);
  refreshMenu();
}
function applyMediaKeys() {
  globalShortcut.unregisterAll();
  if (!S.mediaKeys) return;
  try {
    globalShortcut.register('MediaPlayPause', () => cmd({ type: 'toggle' }));
    globalShortcut.register('MediaPreviousTrack', () => cmd({ type: 'prev' }));
    globalShortcut.register('MediaNextTrack', () => cmd({ type: 'next' }));
  } catch (_) { /* macOS may ask for accessibility permission; without it the keys just keep doing what they did */ }
}
function applyFollow() {
  clearInterval(followT); followT = 0;
  if (!S.follow) return;
  // the dog looks at the pointer anywhere on the desktop: 8 tiny messages per second, and only while the window is visible and moving
  followT = setInterval(() => {
    if (!win || win.isDestroyed() || !win.isVisible() || userPaused || autoPaused) return;
    const c = screen.getCursorScreenPoint();
    if (Math.abs(c.x - lastCur.x) + Math.abs(c.y - lastCur.y) < 3) return;
    lastCur = c;
    const b = win.getBounds();
    cmd({ type: 'cursor', x: ((c.x - b.x) / b.width) * 2 - 1, y: -(((c.y - b.y) / b.height) * 2 - 1) });
  }, 125);
}
function toggleVisible() { if (win.isVisible()) win.hide(); else win.showInactive(); }
function resetPosition() {
  const [w, h] = SIZES[S.layout][S.size];
  const b = defaultBounds(w, h);
  win.setBounds(b); S.x = b.x; S.y = b.y; saveSettings();
  if (!win.isVisible()) win.showInactive();
}

/* ---------- menu-bar icon ---------- */
function buildMenu() {
  const radio = (label, checked, click) => ({ label, type: 'radio', checked, click });
  const check = (label, checked, click) => ({ label, type: 'checkbox', checked, click: (i) => click(i.checked) });
  return Menu.buildFromTemplate([
    { label: win && win.isVisible() ? '隱藏視窗（音樂繼續）' : '顯示視窗', click: toggleVisible },
    { label: '播放／暫停', click: () => cmd({ type: 'toggle' }) },
    { label: '上一首', click: () => cmd({ type: 'prev' }) },
    { label: '下一首', click: () => cmd({ type: 'next' }) },
    { type: 'separator' },
    { label: '版面', submenu: [
      radio('完整播放器（CD 播放器、遙控器、狗狗）', S.layout === 'full', () => setLayout('full')),
      radio('迷你（狗狗＋小控制列，最省電）', S.layout === 'mini', () => setLayout('mini')),
    ] },
    { label: '視窗樣式', submenu: [
      radio('圓角卡片（灰白磨砂，像播放器）', S.card, () => setCard(true)),
      radio('透明（只有播放器和狗狗浮在桌面上）', !S.card, () => setCard(false)),
    ] },
    { label: '視窗大小', submenu: ['s', 'm', 'l'].map((k) => radio(`${SIZE_NAMES[k]}（${SIZES[S.layout][k].join('×')}）`, S.size === k, () => setSize(k))) },
    { label: '效能', submenu: [
      radio('省電：20 fps，低解析度', S.quality === 'eco', () => setQuality('eco')),
      radio('平衡：30 fps（建議）', S.quality === 'balanced', () => setQuality('balanced')),
      radio('流暢：60 fps，含陰影', S.quality === 'smooth', () => setQuality('smooth')),
      { type: 'separator' },
      check('使用電池時自動切到省電', S.autoEco, (v) => { S.autoEco = v; saveSettings(); cmd({ type: 'quality', v: effQuality() }); }),
    ] },
    check('暫停動畫（音樂繼續播放）', userPaused, setPaused),
    { type: 'separator' },
    check('狗狗', S.dog, setDog),
    check('狗狗看著桌面上的游標', S.follow, (v) => { S.follow = v; saveSettings(); applyFollow(); }),
    check('永遠置頂', S.onTop, setOnTop),
    check('接管鍵盤媒體鍵（播放／下一首）', S.mediaKeys, (v) => { S.mediaKeys = v; saveSettings(); applyMediaKeys(); }),
    { type: 'separator' },
    { label: '重設視窗位置', click: resetPosition },
    { label: '結束', role: 'quit' },
  ]);
}
function refreshMenu() { if (tray) tray.setContextMenu(buildMenu()); }
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('chill_hihi');
  refreshMenu();
}

/* ---------- start ---------- */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) win.showInactive(); });
  app.whenReady().then(async () => {
    loadSettings();
    await startServer();
    if (process.platform === 'darwin' && app.dock) app.dock.hide();   // a menu-bar app: no Dock icon
    createTray();
    createWindow();
    applyFollow();
    applyMediaKeys();

    ipcMain.on('pet:ignore', (e, b) => { if (win && e.sender === win.webContents) win.setIgnoreMouseEvents(!!b, { forward: true }); });
    ipcMain.on('pet:hide', (e) => { if (win && e.sender === win.webContents) win.hide(); });

    powerMonitor.on('on-battery', () => cmd({ type: 'quality', v: effQuality() }));
    powerMonitor.on('on-ac', () => cmd({ type: 'quality', v: effQuality() }));
    powerMonitor.on('lock-screen', () => { autoPaused = true; pushPaused(); });
    powerMonitor.on('unlock-screen', () => { autoPaused = false; pushPaused(); });
    screen.on('display-removed', () => { if (win) win.setBounds(fitToScreen(win.getBounds())); });
  });
  app.on('window-all-closed', () => { /* stay alive in the menu bar */ });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
