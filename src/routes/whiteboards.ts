import express from 'express';
import {
  getWhiteboards,
  createWhiteboard,
  updateWhiteboard,
  deleteWhiteboard,
} from '../controllers/whiteboardController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getWhiteboards);
router.post('/', authenticateToken, createWhiteboard);
router.put('/:id', authenticateToken, updateWhiteboard);
router.delete('/:id', authenticateToken, deleteWhiteboard);

export default router;
