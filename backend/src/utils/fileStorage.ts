import fs from 'fs';
import path from 'path';

export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
export const TEMPLATES_DIR = path.join(UPLOADS_ROOT, 'templates');
export const SIGNATURES_DIR = path.join(UPLOADS_ROOT, 'signatures');
export const GENERATED_DIR = path.join(UPLOADS_ROOT, 'generated');

// Ensure necessary directories exist
[TEMPLATES_DIR, SIGNATURES_DIR, GENERATED_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Validates file path against path traversal attacks.
 */
export function getSafeFilePath(subDir: string, fileName: string): string {
  // Disallow path traversal characters
  const sanitizedFileName = path.basename(fileName);
  const resolvedDir = path.resolve(UPLOADS_ROOT, subDir);
  const resolvedPath = path.resolve(resolvedDir, sanitizedFileName);

  if (!resolvedPath.startsWith(resolvedDir)) {
    throw new Error('Access denied: Invalid file path');
  }

  return resolvedPath;
}

/**
 * Validates magic numbers (bytes) of a buffer to confirm real file type.
 */
export function detectMagicBytes(buffer: Buffer): 'pdf' | 'png' | 'jpg' | 'jpeg' | null {
  if (buffer.length < 4) return null;

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  return null;
}
