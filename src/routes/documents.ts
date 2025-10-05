import express from 'express';
import { getDocuments, createDocument, updateDocument, deleteDocument } from '../controllers/documentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getDocuments);
router.post('/', authenticateToken, createDocument);
router.put('/:id', authenticateToken, updateDocument);
router.delete('/:id', authenticateToken, deleteDocument);

export default router;
