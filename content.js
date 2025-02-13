// content.js
console.log('[Content Script] Loaded at:', new Date().toLocaleTimeString());

// Create and style the bubble
function createTimerBubble() {
  const bubble = document.createElement('div');
  bubble.id = 'refresh-timer-bubble';
  bubble.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 20px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    transition: background-color 0.3s;
    cursor: move;
  `;
  
  // Add timer content
  bubble.innerHTML = `
    <div id="timer-label" style="margin-bottom: 5px; font-weight: bold;"></div>
    <div id="timer-countdown" style="text-align: center;"></div>
  `;
  
  // Make bubble draggable
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  
  bubble.addEventListener('mousedown', e => {
    isDragging = true;
    initialX = e.clientX - bubble.offsetLeft;
    initialY = e.clientY - bubble.offsetTop;
  });
  
  document.addEventListener('mousemove', e => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      bubble.style.right = 'auto';
      bubble.style.left = `${currentX}px`;
      bubble.style.top = `${currentY}px`;
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  document.body.appendChild(bubble);
  return bubble;
}

// Update the bubble's countdown
function updateCountdown(label, remainingSeconds) {
  const bubble = document.getElementById('refresh-timer-bubble') || createTimerBubble();
  const labelElement = bubble.querySelector('#timer-label');
  const countdownElement = bubble.querySelector('#timer-countdown');
  
  labelElement.textContent = label;
  
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Change color based on remaining time
  if (remainingSeconds <= 5) {
    bubble.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  } else if (remainingSeconds <= 10) {
    bubble.style.backgroundColor = 'rgba(255, 165, 0, 0.8)';
  } else {
    bubble.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  }
}

function clickButton(selector) {
  const timestamp = new Date().toLocaleTimeString();
  const button = document.querySelector(selector);
  if (button) {
    button.click();
    console.log(`[${timestamp}] Button clicked: ${selector}`);
    return true;
  } else {
    console.log(`[${timestamp}] Button not found: ${selector}`);
    return false;
  }
}

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' });

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] Received message:', message);
  
  if (message.action === 'clickButton') {
    const result = clickButton(message.selector);
    sendResponse({ success: result });
    return true;
  }
  
  if (message.action === 'updateTimer') {
    updateCountdown(message.label, message.remainingSeconds);
    sendResponse({ success: true });
    return true;
  }
});
