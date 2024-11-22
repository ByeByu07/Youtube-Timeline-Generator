const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store sign language mappings
const signLanguageMappings = new Map();

// Initialize with some basic mappings
function initializeSignLanguageMappings() {
  // Add your sign language image mappings here
  // This should be replaced with a proper database
  signLanguageMappings.set('hello', '/signs/hello.png');
  signLanguageMappings.set('thank you', '/signs/thank_you.png');
  // Add more mappings as needed
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'audio_data') {
        // Process audio data
        const text = await processAudioData(data.data);
        
        // Get corresponding sign language image
        const signImage = getSignLanguageImage(text);
        
        // Send back the sign language data
        ws.send(JSON.stringify({
          type: 'sign_data',
          text: text,
          signImageUrl: signImage
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Process audio data (placeholder - implement your audio processing logic)
async function processAudioData(audioData) {
  // Here you would implement speech-to-text conversion
  // This is a placeholder that should be replaced with actual STT implementation
  return "hello"; // Example return
}

// Get sign language image URL based on text
function getSignLanguageImage(text) {
  return signLanguageMappings.get(text.toLowerCase()) || '/signs/default.png';
}

// Serve static files (sign language images)
app.use('/signs', express.static(path.join(__dirname, 'public/signs')));

// Initialize mappings and start server
initializeSignLanguageMappings();
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
