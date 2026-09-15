import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { sanitizeBody } from '../middleware/validate.middleware.js';
import {
  getTechnologies,
  createTechnology,
  updateTechnology,
  deleteTechnology,
  createDomain,
  updateDomain,
  deleteDomain,
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getContentTypes,
} from '../controllers/metadata.controller.js';

const router = Router();

// Public
router.get('/technologies', getTechnologies);
router.get('/companies', getCompanies);
router.get('/tags', getTags);
router.get('/content-types', getContentTypes);

// Admin: Technologies
router.post('/technologies', authenticate, requireRole('ADMIN'), sanitizeBody, createTechnology);
router.put('/technologies/:id', authenticate, requireRole('ADMIN'), sanitizeBody, updateTechnology);
router.delete('/technologies/:id', authenticate, requireRole('ADMIN'), deleteTechnology);

// Admin: Domains
router.post('/technology-domains', authenticate, requireRole('ADMIN'), sanitizeBody, createDomain);
router.put('/technology-domains/:id', authenticate, requireRole('ADMIN'), sanitizeBody, updateDomain);
router.delete('/technology-domains/:id', authenticate, requireRole('ADMIN'), deleteDomain);

// Admin: Companies
router.post('/companies', authenticate, requireRole('ADMIN'), sanitizeBody, createCompany);
router.put('/companies/:id', authenticate, requireRole('ADMIN'), sanitizeBody, updateCompany);
router.delete('/companies/:id', authenticate, requireRole('ADMIN'), deleteCompany);

// Admin: Tags
router.post('/tags', authenticate, requireRole('ADMIN'), sanitizeBody, createTag);
router.put('/tags/:id', authenticate, requireRole('ADMIN'), sanitizeBody, updateTag);
router.delete('/tags/:id', authenticate, requireRole('ADMIN'), deleteTag);

export default router;
