// background.js
let refreshTimer = null;
let cycleCount = 0;

let configuredTabId = null;
let configuredTabUrl = null;

// Send a message to the configured tab's content script with retry
async function sendMessageToTab(message, maxRetries = 5) {
  if (!configuredTabId) return null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chrome.tabs.sendMessage(configuredTabId, message);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Wait a bit before retrying to allow content script to load
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return null;
}

// Log to both background console and active tab's console
async function log(message, isError = false) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  
  // Log in background context
  isError ? console.error(logMessage) : console.log(logMessage);
  
  // Log in configured tab's console
  if (configuredTabId) {
    chrome.scripting.executeScript({
      target: {tabId: configuredTabId},
      func: (msg, isErr) => {
        if (isErr) {
          console.error(msg);
        } else {
          console.log(msg);
        }
      },
      args: [logMessage, isError]
    }).catch(() => {}); // Ignore errors if page is loading
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle the message asynchronously
  (async () => {
    try {
      if (message.action === 'start') {
        // Get current tab info for configuration
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tabs[0]) {
          throw new Error('No active tab found');
        }
        configuredTabId = tabs[0].id;
        configuredTabUrl = tabs[0].url;
        
        await log(`Starting auto-refresh cycle for tab ${configuredTabId} (${configuredTabUrl}) with settings: ${JSON.stringify(message.settings)}`);
        await startRefreshCycle(message.settings);
        sendResponse({ status: 'started' });
      } else if (message.action === 'stop') {
        await log(`Stopping auto-refresh cycle for tab ${configuredTabId}`);
        await stopRefreshCycle();
        configuredTabId = null;
        configuredTabUrl = null;
        sendResponse({ status: 'stopped' });
      }
    } catch (error) {
      await log(`Error in message handler: ${error.message}`, true);
      sendResponse({ status: 'error', message: error.message });
    }
  })();
  return true; // Keep message channel open for sendResponse
});

async function startRefreshCycle(settings) {
  try {
    // Clear any existing timer
    await stopRefreshCycle();
    cycleCount = 0;
    
    await log(`Starting refresh cycle with interval: ${settings.refreshInterval}s, wait time: ${settings.waitTime}s`);
    
    // Define the recursive refresh function
    const doRefreshCycle = async () => {
      try {
        cycleCount++;
        const currentTime = new Date().toLocaleTimeString();
        
        // Verify configured tab still exists
        try {
          await chrome.tabs.get(configuredTabId);
        } catch (error) {
          await log('Configured tab no longer exists', true);
          await stopRefreshCycle();
          return;
        }
        
        // Log refresh initiation
        await log(`Cycle #${cycleCount}: Initiating refresh at ${currentTime}`);
        
        // Refresh the page and wait for content script to be ready
        await log(`Cycle #${cycleCount}: Refreshing page and waiting for content script`);
        await new Promise((resolve) => {
          // Listen for content script ready message
          const listener = async (message, sender) => {
            if (message.action === 'contentScriptReady' && sender.tab.id === configuredTabId) {
              chrome.runtime.onMessage.removeListener(listener);
              await log(`Cycle #${cycleCount}: Content script ready`);
              resolve();
            }
          };
          chrome.runtime.onMessage.addListener(listener);
          
          // Refresh the page
          chrome.tabs.reload(configuredTabId);
        });

        // Start countdown for wait time
        const waitEndTime = Date.now() + (settings.waitTime * 1000);
        const waitInterval = setInterval(async () => {
          const remaining = Math.ceil((waitEndTime - Date.now()) / 1000);
          if (remaining <= 0) {
            clearInterval(waitInterval);
            return;
          }
          await sendMessageToTab({
            action: 'updateTimer',
            label: 'Time until button click',
            remainingSeconds: remaining
          });
        }, 1000);

        await log(`Cycle #${cycleCount}: Waiting ${settings.waitTime}s before clicking button`);
        await new Promise(resolve => setTimeout(resolve, settings.waitTime * 1000));
        clearInterval(waitInterval);
        
        // Attempt button click
        await log(`Cycle #${cycleCount}: Attempting to click button ${settings.buttonSelector}`);
        const response = await sendMessageToTab({
          action: 'clickButton',
          selector: settings.buttonSelector
        });
        
        if (response && response.success) {
          const clickTime = new Date();
          await log(`Cycle #${cycleCount}: Button click successful at ${clickTime.toLocaleTimeString()}`);
          
          // Calculate and log next refresh time
          const nextRefreshTime = new Date(clickTime.getTime() + (settings.refreshInterval * 1000));
          await log(`Cycle #${cycleCount}: Next refresh scheduled for ${nextRefreshTime.toLocaleTimeString()} (${settings.refreshInterval}s from button click)`);
          
          // Start countdown for refresh interval
          const refreshEndTime = Date.now() + (settings.refreshInterval * 1000);
          const refreshInterval = setInterval(async () => {
            const remaining = Math.ceil((refreshEndTime - Date.now()) / 1000);
            if (remaining <= 0) {
              clearInterval(refreshInterval);
              return;
            }
            await sendMessageToTab({
              action: 'updateTimer',
              label: 'Time until next refresh',
              remainingSeconds: remaining
            });
          }, 1000);

          // Schedule next refresh and store both timers
          refreshTimer = {
            refresh: setTimeout(doRefreshCycle, settings.refreshInterval * 1000),
            countdown: refreshInterval
          };
        } else {
          await log(`Cycle #${cycleCount}: Button click failed - button not found`, true);
          // Still schedule next refresh even if button click failed
          await log(`Cycle #${cycleCount}: Scheduling retry in ${settings.refreshInterval}s`);
          refreshTimer = setTimeout(doRefreshCycle, settings.refreshInterval * 1000);
        }
      } catch (error) {
        await log(`Error in refresh cycle: ${error.message}`, true);
        // Schedule next attempt despite error
        refreshTimer = setTimeout(doRefreshCycle, settings.refreshInterval * 1000);
      }
    };
    
    // Start the first cycle immediately
    await doRefreshCycle();
    
  } catch (error) {
    await log(`Error starting refresh cycle: ${error.message}`, true);
    throw error;
  }
}

async function stopRefreshCycle() {
  if (refreshTimer) {
    await log(`Stopping refresh cycle after ${cycleCount} cycles`);
    if (refreshTimer.refresh) clearTimeout(refreshTimer.refresh);
    if (refreshTimer.countdown) clearInterval(refreshTimer.countdown);
    refreshTimer = null;
    cycleCount = 0;
    
    // Clear the timer display
    try {
      await sendMessageToTab({
        action: 'updateTimer',
        label: 'Auto-refresh stopped',
        remainingSeconds: 0
      });
    } catch (error) {
      // Ignore errors if tab is closed
    }
  }
}
