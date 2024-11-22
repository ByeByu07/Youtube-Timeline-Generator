// Background script for handling extension lifecycle and messaging
chrome.runtime.onInstalled.addListener(() => {
  console.log('Sign Language Assistant extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    // Forward the toggle message to the active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggle',
          value: request.value
        });
      }
    });
  }
});
