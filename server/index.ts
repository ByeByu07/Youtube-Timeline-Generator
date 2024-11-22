import WebSocket from 'ws';
import express from 'express';
import http from 'http';
import path from 'path';
import AssemblyAI from 'assemblyai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SignData {
  type: string;
  text: string;
  signImageUrls: string[];
}

interface AudioMessage {
  type: string;
  data: number[];
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store sign language mappings for individual letters
const signLanguageMappings: Map<string, string> = new Map();

// Initialize with letter mappings
const initializeSignLanguageMappings = (): void => {
  // Add mappings for A-Z
  const letters: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  letters.forEach(letter => {
    signLanguageMappings.set(letter.toLowerCase(), `/signs/${letter.toLowerCase()}.png`);
  });
  
  // Add space character mapping
  signLanguageMappings.set(' ', '/signs/space.png');
};

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  ws.on('message', async (message: WebSocket.Data) => {
    try {
      const data = JSON.parse(message.toString()) as AudioMessage;
      
      if (data.type === 'audio_data') {
        // Process audio data
        const text = await processAudioData(data.data);
        
        // Get corresponding sign language images for each letter
        const signImages = getSignLanguageImage(text);
        
        // Send back the sign language data
        ws.send(JSON.stringify({
          type: 'sign_data',
          text: text,
          signImageUrls: signImages
        } as SignData));
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Initialize AssemblyAI client
const client = new AssemblyAI({ apiKey: "d611068ffd7a4258b2f02ff692c84be6" });

// Process audio data using AssemblyAI
const processAudioData = async (audioData: number[]): Promise<string> => {
  try {
    // Convert Float32Array to proper audio format (16-bit PCM)
    const audioBuffer = convertFloat32ToInt16(audioData);
    
    // Create a temporary audio file or stream
    const params = {
      audio: audioBuffer,
      sample_rate: 44100, // Match your AudioContext sample rate
    };

    // Send to AssemblyAI for real-time transcription
    const transcript = await client.transcribe(params);
    
    return transcript.text || '';
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    return '';
  }
};

// Helper function to convert Float32Array to Int16Array
const convertFloat32ToInt16 = (float32Array: number[]): Int16Array => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
};

// Get sign language image URLs for each letter
const getSignLanguageImage = (text: string): string[] => {
  const letters = text.toLowerCase().split('');
  return letters.map(letter => 
    signLanguageMappings.get(letter) || '/signs/default.png'
  );
};

// Serve static files (sign language images)
app.use('/signs', express.static(path.join(__dirname, 'public/signs')));

// Initialize mappings and start server
initializeSignLanguageMappings();
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});