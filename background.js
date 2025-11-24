// Background service worker

// Update redirect rules based on settings
function updateRedirectRules() {
  chrome.storage.sync.get(['enabled', 'youtube', 'facebook'], (result) => {
    const enabled = result.enabled ?? false;
    const youtubeBlocking = result.youtube ?? false;
    const facebookBlocking = result.facebook ?? false;
    
    if (enabled && (youtubeBlocking || facebookBlocking)) {
      // Enable the redirect rule
      chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['shorts_redirect_rules']
      });
    } else {
      // Disable the redirect rule
      chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['shorts_redirect_rules']
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings (extension ON by default)
  chrome.storage.sync.set({ 
    enabled: true,
    youtube: true,
    facebook: true,
    instagram: true
  }, () => {
    console.log('ShortsBlocker installed with default settings (ON)');
    updateRedirectRules();
  });
});

// Listen for storage changes to update redirect rules
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && (changes.enabled || changes.youtube || changes.facebook)) {
    updateRedirectRules();
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStatus') {
    chrome.storage.sync.get(['enabled', 'youtube', 'facebook', 'instagram'], (result) => {
      sendResponse({ 
        enabled: result.enabled !== undefined ? result.enabled : false,
        youtube: result.youtube !== undefined ? result.youtube : false,
        facebook: result.facebook !== undefined ? result.facebook : false,
        instagram: result.instagram !== undefined ? result.instagram : false
      });
    });
    return true; // Keep message channel open for async response
  }
});
