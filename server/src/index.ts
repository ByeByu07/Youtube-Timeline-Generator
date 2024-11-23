import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import ytdl from 'ytdl-core';
import axios from 'axios';
import fs from 'fs';
import os from 'os';

config();

// Initialize AssemblyAI configuration
const apiKey = process.env.ASSEMBLY_AI_API_KEY;
if (!apiKey) {
  throw new Error('ASSEMBLY_AI_API_KEY is not defined');
}

const ASSEMBLY_AI_API = 'https://api.assemblyai.com/v2';

// Type definitions
interface TimelineSection {
  timestamp: string;
  text: string;
}

interface AssemblyAIChapter {
  start: number;
  headline: string;
}

interface AssemblyAIResponse {
  id: string;
  status: string;
  chapters?: AssemblyAIChapter[];
}

interface AssemblyAIUploadResponse {
  upload_url: string;
}

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment configuration

// Express app setup
const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Log all incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Utility function to format seconds to timestamp
const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Function to upload audio file to AssemblyAI
async function uploadAudio(audioPath: string): Promise<string> {
  const data = fs.readFileSync(audioPath);
  const response = await axios.post<AssemblyAIUploadResponse>(
    `${ASSEMBLY_AI_API}/upload`,
    data,
    {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/octet-stream'
      }
    }
  );
  return response.data.upload_url;
}

// Function to create and wait for transcript
async function createAndWaitForTranscript(audioUrl: string): Promise<AssemblyAIResponse> {
  // Create transcript
  const response = await axios.post<AssemblyAIResponse>(`${ASSEMBLY_AI_API}/transcript`, {
    audio_url: audioUrl,
    auto_chapters: true
  }, {
    headers: {
      'authorization': apiKey,
      'Content-Type': 'application/json'
    }
  });

  const transcriptId = response.data.id;
  
  // Poll for transcript completion
  while (true) {
    const pollingResponse = await axios.get<AssemblyAIResponse>(`${ASSEMBLY_AI_API}/transcript/${transcriptId}`, {
      headers: { 'authorization': apiKey }
    });
    
    if (pollingResponse.data.status === 'completed') {
      return pollingResponse.data;
    } else if (pollingResponse.data.status === 'error') {
      throw new Error('Transcript processing failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Function to process YouTube video
async function processYouTubeVideo(url: string): Promise<TimelineSection[]> {
  try {
    console.log('Starting YouTube video processing for:', url);
    
    // Create temporary file path
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `youtube-${Date.now()}.mp4`);
    console.log('Temporary file path:', tempFile);

    // Download audio from YouTube
    console.log('Downloading audio...');
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempFile);
      const stream = ytdl(url, { 
        quality: 'lowestaudio',
        filter: 'audioonly' 
      });

      // Handle stream events
      stream.on('info', (info) => {
        console.log('Video info received:', info.videoDetails.title);
      });

      stream.on('error', (err) => {
        console.error('Error in ytdl stream:', err);
        writeStream.end();
        reject(err);
      });

      // Handle write stream events
      writeStream.on('error', (err) => {
        console.error('Error in write stream:', err);
        stream.destroy();
        reject(err);
      });

      writeStream.on('finish', () => {
        console.log('Audio download completed');
        resolve(null);
      });

      // Pipe with error handling
      stream.pipe(writeStream)
        .on('error', (err) => {
          console.error('Error in pipe:', err);
          stream.destroy();
          writeStream.end();
          reject(err);
        });

      // Set timeout
      const timeout = setTimeout(() => {
        stream.destroy();
        writeStream.end();
        reject(new Error('Download timeout after 5 minutes'));
      }, 5 * 60 * 1000); // 5 minutes timeout

      // Clear timeout on success
      writeStream.on('finish', () => clearTimeout(timeout));
    });

    // Upload to AssemblyAI
    const uploadUrl = await uploadAudio(tempFile);

    // Create and wait for transcript
    const result = await createAndWaitForTranscript(uploadUrl);

    // Clean up temporary file
    fs.unlinkSync(tempFile);

    if (!result.chapters || result.chapters.length === 0) {
      throw new Error('No chapters were generated for this video');
    }

    console.log('unlink');

    // Format the chapters into timeline sections
    return result.chapters!.map((chapter: AssemblyAIChapter, index: number) => ({
      timestamp: formatTimestamp(chapter.start / 1000),
      text: `Chapter ${(index + 1).toString().padStart(2, '0')}: ${chapter.headline}`
    }));

  } catch (error) {
    console.error('Error processing video:', error);
    throw new Error('Failed to process video');
  }
}

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// YouTube processing route
//@ts-ignore
app.post('/api/transcribe', async (req: Request, res: Response) => {
  console.log('=== Transcribe Request Started ===');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  try {
    const { url } = req.body;
    console.log('Received URL:', url);
    
    if (!url) {
      console.log('URL is missing in request');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!ytdl.validateURL(url)) {
      console.log('Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log('Starting video processing...');
    const timeline = await processYouTubeVideo(url);
    console.log('Video processing completed');
    console.log('Timeline:', timeline);
    
    res.json({ timeline });
  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Server startup
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

export default app;
