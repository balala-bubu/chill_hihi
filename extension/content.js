/* chill_hihi floating player: puts the transparent player page in an iframe over whatever tab you are on.
   - Shadow DOM so the host page's CSS cannot touch it; the iframe is click-through except where the player is drawn.
   - A private MessagePort talks to the player page (the host page cannot listen in).
   - Only the visible tab shows the player (a "lease" in chrome.storage); what is playing is handed over, so it carries on. */
(() => {
  const DEF = {enabled: true, dog: false, size: 'm', quality: 'balanced', pos: null, w: null,
    url: 'https://balala-bubu.github.io/chill_hihi/'};
  const SIZES = {s: [160, 212], m: [200, 264], l: [260, 344]};
  const ID = Math.random().toString(36).slice(2);
  const st = chrome.storage.local;
  let cfg = {...DEF}, host = null, frame = null, grip = null, port = null, mounted = false, mountT = 0, playerOrigin = '';
  let ign = true, inRect = false, helloT = 0, gotHello = false, aliveT = 0;

  const get = keys => new Promise(r => st.get(keys, r));
  const set = o => new Promise(r => st.set(o, r));
  const playerUrl = () => { try { const u = new URL(cfg.url || DEF.url); u.searchParams.set('pet', 'full'); u.searchParams.set('ext', '1'); return u.href; } catch (e) { return ''; } };
  const originOf = u => { try { return new URL(u).origin; } catch (e) { return ''; } };

  /* ---- position: distance from the right / bottom edge, clamped to the window ---- */
  const RATIO = 264 / 200, MINW = 110;
  const dims = () => { if (cfg.w) { const w = Math.round(Math.max(MINW, Math.min(cfg.w, innerWidth - 8, (innerHeight - 8) / RATIO))); return [w, Math.round(w * RATIO)]; } return SIZES[cfg.size] || SIZES.m; };
  const place = () => {
    if (!host) return;
    const [w, h] = dims(), p = cfg.pos || {r: 16, b: 16};
    const r = Math.max(0, Math.min(innerWidth - w, p.r)), b = Math.max(0, Math.min(innerHeight - h, p.b));
    host.style.cssText = `all:initial;position:fixed;z-index:2147483647;right:${r}px;bottom:${b}px;width:${w}px;height:${h}px;pointer-events:none;`;
  };
  const rect = () => frame ? frame.getBoundingClientRect() : null;

  /* ---- the player page can ask for clicks (ign=false) or let them pass through (ign=true) ---- */
  const setIgn = v => { ign = v; if (frame) frame.style.pointerEvents = v ? 'none' : 'auto'; };

  /* ---- while click-through, the host page gets the mouse; forward the position so the player can see when you hover it ---- */
  let lastMove = 0;
  const onMove = e => {
    if (!mounted || !port) return;
    const r = rect(); if (!r) return;
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (inside !== inRect) { inRect = inside; if (grip) grip.style.cssText = gripCss(inside || dragging); if (!inside) port.postMessage({t: 'move', x: -1, y: -1}); }
    if (inside && ign) {
      const now = performance.now(); if (now - lastMove < 30) return; lastMove = now;
      port.postMessage({t: 'move', x: e.clientX - r.left, y: e.clientY - r.top});
    }
  };
  const onDown = () => { if (port) port.postMessage({t: 'activate'}); };   // the first click on the page lifts the browser's autoplay block

  /* ---- drag handle + close button, shown while the pointer is over the player ---- */
  let dragging = false;
  const gripCss = on => `position:absolute;left:0;top:0;height:22px;display:flex;gap:2px;align-items:center;padding:2px;border-radius:0 0 8px 0;background:rgba(40,44,50,.55);opacity:${on ? 1 : 0};pointer-events:${on ? 'auto' : 'none'};transition:opacity .15s;font:12px system-ui;color:#fff;`;
  function buildGrip(root) {
    grip = document.createElement('div'); grip.style.cssText = gripCss(false);
    const mv = document.createElement('span'); mv.textContent = '⠿ 移動'; mv.style.cssText = 'cursor:grab;padding:0 6px;user-select:none;';
    const x = document.createElement('span'); x.textContent = '✕'; x.title = '關閉懸浮播放器（可在擴充功能圖示重新開啟）'; x.style.cssText = 'cursor:pointer;padding:0 6px;user-select:none;';
    const rz = document.createElement('span'); rz.textContent = '⤡'; rz.title = '拖曳縮放'; rz.style.cssText = 'cursor:nwse-resize;padding:0 6px;user-select:none;';
    grip.append(mv, rz, x); root.append(grip);
    rz.addEventListener('pointerdown', e => {   // the player is anchored bottom-right, so dragging up-left makes it bigger
      e.preventDefault(); dragging = true; rz.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, w0 = dims()[0];
      const mvf = ev => { cfg.w = w0 - Math.min(ev.clientX - sx, (ev.clientY - sy) / RATIO); place(); };
      const up = () => { dragging = false; rz.removeEventListener('pointermove', mvf); rz.removeEventListener('pointerup', up); cfg.w = dims()[0]; set({w: cfg.w}); };
      rz.addEventListener('pointermove', mvf); rz.addEventListener('pointerup', up);
    });
    x.addEventListener('click', () => set({enabled: false}));
    mv.addEventListener('pointerdown', e => {
      e.preventDefault(); dragging = true; mv.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, p0 = cfg.pos || {r: 16, b: 16};
      const mvf = ev => { cfg.pos = {r: p0.r - (ev.clientX - sx), b: p0.b - (ev.clientY - sy)}; place(); };
      const up = () => { dragging = false; mv.removeEventListener('pointermove', mvf); mv.removeEventListener('pointerup', up); set({pos: cfg.pos}); };
      mv.addEventListener('pointermove', mvf); mv.addEventListener('pointerup', up);
    });
  }

  /* ---- mount / unmount ---- */
  async function mount() {
    if (mounted || !cfg.enabled || !playerUrl()) return;
    mounted = true; gotHello = false;
    host = document.createElement('chillhihi-widget');
    const root = host.attachShadow({mode: 'closed'});
    frame = document.createElement('iframe');
    frame.setAttribute('allow', 'autoplay; encrypted-media');
    frame.setAttribute('title', 'chill_hihi player');
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;color-scheme:normal;pointer-events:none;';
    root.append(frame); buildGrip(root); place();
    (document.body || document.documentElement).append(host);
    ign = true;
    frame.addEventListener('mouseleave', () => { if (port) port.postMessage({t: 'move', x: -1, y: -1}); });
    frame.addEventListener('load', () => {
      const ch = new MessageChannel(); port = ch.port1;
      port.onmessage = onPort;
      frame.contentWindow.postMessage({chp: 'port'}, playerOrigin, [ch.port2]);
    });
    frame.src = playerUrl();
    // no answer from the player page: say why in plain words instead of showing nothing
    helloT = setTimeout(() => { if (!mounted || gotHello || !root) return; const n = document.createElement('div');
      n.textContent = '播放器沒有載入：這個網站可能擋住了嵌入，或 GitHub Pages 還沒更新（網址：' + (cfg.url || '') + '）。';
      n.style.cssText = 'position:absolute;left:0;right:0;bottom:0;padding:8px;font:12px/1.4 system-ui;color:#fff;background:rgba(40,44,50,.85);border-radius:8px;pointer-events:none;';
      root.append(n); setTimeout(() => n.remove(), 12000); }, 8000);
  }
  function unmount() {
    if (!mounted) return;
    mounted = false; inRect = false; clearTimeout(helloT); clearInterval(aliveT);
    try { port && port.close(); } catch (e) {}
    port = null; host && host.remove(); host = frame = grip = null;
  }

  async function onPort(e) {
    const m = e.data || {};
    switch (m.chp) {
      case 'hello': {
        gotHello = true; clearInterval(aliveT); const beat = () => set({alive: Date.now()}); beat(); aliveT = setInterval(beat, 3000);
        const d = await get(['ls', 'state']);
        port && port.postMessage({t: 'init', ls: d.ls || {}, state: d.state || null, settings: {dog: cfg.dog, quality: cfg.quality}});
        break;
      }
      case 'ign': setIgn(!!m.v); break;
      case 'ls': {   // mirror of the player's localStorage: the player's own origin storage would be per-site-partitioned inside an iframe
        const d = await get(['ls']); const ls = d.ls || {};
        if (m.v === null) delete ls[m.k]; else ls[m.k] = m.v;
        set({ls}); break;
      }
      case 'state': set({state: m.v}); break;
      case 'dog': cfg.dog = !!m.v; set({dog: cfg.dog}); break;
      case 'hide': set({enabled: false}); break;
    }
  }

  /* ---- only the visible tab shows the player ---- */
  const claim = () => { if (document.visibilityState === 'visible' && cfg.enabled) { set({lease: ID}); clearTimeout(mountT); mountT = setTimeout(mount, 350); } };

  /* ---- the player's own site: marker + on/off switch for its menu, no floating copy there ---- */
  function ownSite() {
    document.documentElement.dataset.chillhihiExt = '1';
    let alive = 0, state = null;
    const send = () => postMessage({chillhihi: 'widget-state', enabled: !!cfg.enabled, alive, state}, location.origin);
    addEventListener('message', e => {
      if (e.source !== window || !e.data) return;
      if (e.data.chillhihi === 'query-widget') send();
      else if (e.data.chillhihi === 'toggle-widget') set({enabled: !cfg.enabled});
      else if (e.data.chillhihi === 'site-cmd' && e.data.cmd && typeof e.data.cmd.a === 'string') set({cmd: {...e.data.cmd, id: Math.random()}});   // this page remote-controls the floating player
    });
    chrome.storage.onChanged.addListener(c => {
      if (c.enabled) cfg.enabled = c.enabled.newValue !== false;
      if (c.alive) alive = c.alive.newValue || 0;
      if (c.state) state = c.state.newValue || null;
      if (c.enabled || c.alive || c.state) send();
    });
    get(['alive', 'state']).then(d => { alive = d.alive || 0; state = d.state || null; send(); });
  }

  async function start() {
    const d = await get(Object.keys(DEF)); cfg = {...DEF, ...d};
    playerOrigin = originOf(cfg.url || DEF.url);
    if (location.origin === playerOrigin) { ownSite(); return; }
    addEventListener('mousemove', onMove, {capture: true, passive: true});
    addEventListener('pointerdown', onDown, {capture: true, passive: true});
    addEventListener('resize', place);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') claim(); });
    chrome.storage.onChanged.addListener(c => {
      for (const k of Object.keys(c)) if (k in DEF) cfg[k] = c[k].newValue === undefined ? DEF[k] : c[k].newValue;
      if (c.cmd && c.cmd.newValue && port && gotHello) port.postMessage({t: 'cmd', m: {type: 'site', c: c.cmd.newValue}});
      if (c.lease && c.lease.newValue !== ID) { clearTimeout(mountT); unmount(); }
      if (c.enabled) { cfg.enabled ? claim() : unmount(); }
      if (c.url) { unmount(); playerOrigin = originOf(cfg.url); claim(); }
      if (c.size || c.pos || c.w) place();
            if (port && c.quality) port.postMessage({t: 'cmd', m: {type: 'quality', v: cfg.quality}});
    });
    claim();
  }
  start();
})();
