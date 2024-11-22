document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const statusSpan = document.getElementById('status');
  let isActive = false;

  toggleButton.addEventListener('click', () => {
    isActive = !isActive;
    statusSpan.textContent = isActive ? 'Active' : 'Inactive';
    toggleButton.textContent = isActive ? 'Stop Translation' : 'Start Translation';
    toggleButton.style.background = isActive ? '#f44336' : '#4CAF50';

    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggle',
        value: isActive
      });
    });
  });
});
