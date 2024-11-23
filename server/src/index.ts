import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import ytdl from 'ytdl-core';
import { AssemblyAI } from '@assemblyai/sdk';

// Initialize AssemblyAI client
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_AI_API_KEY
});

interface TimelineSection {
  timestamp: string;
  text: string;
}

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment configuration
config();

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

// Function to process YouTube video
async function processYouTubeVideo(url: string): Promise<TimelineSection[]> {
  try {
    // Download audio from YouTube
    const audioStream = ytdl(url, { quality: 'lowestaudio' });
    
    // Create a transcript using AssemblyAI
    const transcript = await client.transcripts.create({
      audio: audioStream,
      auto_chapters: true
    });

    // Wait for the transcript to complete
    const result = await client.transcripts.wait(transcript.id);
    
    if (!result.chapters || result.chapters.length === 0) {
      throw new Error('No chapters were generated for this video');
    }

    // Format the chapters into timeline sections
    return result.chapters.map((chapter, index) => ({
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
