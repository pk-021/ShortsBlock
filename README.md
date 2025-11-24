# ShortsBlocker Chrome Extension

A Chrome extension built with Manifest V3 to block YouTube Shorts.

## Features

- Blocks YouTube Shorts on the homepage
- Hides Shorts tab in navigation
- Redirects Shorts URLs to regular video format
- Toggle on/off from popup interface
- Persistent settings using Chrome Storage API

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `ShortsBlocker` folder

## Files Structure

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html` - Popup interface HTML
- `popup.css` - Popup styling
- `popup.js` - Popup functionality
- `content.js` - Content script that runs on YouTube pages
- `background.js` - Background service worker
- `icons/` - Extension icons (16x16, 48x48, 128x128)

## Development

This extension uses:
- **Manifest V3** (latest Chrome extension manifest version)
- Service Workers (replaces background pages)
- Chrome Storage API for settings persistence
- Content Scripts for page manipulation
- Message passing between components

## Note

You'll need to add an icon file (`icon.png`) to the `icons/` folder before loading the extension in Chrome.
