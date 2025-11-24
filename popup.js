// Popup script
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const mainToggle = document.getElementById('mainToggle');
const statusText = document.getElementById('statusText');
const youtubeToggle = document.getElementById('youtubeToggle');
const facebookToggle = document.getElementById('facebookToggle');
const instagramToggle = document.getElementById('instagramToggle');
const mainSettingToggle = document.getElementById('mainSettingToggle');
const switchView = document.getElementById('switchView');
const coffeeView = document.getElementById('coffeeView');
const paypalLink = document.getElementById('paypalLink');
const switchContainer = document.querySelector('.switch-container');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Initialization flag to skip animations on first paint
let initialized = false;

// Load saved state
chrome.storage.sync.get(['enabled', 'youtube', 'facebook', 'instagram', 'paypalUrl', 'theme'], (result) => {
  const enabled = result.enabled !== undefined ? result.enabled : false;
  const youtube = result.youtube !== undefined ? result.youtube : false;
  const facebook = result.facebook !== undefined ? result.facebook : false;
  const instagram = result.instagram !== undefined ? result.instagram : false;
  const theme = result.theme === 'dark' ? 'dark' : 'light';
  
  mainToggle.checked = enabled;
  mainSettingToggle.checked = enabled;
  youtubeToggle.checked = youtube;
  facebookToggle.checked = facebook;
  instagramToggle.checked = instagram;
  
  // Set donation link
  paypalLink.href = result.paypalUrl || '#';
  
  updateStatus(enabled);
  // Show initial view without transition
  showInitialView(enabled);
  applyTheme(theme);
  setThemeIcon(theme);
  initialized = true;
});
// Theme toggle
themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('theme-dark');
  const newTheme = isDark ? 'light' : 'dark';
  chrome.storage.sync.set({ theme: newTheme }, () => {
    applyTheme(newTheme);
    setThemeIcon(newTheme);
  });
});

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
}

function setThemeIcon(theme) {
  if (theme === 'dark') {
    themeToggleBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  } else {
    themeToggleBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>';
  }
}

// Navigation
settingsBtn.addEventListener('click', () => {
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
});

backBtn.addEventListener('click', () => {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
  // Reflect current state on landing when returning
  updateView(mainToggle.checked);
});

// Main toggle
mainToggle.addEventListener('change', () => {
  const enabled = mainToggle.checked;
  
  chrome.storage.sync.set({ enabled }, () => {
    updateStatus(enabled);
    // Delay view switch to allow animations to complete
    setTimeout(() => {
      updateView(enabled);
    }, enabled ? 1400 : 0);
    mainSettingToggle.checked = enabled;
    notifyContentScripts();
  });
});

// Main setting toggle (in settings page)
mainSettingToggle.addEventListener('change', () => {
  const enabled = mainSettingToggle.checked;
  chrome.storage.sync.set({ enabled }, () => {
    mainToggle.checked = enabled;
    updateStatus(enabled);
    // Delay view switch to allow animations to complete
    setTimeout(() => {
      updateView(enabled);
    }, enabled ? 1400 : 0);
    notifyContentScripts();
  });
});


// Platform-specific toggles
youtubeToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ youtube: youtubeToggle.checked }, () => {
    notifyContentScripts();
  });
});

facebookToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ facebook: facebookToggle.checked }, () => {
    notifyContentScripts();
  });
});

instagramToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ instagram: instagramToggle.checked }, () => {
    notifyContentScripts();
  });
});

function updateStatus(enabled) {
  statusText.textContent = enabled ? 'Extension is ON' : 'Extension is OFF';
  if (enabled) {
    statusText.classList.add('enabled');
  } else {
    statusText.classList.remove('enabled');
  }
}

function updateView(enabled) {
  // Avoid transition flicker before initialization
  if (!initialized) {
    if (enabled) {
      switchView.classList.add('hidden');
      coffeeView.classList.remove('hidden');
    } else {
      coffeeView.classList.add('hidden');
      switchView.classList.remove('hidden');
    }
    return;
  }
  if (enabled) {
    if (switchView.classList.contains('hidden')) return; // already showing coffee
    // crossfade to coffee view
    switchView.classList.add('fading-out');
    coffeeView.classList.remove('hidden');
    coffeeView.classList.add('fading-in');
    setTimeout(() => {
      switchView.classList.add('hidden');
      switchView.classList.remove('fading-out');
      coffeeView.classList.remove('fading-in');
    }, 500);
  } else {
    if (coffeeView.classList.contains('hidden')) return; // already showing switch
    coffeeView.classList.add('fading-out');
    switchView.classList.remove('hidden');
    switchView.classList.add('fading-in');
    setTimeout(() => {
      coffeeView.classList.add('hidden');
      coffeeView.classList.remove('fading-out');
      switchView.classList.remove('fading-in');
    }, 500);
  }
}

function showInitialView(enabled) {
  if (enabled) {
    switchView.classList.add('hidden');
    coffeeView.classList.remove('hidden');
  } else {
    coffeeView.classList.add('hidden');
    switchView.classList.remove('hidden');
  }
}


function notifyContentScripts() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && (tab.url.includes('youtube.com') || tab.url.includes('facebook.com') || tab.url.includes('instagram.com'))) {
        chrome.tabs.sendMessage(tab.id, { action: 'updateSettings' }).catch(() => {
          // Ignore errors for tabs without content script
        });
      }
    });
  });
}
