import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { sanitizeBody } from '../middleware/validate.middleware.js';
import {
  getPublicContent,
  getPublicContentById,
  getAdminContent,
  getAdminContentById,
  createAdminContent,
  updateAdminContent,
  deleteAdminContent,
  approveContent,
  rejectContent,
  getContributorContent,
  getContributorContentById,
  createContributorContent,
  updateContributorContent,
  submitForReview,
} from '../controllers/content.controller.js';

const router = Router();

// Public
router.get('/', getPublicContent);
router.get('/:id', getPublicContentById);

// Admin
router.get('/admin/list', authenticate, requireRole('ADMIN'), getAdminContent);
router.get('/admin/:id', authenticate, requireRole('ADMIN'), getAdminContentById);
router.post('/admin', authenticate, requireRole('ADMIN'), sanitizeBody, createAdminContent);
router.put('/admin/:id', authenticate, requireRole('ADMIN'), sanitizeBody, updateAdminContent);
router.delete('/admin/:id', authenticate, requireRole('ADMIN'), deleteAdminContent);
router.put('/admin/:id/approve', authenticate, requireRole('ADMIN'), approveContent);
router.put('/admin/:id/reject', authenticate, requireRole('ADMIN'), sanitizeBody, rejectContent);

// Contributor
router.get('/contributor/list', authenticate, requireRole('ADMIN', 'CONTRIBUTOR'), getContributorContent);
router.get('/contributor/:id', authenticate, requireRole('ADMIN', 'CONTRIBUTOR'), getContributorContentById);
router.post('/contributor', authenticate, requireRole('ADMIN', 'CONTRIBUTOR'), sanitizeBody, createContributorContent);
router.put('/contributor/:id', authenticate, requireRole('ADMIN', 'CONTRIBUTOR'), sanitizeBody, updateContributorContent);
router.put('/contributor/:id/submit', authenticate, requireRole('ADMIN', 'CONTRIBUTOR'), submitForReview);

export default router;
