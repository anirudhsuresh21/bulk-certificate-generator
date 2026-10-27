import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { PageDimensions } from '../types';

export interface DocumentInfo {
  dimensions: PageDimensions;
  totalPages: number;
}

export async function extractDocumentInfo(
  filePath: string,
  fileType: 'pdf' | 'png' | 'jpg' | 'jpeg',
  pageIndex: number = 0
): Promise<DocumentInfo> {
  if (fileType === 'pdf') {
    const fileBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: false });
    const totalPages = pdfDoc.getPageCount();
    const targetIndex = Math.min(Math.max(0, pageIndex), totalPages - 1);
    const page = pdfDoc.getPage(targetIndex);
    const { width, height } = page.getSize();
    const orientation = width >= height ? 'landscape' : 'portrait';

    return {
      dimensions: {
        width: Math.round(width),
        height: Math.round(height),
        orientation,
      },
      totalPages,
    };
  } else {
    // Image file
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    const orientation = width >= height ? 'landscape' : 'portrait';

    return {
      dimensions: {
        width,
        height,
        orientation,
      },
      totalPages: 1,
    };
  }
}
