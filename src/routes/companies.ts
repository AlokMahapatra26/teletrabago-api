import express from 'express';
import { createCompany, getCompanies, addMember , getMembers , getUserRole , deleteCompany} from '../controllers/companyController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, createCompany);
router.get('/', authenticateToken, getCompanies);
router.post('/members', authenticateToken, addMember);
router.get('/:id/members', authenticateToken, getMembers);
router.get('/:id/role', authenticateToken, getUserRole);
router.delete('/:id', authenticateToken, deleteCompany); 

export default router;
