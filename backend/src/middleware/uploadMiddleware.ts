import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { TEMPLATES_DIR, SIGNATURES_DIR, detectMagicBytes } from '../utils/fileStorage';

const templateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMPLATES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const signatureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, SIGNATURES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `sig_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(
        `Unsupported file extension: ${ext}. Allowed formats: PDF, PNG, JPG, JPEG.`
      )
    );
  }

  const allowedMimeTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        `Invalid file mime type: ${file.mimetype}. Allowed formats: PDF, PNG, JPG, JPEG.`
      )
    );
  }

  cb(null, true);
};

export const uploadTemplateMiddleware = multer({
  storage: templateStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter,
});

export const uploadSignatureMiddleware = multer({
  storage: signatureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Signatures must be PNG, JPG, or JPEG images.'));
    }
    cb(null, true);
  },
});

export const uploadSpreadsheetMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Spreadsheets must be .xlsx, .xls, or .csv files.'));
    }
    cb(null, true);
  },
});

/**
 * Validates magic bytes of uploaded template to prevent spoofed file extensions.
 */
export function validateMagicBytesMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const detectedType = detectMagicBytes(buffer);

    if (!detectedType) {
      // Remove invalid file
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        error: 'Uploaded file signature is invalid, corrupt, or unsupported.',
      });
      return;
    }

    // Attach verified file info
    (req as any).verifiedFileType = detectedType;
    next();
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to inspect uploaded file.' });
  }
}
