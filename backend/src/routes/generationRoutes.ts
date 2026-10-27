import { Router } from 'express';
import {
  previewCertificate,
  generateCertificate,
  downloadCertificate,
  parseBulkSpreadsheet,
  bulkGenerate,
} from '../controllers/generationController';
import { uploadSpreadsheetMiddleware } from '../middleware/uploadMiddleware';

const router = Router();

// Generation & preview endpoints
router.post('/templates/:id/preview', previewCertificate);
router.post('/templates/:id/generate', generateCertificate);
router.get('/certificates/:id/download', downloadCertificate);

// Bulk Excel & CSV endpoints
router.post(
  '/templates/:id/bulk-parse',
  uploadSpreadsheetMiddleware.single('spreadsheet'),
  parseBulkSpreadsheet
);
router.post('/templates/:id/bulk-generate', bulkGenerate);

export default router;
