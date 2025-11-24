// Content script that runs on social media pages
let settings = {
  enabled: false,
  youtube: false,
  facebook: false,
  instagram: false
};

const platform = detectPlatform();
let lastUrl = location.href;

// Platform detection
function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('youtube.com')) return 'youtube';
  if (hostname.includes('facebook.com')) return 'facebook';
  if (hostname.includes('instagram.com')) return 'instagram';
  return null;
}

// Update HTML attributes based on settings
function updateHtmlAttributes() {
  const html = document.documentElement;
  html.setAttribute('shorts_blocker_enabled', settings.enabled.toString());
  html.setAttribute('block_yt_shorts', settings.youtube.toString());
  html.setAttribute('block_fb_shorts', settings.facebook.toString());
  html.setAttribute('block_ig_shorts', settings.instagram.toString());
  html.setAttribute('data-shorts-blocker-platform', platform || 'none');
}

// Load settings from storage
function loadSettings(callback) {
  chrome.storage.sync.get(['enabled', 'youtube', 'facebook', 'instagram'], (result) => {
    settings.enabled = result.enabled ?? false;
    settings.youtube = result.youtube ?? false;
    settings.facebook = result.facebook ?? false;
    settings.instagram = result.instagram ?? false;
    updateHtmlAttributes(); // Apply attributes immediately after loading
    callback();
  });
}

// Check if blocking should be applied
function shouldBlock() {
  if (!settings.enabled) return false;
  return (platform === 'youtube' && settings.youtube) ||
         (platform === 'facebook' && settings.facebook) ||
         (platform === 'instagram' && settings.instagram);
}

// Check if current page is a Shorts URL
function isShortsUrl() {
  return platform === 'youtube' && location.pathname.includes('/shorts/');
}

// Check if current page is a Facebook Reels URL
function isReelsUrl() {
  return platform === 'facebook' && (location.pathname.includes('/reel/') || location.pathname.includes('/reels/'));
}

// Redirect from Shorts to homepage
function redirectFromShorts() {
  if (!isShortsUrl() || !shouldBlock()) return;
  
  const homeButton = document.querySelector('a#logo, ytd-topbar-logo-renderer a, .ytd-masthead a#logo');
  if (homeButton) {
    homeButton.click();
  } else {
    window.location.href = 'https://www.youtube.com';
  }
}

// Redirect from Facebook Reels to homepage
function redirectFromReels() {
  if (!isReelsUrl() || !shouldBlock()) return;
  
  window.location.href = 'https://www.facebook.com';
}

// Hide Facebook Reels sections
function hideFacebookReels() {
  if (platform !== 'facebook' || !shouldBlock()) return;
  
  const feedPostsH3 = Array.from(document.querySelectorAll('h3')).find(h3 => h3.textContent.trim() === 'Feed posts');
  if (!feedPostsH3) return;
  
  const parent = feedPostsH3.parentElement;
  if (!parent) return;
  
  const secondDiv = parent.children[2];
  if (!secondDiv) return;
  
  Array.from(secondDiv.children).forEach(childDiv => {
    const reelsH3 = Array.from(childDiv.querySelectorAll('h3')).find(h3 => h3.textContent.trim() === 'Reels');
    if (reelsH3) {
      childDiv.style.setProperty('display', 'none', 'important');
    }
  });
}

// Apply blocking logic
function applyBlocking() {
  redirectFromShorts();
  redirectFromReels();
  if (shouldBlock() && platform === 'facebook') {
    hideFacebookReels();
  }
}

// Handle URL changes in SPA
function handleNavigation() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (shouldBlock()) {
      applyBlocking();
    }
  }
}

// Apply default attributes immediately before async operations
updateHtmlAttributes();

// Initialize
loadSettings(() => {
  applyBlocking();
});

// Listen for settings updates from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateSettings') {
    loadSettings(() => {
      applyBlocking();
    });
  }
});

// Monitor URL changes (YouTube SPA navigation)
window.addEventListener('popstate', handleNavigation);

const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(this, args);
  handleNavigation();
};

history.replaceState = function(...args) {
  originalReplaceState.apply(this, args);
  handleNavigation();
};

// Monitor DOM changes for dynamically loaded content
const observer = new MutationObserver(() => {
  redirectFromShorts();
  redirectFromReels();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Run Facebook Reels hiding every 2 seconds if on Facebook
if (platform === 'facebook') {
  setInterval(() => {
    if (shouldBlock()) {
      hideFacebookReels();
    }
  }, 2000);
}
