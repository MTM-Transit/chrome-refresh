document.addEventListener('DOMContentLoaded', function() {
    // Get UI elements
    const refreshIntervalInput = document.getElementById('refreshInterval');
    const waitTimeInput = document.getElementById('waitTime');
    const buttonSelectorInput = document.getElementById('buttonSelector');
    const toggleButton = document.getElementById('toggleButton');
    const configuredTabDiv = document.getElementById('configuredTab');
    const configuredUrlDiv = document.getElementById('configuredUrl');
    const statusDiv = document.createElement('div');
    statusDiv.style.marginTop = '10px';
    document.body.appendChild(statusDiv);

    // Function to update configured tab display
    function updateConfiguredTabDisplay(url) {
        if (url) {
            configuredTabDiv.classList.add('active');
            configuredUrlDiv.textContent = url;
        } else {
            configuredTabDiv.classList.remove('active');
            configuredUrlDiv.textContent = '';
        }
    }
    
    function updateStatus(message, isError = false) {
        console.log(message);
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'red' : 'green';
    }
    
    // Load saved settings
    chrome.storage.local.get(['isRunning', 'settings', 'configuredUrl'], function(data) {
        if (data.settings) {
            refreshIntervalInput.value = data.settings.refreshInterval;
            waitTimeInput.value = data.settings.waitTime;
            buttonSelectorInput.value = data.settings.buttonSelector;
        }
        
        toggleButton.textContent = data.isRunning ? 'Stop Auto-Refresh' : 'Start Auto-Refresh';
        if (data.isRunning) {
            updateStatus('Auto-refresh is currently running');
            updateConfiguredTabDisplay(data.configuredUrl);
        }
    });

    // Handle toggle button click
    toggleButton.addEventListener('click', function() {
        chrome.storage.local.get('isRunning', function(data) {
            const isRunning = !data.isRunning;
            
            // Get current tab URL before starting
            chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
                const settings = {
                    refreshInterval: parseInt(refreshIntervalInput.value) || 60,
                    waitTime: parseInt(waitTimeInput.value) || 5,
                    buttonSelector: buttonSelectorInput.value
                };

                const timestamp = new Date().toLocaleTimeString();
                const action = isRunning ? 'Starting' : 'Stopping';
                console.log(`[${timestamp}] ${action} auto-refresh with settings:`, settings);

                // Send message to background script
                chrome.runtime.sendMessage({
                    action: isRunning ? 'start' : 'stop',
                    settings: settings
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        const errorMsg = `Error: ${chrome.runtime.lastError.message}`;
                        console.error(errorMsg);
                        updateStatus(errorMsg, true);
                    } else {
                        const statusMsg = isRunning ? 
                            `Auto-refresh started. Will refresh every ${settings.refreshInterval} seconds` :
                            'Auto-refresh stopped';
                        updateStatus(statusMsg);
                    }
                });

                // Store settings and URL
                chrome.storage.local.set({ 
                    isRunning: isRunning,
                    settings: settings,
                    configuredUrl: isRunning ? tabs[0].url : null
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Storage error:', chrome.runtime.lastError);
                    }
                });

                toggleButton.textContent = isRunning ? 'Stop Auto-Refresh' : 'Start Auto-Refresh';
                updateConfiguredTabDisplay(isRunning ? tabs[0].url : null);
            });
        });
    });
});
