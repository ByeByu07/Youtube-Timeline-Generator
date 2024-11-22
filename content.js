let isActive = false;
let socket = null;

// Initialize WebSocket connection
function initializeWebSocket() {
  try {
    socket = new WebSocket('ws://localhost:3000');
    
    socket.onopen = () => {
      console.log('Connected to WebSocket server');
      startAudioCapture(); // Start audio capture once connection is established
    };

  socket.onmessage = (event) => {
    const signData = JSON.parse(event.data);
    displaySignLanguage(signData);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Display sign language overlay
function displaySignLanguage(signData) {
  const overlay = document.getElementById('sign-language-overlay') || createOverlay();
  overlay.innerHTML = signData.signImageUrls
    .map(url => `<img src="${url}" alt="Sign language" style="height: 100px; margin: 0 5px;" />`)
    .join('');
}

// Create overlay element
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'sign-language-overlay';
  overlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    border-radius: 5px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    max-width: 80vw;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    isActive = request.value;
    if (isActive) {
      initializeWebSocket();
      startAudioCapture();
    } else {
      if (socket) socket.close();
      stopAudioCapture();
    }
  }
});

// Audio capture logic
let mediaRecorder = null;
let audioContext = null;

async function startAudioCapture() {
  try {
    console.log('Starting audio capture...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      } 
    });
    audioContext = new AudioContext({ sampleRate: 44100 });
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create analyzer node
    const analyzer = audioContext.createAnalyser();
    source.connect(analyzer);
    
    // Process audio data
    const dataArray = new Float32Array(analyzer.frequencyBinCount);
    
    function processAudio() {
      if (!isActive) return;
      
      analyzer.getFloatTimeDomainData(dataArray);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'audio_data',
          data: Array.from(dataArray)
        }));
      }
      
      requestAnimationFrame(processAudio);
    }
    
    processAudio();
  } catch (error) {
    console.error('Error capturing audio:', error);
  }
}

function stopAudioCapture() {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaRecorder) {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
}
