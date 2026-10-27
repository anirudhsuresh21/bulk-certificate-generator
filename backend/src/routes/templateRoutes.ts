import { Router } from 'express';
import {
  uploadCertificate,
  uploadSignature,
  createTemplate,
  listTemplates,
  getTemplateById,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
  getTemplateFile,
  getSignatureFile,
  detectNameForTemplate,
} from '../controllers/templateController';
import {
  uploadTemplateMiddleware,
  uploadSignatureMiddleware,
  validateMagicBytesMiddleware,
} from '../middleware/uploadMiddleware';

const router = Router();

// File uploads
router.post(
  '/upload',
  uploadTemplateMiddleware.single('file'),
  validateMagicBytesMiddleware,
  uploadCertificate
);

router.post(
  '/signatures/upload',
  uploadSignatureMiddleware.single('signature'),
  uploadSignature
);

// File serving
router.get('/files/:fileKey', getTemplateFile);
router.get('/signatures/:assetKey', getSignatureFile);

// Template CRUD
router.post('/', createTemplate);
router.get('/', listTemplates);
router.get('/:id', getTemplateById);
router.patch('/:id', updateTemplate);
router.post('/:id/duplicate', duplicateTemplate);
router.delete('/:id', deleteTemplate);
router.post('/:id/detect-name', detectNameForTemplate);

export default router;
