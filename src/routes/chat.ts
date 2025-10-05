import express from 'express';
import { getMessages, sendMessage, deleteMessage } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getMessages);
router.post('/', authenticateToken, sendMessage);
router.delete('/:id', authenticateToken, deleteMessage);

export default router;
