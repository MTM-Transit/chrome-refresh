# Dashboard Auto Refresh & Click Chrome Extension

A Chrome extension that automatically refreshes web pages and clicks specified buttons at customizable intervals. Perfect for monitoring dashboards, auto-refreshing pages, or automating repetitive click actions.

## Features

- 🔄 Automatic page refresh at specified intervals
- 🖱️ Automatic button clicking after page refresh
- ⏲️ Configurable wait time between refresh and button click
- 🎯 Custom CSS selector support for button targeting
- 📊 Active tab status monitoring
- 💾 Persistent settings across browser sessions

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the extension directory

## How to Use

1. Click the extension icon in your Chrome toolbar to open the popup interface
2. Configure the following settings:
   - **Refresh Interval**: Set how often the page should refresh (in seconds)
   - **Wait Time**: Set how long to wait after refresh before clicking the button (in seconds)
   - **Button CSS Selector**: Enter the CSS selector for the button to click (optional) (e.g. #my-button)
3. Click "Start Auto-Refresh" to begin the automation
4. The extension will display the currently configured tab URL when active

## Technical Details

The extension uses Chrome's Manifest V3 and requires the following permissions:
- `storage`: For saving settings
- `activeTab`: For accessing the current tab
- `scripting`: For executing scripts on the page
- `tabs`: For tab management
- `host_permissions`: For accessing all URLs

## Notes

- The extension will continue running until you click "Stop Auto-Refresh" or close the browser
- Settings are saved automatically and persist between browser sessions
- You can monitor the active status in the popup window
- The extension works on any website (requires appropriate permissions)