import express from 'express';
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
} from '../controllers/meetingController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getMeetings);
router.post('/', authenticateToken, createMeeting);
router.put('/:id', authenticateToken, updateMeeting);
router.delete('/:id', authenticateToken, deleteMeeting);
router.post('/:id/join', authenticateToken, joinMeeting);

export default router;
