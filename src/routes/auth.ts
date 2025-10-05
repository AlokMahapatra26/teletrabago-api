import express from 'express';
import { signup, signin, signout, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/signout', authenticateToken, signout);
router.get('/profile', authenticateToken, getProfile);

export default router;
