import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';;
import axios from 'axios';
import fs from 'fs';
import os from 'os';

config();

// Initialize AssemblyAI configuration
const apiKey = process.env.ASSEMBLY_AI_API_KEY;

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
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://youtube-timeline-generator-production.up.railway.app', 'https://youtube-timeline-generator-production.up.railway.app/']
    : 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

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

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// File upload and processing route
//@ts-ignore
app.post('/api/upload', upload.single('video'), async (req: Request, res: Response) => {
  console.log('=== File Upload Request Started ===');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing uploaded file:', req.file.path);
    
    // Upload to AssemblyAI
    console.log('Uploading to AssemblyAI...');
    const uploadUrl = await uploadAudio(req.file.path);

    // Create and wait for transcript
    console.log('Processing transcript...');
    const result = await createAndWaitForTranscript(uploadUrl);

    if (!result.chapters || result.chapters.length === 0) {
      throw new Error('No chapters were generated for this video');
    }

    // Format the chapters into timeline sections
    const timeline = result.chapters.map((chapter: AssemblyAIChapter, index: number) => ({
      timestamp: formatTimestamp(chapter.start / 1000),
      text: `${chapter.headline}`
      // text: `Chapter ${(index + 1).toString().padStart(2, '0')}: ${chapter.headline}`
    }));

    // Clean up the temporary file
    try {
      fs.unlinkSync(req.file.path);
      console.log('Cleaned up temporary file');
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }

    res.json({ timeline });
  } catch (error: any) {
    console.error('Error processing upload:', error);
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
const PORT = process.env.PORT || '0.0.0.0' || 3000;
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
