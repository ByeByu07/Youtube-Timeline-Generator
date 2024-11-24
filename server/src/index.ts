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
import pkg from 'miniget';
// import { exec } from 'yt-dlp-exec';
const { MinigetError, exec : ytDlpExec } = pkg;
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';

config();
const execAsync = promisify(exec);

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

interface AudioDownloadResponse {
  success: boolean;
  filePath?: string;
  error?: string;
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

async function getYoutubeCookie(): Promise<string> {
  try {
    // Try to get cookie from environment variable first
    const cookieFromEnv = process.env.YOUTUBE_COOKIE;
    if (cookieFromEnv) {
      return cookieFromEnv;
    }

    // If no cookie in env, create a minimal cookie
    return 'CONSENT=YES+; Path=/; Domain=.youtube.com';
  } catch (error) {
    console.error('Error getting YouTube cookie:', error);
    return 'CONSENT=YES+; Path=/; Domain=.youtube.com';
  }
}

// Function to process YouTube video
async function processYouTubeVideo(url: string): Promise<TimelineSection[]> {
  let tempFile: string | null = null;
  let audioFile: string | null = null;
  
  try {
    console.log('Starting YouTube video processing for:', url);
    
    // Create temporary file paths
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    tempFile = path.join(tempDir, `video-${timestamp}.mp4`);
    audioFile = path.join(tempDir, `audio-${timestamp}.mp3`);

    console.log('Downloading video...');
    
    // Download video using yt-dlp
    await ytDlpExec(url, {
      output: tempFile,
      format: 'bestaudio[ext=m4a]/bestaudio',
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0, // best quality
      noCheckCertificates: true,
      noWarnings: true,
      preferFfmpeg: true,
      progress: true, // Show progress bar
      //@ts-ignore
      addHeader: [
        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language:en-US,en;q=0.5',
        'Connection:keep-alive'
      ]
    });

    console.log('Download completed. Converting to audio...');

    // Upload to AssemblyAI
    console.log('Uploading to AssemblyAI...');
    const uploadUrl = await uploadAudio(audioFile);

    // Create and wait for transcript
    console.log('Processing transcript...');
    const result = await createAndWaitForTranscript(uploadUrl);

    if (!result.chapters || result.chapters.length === 0) {
      throw new Error('No chapters were generated for this video');
    }

    // Format the chapters into timeline sections
    const timeline = result.chapters.map((chapter: AssemblyAIChapter, index: number) => ({
      timestamp: formatTimestamp(chapter.start / 1000),
      text: `Chapter ${(index + 1).toString().padStart(2, '0')}: ${chapter.headline}`
    }));

    return timeline;

  } catch (error: any) {
    console.error('Error in processYouTubeVideo:', error);
    throw new Error(error.message || 'Failed to process video');
  } finally {
    // Clean up temporary files
    for (const file of [tempFile, audioFile]) {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`Cleaned up temporary file: ${file}`);
        } catch (error) {
          console.error(`Error cleaning up file ${file}:`, error);
        }
      }
    }
  }
}

async function downloadYouTubeAudio(url: string, format: string = 'mp3'): Promise<AudioDownloadResponse> {
  try {
    // Create a unique filename
    const tempDir = os.tmpdir();
    const filename = `audio-${Date.now()}.${format}`;
    const outputPath = path.join(tempDir, filename);

    // Get video info
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');

    // Download audio
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(outputPath);
      const stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
          }
        }
      });

      // Handle download progress
      let downloadProgress = 0;
      stream.on('progress', (_, downloaded, total) => {
        const progress = Math.floor((downloaded / total) * 100);
        if (progress > downloadProgress + 10) {
          downloadProgress = progress;
          console.log(`Download progress: ${progress}%`);
        }
      });

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({
          success: true,
          filePath: outputPath
        });
      });

      writeStream.on('error', (error) => {
        reject({
          success: false,
          error: error.message
        });
      });

      stream.on('error', (error) => {
        reject({
          success: false,
          error: error.message
        });
      });
    });
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
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
