import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import JSZip from 'jszip';
import { ITemplate, CertificateField, BackgroundPatch, FontFamily } from '../types';
import { TEMPLATES_DIR, SIGNATURES_DIR, GENERATED_DIR, getSafeFilePath } from '../utils/fileStorage';

function getFontsDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../fonts'),
    path.resolve(__dirname, '../fonts'),
    path.resolve(process.cwd(), 'fonts'),
    path.resolve(process.cwd(), 'backend/fonts'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(__dirname, '../../fonts');
}

const FONTS_DIR = getFontsDir();
const fontBufferCache = new Map<string, Buffer>();

function getCustomFontBuffer(fileName: string): Buffer | null {
  if (fontBufferCache.has(fileName)) {
    return fontBufferCache.get(fileName)!;
  }
  const filePath = path.join(FONTS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath);
    fontBufferCache.set(fileName, buf);
    return buf;
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleanHex.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

async function selectFont(
  pdfDoc: PDFDocument,
  fontFamily: FontFamily,
  isBold: boolean,
  isItalic: boolean
): Promise<PDFFont> {
  const customFontMap: Record<string, string> = {
    GreatVibes: 'GreatVibes-Regular.ttf',
    AlexBrush: 'AlexBrush-Regular.ttf',
    DancingScript: 'DancingScript.ttf',
    PinyonScript: 'PinyonScript.ttf',
    PlayfairDisplay: 'PlayfairDisplay.ttf',
    Cinzel: 'Cinzel.ttf',
    Montserrat: 'Montserrat.ttf',
  };

  if (customFontMap[fontFamily]) {
    const buf = getCustomFontBuffer(customFontMap[fontFamily]);
    if (buf) {
      try {
        pdfDoc.registerFontkit(fontkit);
        return await pdfDoc.embedFont(buf);
      } catch (fontErr) {
        console.warn(`Failed to embed custom font ${fontFamily}:`, fontErr);
      }
    }
  }

  // Standard PDF fonts
  let fontName = StandardFonts.Helvetica;

  if (fontFamily === 'TimesRoman') {
    if (isBold && isItalic) fontName = StandardFonts.TimesRomanBoldItalic;
    else if (isBold) fontName = StandardFonts.TimesRomanBold;
    else if (isItalic) fontName = StandardFonts.TimesRomanItalic;
    else fontName = StandardFonts.TimesRoman;
  } else if (fontFamily === 'Courier') {
    if (isBold && isItalic) fontName = StandardFonts.CourierBoldOblique;
    else if (isBold) fontName = StandardFonts.CourierBold;
    else if (isItalic) fontName = StandardFonts.CourierOblique;
    else fontName = StandardFonts.Courier;
  } else {
    // Helvetica
    if (isBold && isItalic) fontName = StandardFonts.HelveticaBoldOblique;
    else if (isBold) fontName = StandardFonts.HelveticaBold;
    else if (isItalic) fontName = StandardFonts.HelveticaOblique;
    else fontName = StandardFonts.Helvetica;
  }

  return pdfDoc.embedFont(fontName);
}

export interface GeneratePdfOptions {
  template: ITemplate;
  values?: Record<string, string>; // Placeholder key -> value
}

export async function generateCertificatePdf(
  options: GeneratePdfOptions
): Promise<Uint8Array> {
  const { template, values = {} } = options;
  const filePath = getSafeFilePath('templates', template.fileKey);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template source file not found: ${template.fileKey}`);
  }

  let pdfDoc: PDFDocument;
  let targetPage: PDFPage;
  let pageWidth: number;
  let pageHeight: number;

  if (template.fileType === 'pdf') {
    const existingBytes = fs.readFileSync(filePath);
    pdfDoc = await PDFDocument.load(existingBytes);
    const targetIndex = Math.min(
      Math.max(0, (template.selectedPage || 1) - 1),
      pdfDoc.getPageCount() - 1
    );
    targetPage = pdfDoc.getPage(targetIndex);
    const size = targetPage.getSize();
    pageWidth = size.width;
    pageHeight = size.height;
  } else {
    // PNG or JPG image background
    pdfDoc = await PDFDocument.create();
    const imageBytes = fs.readFileSync(filePath);
    let embeddedImage;
    if (template.fileType === 'png') {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    }

    pageWidth = template.pageDimensions.width;
    pageHeight = template.pageDimensions.height;
    targetPage = pdfDoc.addPage([pageWidth, pageHeight]);

    // Draw background image full page
    targetPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  // 1. Draw Background Patches (Cover old text/areas)
  if (template.patches && template.patches.length > 0) {
    for (const patch of template.patches) {
      const color = hexToRgb(patch.fillColor || '#FFFFFF');
      // Convert top-left coordinates to PDF bottom-left
      const patchY = pageHeight - patch.y - patch.height;
      targetPage.drawRectangle({
        x: patch.x,
        y: patchY,
        width: patch.width,
        height: patch.height,
        color: rgb(color.r, color.g, color.b),
        opacity: patch.opacity !== undefined ? patch.opacity : 1.0,
      });
    }
  }

  // 2. Draw Editable Fields (Text, Signatures, Logos)
  if (template.fields && template.fields.length > 0) {
    for (const field of template.fields) {
      // Check if it's an image field (signature or logo)
      if (
        (field.type === 'signature_image' || field.type === 'logo_image') &&
        field.assetKey
      ) {
        try {
          const assetPath = getSafeFilePath('signatures', field.assetKey);
          if (fs.existsSync(assetPath)) {
            const assetBytes = fs.readFileSync(assetPath);
            const ext = path.extname(assetPath).toLowerCase();
            let embeddedAsset;
            if (ext === '.png') {
              embeddedAsset = await pdfDoc.embedPng(assetBytes);
            } else {
              embeddedAsset = await pdfDoc.embedJpg(assetBytes);
            }

            const imgY = pageHeight - field.y - field.height;
            targetPage.drawImage(embeddedAsset, {
              x: field.x,
              y: imgY,
              width: field.width,
              height: field.height,
            });
          }
        } catch (imgErr) {
          console.warn(`Failed to embed asset for field ${field.id}:`, imgErr);
        }
        continue;
      }

      // Text field resolution
      let textToRender = '';
      if (field.isDynamic) {
        // Resolve value from user inputs, fallback to sampleValue or defaultValue or placeholder label
        textToRender =
          values[field.key] !== undefined && values[field.key] !== ''
            ? values[field.key]
            : field.defaultValue || field.sampleValue || `[${field.label}]`;
      } else {
        textToRender = field.defaultValue || field.sampleValue || field.label;
      }

      if (!textToRender) continue;

      const style = field.style || {
        fontFamily: 'Helvetica',
        fontSize: 24,
        isBold: false,
        isItalic: false,
        color: '#000000',
        alignment: 'center',
        autoShrink: true,
      };

      const font = await selectFont(
        pdfDoc,
        style.fontFamily,
        style.isBold,
        style.isItalic
      );

      let currentFontSize = style.fontSize || 24;
      const minFontSize = style.minFontSize || 10;
      const boxWidth = field.width;

      // Auto-shrink font if text exceeds box width
      if (style.autoShrink !== false) {
        let textWidth = font.widthOfTextAtSize(textToRender, currentFontSize);
        while (textWidth > boxWidth && currentFontSize > minFontSize) {
          currentFontSize -= 1;
          textWidth = font.widthOfTextAtSize(textToRender, currentFontSize);
        }
      }

      const textWidth = font.widthOfTextAtSize(textToRender, currentFontSize);
      const textHeight = font.heightAtSize(currentFontSize);

      // Horizontal alignment inside bounding box
      let textX = field.x;
      if (style.alignment === 'center') {
        textX = field.x + (field.width - textWidth) / 2;
      } else if (style.alignment === 'right') {
        textX = field.x + field.width - textWidth;
      }

      // Vertical centering inside bounding box
      // In PDF coordinates, page bottom-left is (0,0)
      const boxBottomY = pageHeight - field.y - field.height;
      const textY = boxBottomY + (field.height - textHeight) / 2 + (textHeight * 0.2);

      const color = hexToRgb(style.color || '#000000');

      targetPage.drawText(textToRender, {
        x: textX,
        y: textY,
        size: currentFontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    }
  }

  return await pdfDoc.save();
}

export interface GenerateBulkOptions {
  template: ITemplate;
  recipients: Array<Record<string, string>>;
  mode?: 'combined_pdf' | 'zip_archive';
  baseFileName?: string;
}

export interface BulkGenerationResult {
  filePath: string;
  diskFileName: string;
  friendlyFileName: string;
  totalGenerated: number;
  mode: 'combined_pdf' | 'zip_archive';
}

export async function generateBulkCertificates(
  options: GenerateBulkOptions
): Promise<BulkGenerationResult> {
  const {
    template,
    recipients,
    mode = 'combined_pdf',
    baseFileName = 'Certificates',
  } = options;

  if (!recipients || recipients.length === 0) {
    throw new Error('No recipients provided for bulk certificate generation.');
  }

  const cleanBase = baseFileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Certificates';
  const timestamp = Date.now().toString(36);

  if (mode === 'zip_archive') {
    const zipName = `${cleanBase}_Bulk.zip`;
    const diskFileName = `bulk_zip_${timestamp}_${zipName}`;
    const zipFilePath = path.join(GENERATED_DIR, diskFileName);

    const zip = new JSZip();

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const certBytes = await generateCertificatePdf({
        template,
        values: recipient,
      });

      const recipientName =
        recipient['recipient_name'] ||
        recipient['name'] ||
        recipient['recipient'] ||
        recipient['full_name'] ||
        recipient['student_name'] ||
        `Recipient_${i + 1}`;

      const safeName = recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const certFileName = `Certificate_${safeName}.pdf`;

      zip.file(certFileName, Buffer.from(certBytes));
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    fs.writeFileSync(zipFilePath, zipBuffer);

    return {
      filePath: zipFilePath,
      diskFileName,
      friendlyFileName: zipName,
      totalGenerated: recipients.length,
      mode: 'zip_archive',
    };
  } else {
    // Combined Multi-page PDF
    const masterDoc = await PDFDocument.create();

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const certBytes = await generateCertificatePdf({
        template,
        values: recipient,
      });

      const singleDoc = await PDFDocument.load(certBytes);
      const copiedPages = await masterDoc.copyPages(
        singleDoc,
        singleDoc.getPageIndices()
      );

      for (const page of copiedPages) {
        masterDoc.addPage(page);
      }
    }

    const masterBytes = await masterDoc.save();
    const pdfName = `${cleanBase}_Combined.pdf`;
    const diskFileName = `bulk_pdf_${timestamp}_${pdfName}`;
    const pdfFilePath = path.join(GENERATED_DIR, diskFileName);

    fs.writeFileSync(pdfFilePath, Buffer.from(masterBytes));

    return {
      filePath: pdfFilePath,
      diskFileName,
      friendlyFileName: pdfName,
      totalGenerated: recipients.length,
      mode: 'combined_pdf',
    };
  }
}
