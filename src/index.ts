import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import companyRoutes from './routes/companies';
import chatRoutes from './routes/chat'
import documentRoutes from './routes/documents';
import whiteboardRoutes from './routes/whiteboards'
import { setupDocumentWebSocket } from './websocket/documentServer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/chat' , chatRoutes)
app.use('/api/documents', documentRoutes);
app.use('/api/whiteboards', whiteboardRoutes);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket for collaborative documents
setupDocumentWebSocket(server);

server.listen(PORT, () => {
  console.log(`✓ Server is running on port ${PORT}`);
  console.log(`✓ WebSocket server ready at ws://localhost:${PORT}/documents`);
});
