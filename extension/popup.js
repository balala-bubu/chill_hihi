const D = {enabled: true, dog: false, size: 'm', quality: 'balanced', url: 'https://balala-bubu.github.io/chill_hihi/'};
chrome.storage.local.get(Object.keys(D), d => {
  const c = {...D, ...d};
  for (const k of Object.keys(D)) {
    const el = document.getElementById(k);
    if (el.type === 'checkbox') { el.checked = !!c[k]; el.onchange = () => chrome.storage.local.set({[k]: el.checked}); }
    else { el.value = c[k]; el.onchange = () => chrome.storage.local.set({[k]: el.value.trim() || D[k]}); }
  }
});
document.getElementById('reset').onclick = () => chrome.storage.local.set({pos: null});
