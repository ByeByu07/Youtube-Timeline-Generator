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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    // Create temporary file path
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `youtube-${Date.now()}.mp4`);

    // Download audio from YouTube
    await new Promise((resolve, reject) => {
      ytdl(url, { quality: 'lowestaudio' })
        .pipe(fs.createWriteStream(tempFile))
        .on('finish', resolve)
        .on('error', reject);
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
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const timeline = await processYouTubeVideo(url);
    res.json({ timeline });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process video' });
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
