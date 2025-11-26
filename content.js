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

// Central function to redirect Shorts URLs to watch page
let isRedirecting = false;
function redirectIfShorts() {
  if (platform !== 'youtube' || !shouldBlock()) return;
  if (isRedirecting) return; // Prevent infinite loops
  
  const currentPath = location.pathname;
  if (!currentPath.includes('/shorts/')) return;
  
  // Extract video ID from /shorts/VIDEO_ID
  const match = currentPath.match(/\/shorts\/([^/?]+)/);
  if (!match || !match[1]) return;
  
  const videoId = match[1];
  const searchParams = location.search;
  const hash = location.hash;
  
  // Construct new URL
  const newUrl = `/watch?v=${videoId}${searchParams}${hash}`;
  
  // Prevent infinite redirect loop
  isRedirecting = true;
  
  // Use location.assign for proper navigation
  location.assign(newUrl);
  
  // Reset flag after a delay
  setTimeout(() => {
    isRedirecting = false;
  }, 1000);
}

// Check if current page is a Facebook Reels URL
function isReelsUrl() {
  return platform === 'facebook' && (location.pathname.includes('/reel/') || location.pathname.includes('/reels/'));
}

// Check if current page is an Instagram Reel URL
function isInstagramReelUrl() {
  return platform === 'instagram' && location.pathname.startsWith('/reels/');
}

// Convert all Shorts links on YouTube page to watch format
function convertShortsLinks() {
  if (platform !== 'youtube' || !shouldBlock()) return;
  
  // Find all links that point to /shorts/
  const shortsLinks = document.querySelectorAll('a[href*="/shorts/"]');
  
  shortsLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes('/shorts/')) {
      // Extract video ID from /shorts/VIDEO_ID
      const match = href.match(/\/shorts\/([^/?]+)/);
      if (match && match[1]) {
        const videoId = match[1];
        // Convert to watch format, preserving query params
        const url = new URL(href, location.origin);
        const newHref = `/watch?v=${videoId}${url.search}${url.hash}`;
        link.setAttribute('href', newHref);
      }
    }
  });
  
  // Intercept click events on Shorts links
  document.addEventListener('click', handleShortsLinkClick, true);
  document.addEventListener('auxclick', handleShortsLinkClick, true); // Middle-click
}

// Handle clicks on Shorts links
function handleShortsLinkClick(e) {
  if (platform !== 'youtube' || !shouldBlock()) return;
  
  const target = e.target.closest('a[href*="/shorts/"]');
  if (!target) return;
  
  const href = target.getAttribute('href');
  if (!href || !href.includes('/shorts/')) return;
  
  // Extract video ID
  const match = href.match(/\/shorts\/([^/?]+)/);
  if (!match || !match[1]) return;
  
  const videoId = match[1];
  const url = new URL(href, location.origin);
  const newHref = `/watch?v=${videoId}${url.search}${url.hash}`;
  
  // Update href before navigation
  target.setAttribute('href', newHref);
}

// Hide Facebook Reels sections
function hideFacebookReels() {
  if (platform !== 'facebook' || !shouldBlock()) return;
  
  // Hide Reels sections in feed
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

// Hide Instagram Reels sections
function hideInstagramReels() {
  if (platform !== 'instagram' || !shouldBlock()) return;
  // Hide only the Reels navigation link to avoid collapsing layout
  const reelsLink = document.querySelector('a[role="link"][href="/reels/"]');
  if (!reelsLink) return;
  reelsLink.style.setProperty('display', 'none', 'important');
}

// Apply blocking logic
function applyBlocking() {
  if (platform === 'youtube') {
    redirectIfShorts();
    convertShortsLinks();
  }
  if (shouldBlock() && platform === 'facebook') {
    hideFacebookReels();
  }
  if (shouldBlock() && platform === 'instagram') {
    hideInstagramReels();
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

// Listen to YouTube's custom navigation events
if (platform === 'youtube') {
  document.addEventListener('yt-navigate-start', () => {
    redirectIfShorts();
    convertShortsLinks();
  });

  document.addEventListener('yt-navigate-finish', () => {
    redirectIfShorts();
    convertShortsLinks();
  });

  document.addEventListener('yt-page-data-updated', () => {
    redirectIfShorts();
    convertShortsLinks();
  });
  
  // Additional YouTube-specific events
  window.addEventListener('yt-navigate-start', redirectIfShorts);
  window.addEventListener('yt-navigate-finish', redirectIfShorts);
  window.addEventListener('yt-page-data-updated', redirectIfShorts);
}

// Intercept history API to convert Shorts URLs before navigation
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(state, title, url) {
  // Check if URL is being changed to a Shorts URL
  if (platform === 'youtube' && shouldBlock() && typeof url === "string" && url.includes("/shorts/")) {
    const match = url.match(/\/shorts\/([^/?]+)/);
    if (match && match[1]) {
      const videoId = match[1];
      // Parse URL to preserve query params and hash
      try {
        const urlObj = new URL(url, location.origin);
        url = `/watch?v=${videoId}${urlObj.search}${urlObj.hash}`;
      } catch (e) {
        url = url.replace(/\/shorts\/([^/?]+)/, "/watch?v=$1");
      }
    }
  }
  
  const result = originalPushState.call(this, state, title, url);
  
  // Call redirectIfShorts after state change
  if (platform === 'youtube') {
    setTimeout(redirectIfShorts, 0);
  }
  
  handleNavigation();
  return result;
};

history.replaceState = function(state, title, url) {
  // Check if URL is being changed to a Shorts URL
  if (platform === 'youtube' && shouldBlock() && typeof url === "string" && url.includes("/shorts/")) {
    const match = url.match(/\/shorts\/([^/?]+)/);
    if (match && match[1]) {
      const videoId = match[1];
      // Parse URL to preserve query params and hash
      try {
        const urlObj = new URL(url, location.origin);
        url = `/watch?v=${videoId}${urlObj.search}${urlObj.hash}`;
      } catch (e) {
        url = url.replace(/\/shorts\/([^/?]+)/, "/watch?v=$1");
      }
    }
  }
  
  const result = originalReplaceState.call(this, state, title, url);
  
  // Call redirectIfShorts after state change
  if (platform === 'youtube') {
    setTimeout(redirectIfShorts, 0);
  }
  
  handleNavigation();
  return result;
};

// Block ArrowUp/ArrowDown navigation on Facebook Reels when enabled
window.addEventListener('keydown', function(e) {
  if (platform !== 'facebook' || !shouldBlock() || !isReelsUrl()) return;
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  // Allow typing inside inputs/textareas/contentEditable
  const ae = document.activeElement;
  const isTyping = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
  if (isTyping) return;
  e.stopImmediatePropagation?.();
  e.stopPropagation();
  e.preventDefault();
}, true);

// Monitor DOM changes for dynamically loaded content
const observer = new MutationObserver(() => {
  if (platform === 'youtube') {
    // Check if we're on a Shorts URL after DOM changes
    redirectIfShorts();
    convertShortsLinks();
  }
  if (shouldBlock() && platform === 'facebook') {
    hideFacebookReels();
  }
  if (shouldBlock() && platform === 'instagram') {
    hideInstagramReels();
  }
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
// Run Instagram Reels hiding every 2 seconds if on Instagram
if (platform === 'instagram') {
  setInterval(() => {
    if (shouldBlock()) {
      hideInstagramReels();
    }
  }, 2000);
}
