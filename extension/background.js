// Keyboard shortcut (default Alt+Shift+C, changeable at chrome://extensions/shortcuts) toggles the floating player,
// and the toolbar icon shows "關" while it is off.
const badge = on => { chrome.action.setBadgeText({text: on ? '' : '關'}); chrome.action.setBadgeBackgroundColor({color: '#666'}); };
const get = () => new Promise(r => chrome.storage.local.get(['enabled'], d => r(d.enabled !== false)));
chrome.commands.onCommand.addListener(async cmd => { if (cmd === 'toggle-widget') chrome.storage.local.set({enabled: !(await get())}); });
chrome.storage.onChanged.addListener(c => { if (c.enabled) badge(c.enabled.newValue !== false); });
chrome.runtime.onStartup.addListener(async () => badge(await get()));
chrome.runtime.onInstalled.addListener(async () => badge(await get()));
