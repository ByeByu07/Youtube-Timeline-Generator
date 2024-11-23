import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Types and Interfaces
interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
}

interface WSMessage {
  type: 'join' | 'message' | 'popupCreated' | 'popupClosed';
  userId: string;
  message?: string;
  timestamp?: string;
}

interface ChatMessage {
  type: 'message';
  userId: string;
  message: string;
  timestamp: string;
}

interface ServerResponse {
  type: string;
  userId?: string;
  participants?: string[];
  message?: string;
  timestamp?: string;
}

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment configuration
config();

// Express app setup
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Connected clients map
const clients: Map<string, CustomWebSocket> = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Utility functions
const broadcast = (message: ServerResponse, exclude: string | null = null): void => {
  const data = JSON.stringify(message);
  clients.forEach((client, userId) => {
    if (userId !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

const getParticipants = (): string[] => {
  return Array.from(clients.keys());
};

const handleError = (error: Error, ws: CustomWebSocket): void => {
  console.error('WebSocket error:', error);
  if (ws.userId) {
    clients.delete(ws.userId);
    broadcast({
      type: 'userLeft',
      userId: ws.userId,
      participants: getParticipants()
    });
  }
};

// WebSocket connection handling
wss.on('connection', (ws: CustomWebSocket) => {
  ws.isAlive = true;

  // Connection health check
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Message handling
  ws.on('message', (data: Buffer) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join': {
          ws.userId = message.userId;
          clients.set(message.userId, ws);
          
          // Send current participants to new user
          ws.send(JSON.stringify({
            type: 'participants',
            participants: getParticipants()
          }));
          
          // Notify others
          broadcast({
            type: 'userJoined',
            userId: message.userId,
            participants: getParticipants()
          }, message.userId);
          break;
        }

        case 'message': {
          const chatMessage: ChatMessage = {
            type: 'message',
            userId: message.userId,
            message: message.message!,
            timestamp: new Date().toISOString()
          };
          broadcast(chatMessage);
          break;
        }

        case 'popupCreated':
        case 'popupClosed': {
          broadcast({
            type: message.type,
            userId: message.userId
          }, message.userId);
          break;
        }
      }
    } catch (error) {
      handleError(error as Error, ws);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      broadcast({
        type: 'userLeft',
        userId: ws.userId,
        participants: getParticipants()
      });
    }
  });

  // Handle errors
  ws.on('error', (error) => handleError(error, ws));
});

// Health check interval
const interval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as CustomWebSocket;
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', connections: clients.size });
});

// Meeting room routes
app.get('/api/room/:roomId', (req: Request, res: Response) => {
  const roomId = req.params.roomId;
  const participants = Array.from(clients.keys())
    .filter(userId => userId.startsWith(roomId));
  res.json({ participants });
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