import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Template } from '../models/Template';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
} from '../validators/templateValidator';
import { extractDocumentInfo } from '../utils/pdfDimensions';
import { detectCertificateNameSection } from '../services/nameDetector';
import {
  TEMPLATES_DIR,
  SIGNATURES_DIR,
  getSafeFilePath,
} from '../utils/fileStorage';

export async function uploadCertificate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const verifiedFileType = (req as any).verifiedFileType as
      | 'pdf'
      | 'png'
      | 'jpg'
      | 'jpeg';
    const filePath = req.file.path;
    const originalFileName = req.file.originalname;

    // Extract document dimensions & page count
    const docInfo = await extractDocumentInfo(filePath, verifiedFileType);

    // Auto-detect the recipient name section
    const detectedNameSection = await detectCertificateNameSection(
      filePath,
      verifiedFileType,
      docInfo.dimensions,
      1
    );

    res.status(200).json({
      message: 'Certificate uploaded successfully.',
      fileKey: req.file.filename,
      originalFileName,
      fileType: verifiedFileType,
      dimensions: docInfo.dimensions,
      totalPages: docInfo.totalPages,
      detectedNameSection,
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    console.error('Error in uploadCertificate:', error);
    res.status(500).json({
      error: error.message || 'Failed to process uploaded certificate.',
    });
  }
}

export async function uploadSignature(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No signature image uploaded.' });
      return;
    }

    res.status(200).json({
      message: 'Signature asset uploaded successfully.',
      assetKey: req.file.filename,
      originalFileName: req.file.originalname,
      assetUrl: `/api/templates/signatures/${req.file.filename}`,
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    console.error('Error in uploadSignature:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload signature.',
    });
  }
}

export async function createTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const parseResult = CreateTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: parseResult.error.format(),
      });
      return;
    }

    const data = parseResult.data;
    // Verify file exists
    const filePath = getSafeFilePath('templates', data.fileKey);
    if (!fs.existsSync(filePath)) {
      res.status(400).json({ error: 'Specified template file not found on server.' });
      return;
    }

    const template = new Template(data);
    await template.save();

    res.status(201).json({
      message: 'Template created successfully.',
      template,
    });
  } catch (error: any) {
    console.error('Error in createTemplate:', error);
    res.status(500).json({ error: error.message || 'Failed to create template.' });
  }
}

export async function listTemplates(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const templates = await Template.find().sort({ updatedAt: -1 });
    res.status(200).json({ templates });
  } catch (error: any) {
    console.error('Error in listTemplates:', error);
    res.status(500).json({ error: 'Failed to fetch templates.' });
  }
}

export async function getTemplateById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);

    if (!template) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }

    res.status(200).json({ template });
  } catch (error: any) {
    console.error('Error in getTemplateById:', error);
    res.status(500).json({ error: 'Failed to fetch template.' });
  }
}

export async function updateTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const parseResult = UpdateTemplateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: parseResult.error.format(),
      });
      return;
    }

    const template = await Template.findByIdAndUpdate(
      id,
      { $set: parseResult.data },
      { new: true, runValidators: true }
    );

    if (!template) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }

    res.status(200).json({
      message: 'Template updated successfully.',
      template,
    });
  } catch (error: any) {
    console.error('Error in updateTemplate:', error);
    res.status(500).json({ error: error.message || 'Failed to update template.' });
  }
}

export async function duplicateTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const original = await Template.findById(id);

    if (!original) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }

    // Duplicate physical file to keep templates independent
    const originalFilePath = getSafeFilePath('templates', original.fileKey);
    const ext = path.extname(original.fileKey);
    const newFileKey = `${uuidv4()}${ext}`;
    const newFilePath = path.join(TEMPLATES_DIR, newFileKey);

    if (fs.existsSync(originalFilePath)) {
      fs.copyFileSync(originalFilePath, newFilePath);
    }

    const clonedData = original.toObject() as any;
    delete clonedData._id;
    delete clonedData.id;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;

    clonedData.name = `${original.name} (Copy)`;
    clonedData.fileKey = newFileKey;

    const duplicated = new Template(clonedData);
    await duplicated.save();

    res.status(201).json({
      message: 'Template duplicated successfully.',
      template: duplicated,
    });
  } catch (error: any) {
    console.error('Error in duplicateTemplate:', error);
    res.status(500).json({ error: 'Failed to duplicate template.' });
  }
}

export async function deleteTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const template = await Template.findByIdAndDelete(id);

    if (!template) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }

    // Safe file cleanup: only delete source file if no other template shares it
    const otherUsage = await Template.findOne({ fileKey: template.fileKey });
    if (!otherUsage) {
      try {
        const filePath = getSafeFilePath('templates', template.fileKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn('Could not delete template file on disk:', fileErr);
      }
    }

    res.status(200).json({ message: 'Template deleted successfully.' });
  } catch (error: any) {
    console.error('Error in deleteTemplate:', error);
    res.status(500).json({ error: 'Failed to delete template.' });
  }
}

export async function getTemplateFile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { fileKey } = req.params;
    const filePath = getSafeFilePath('templates', fileKey);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileKey}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error in getTemplateFile:', error);
    res.status(400).json({ error: 'Invalid file request.' });
  }
}

export async function getSignatureFile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { assetKey } = req.params;
    const filePath = getSafeFilePath('signatures', assetKey);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Signature not found.' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'image/png');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error in getSignatureFile:', error);
    res.status(400).json({ error: 'Invalid signature request.' });
  }
}

export async function detectNameForTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);

    if (!template) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }

    const filePath = getSafeFilePath('templates', template.fileKey);
    const detection = await detectCertificateNameSection(
      filePath,
      template.fileType,
      template.pageDimensions,
      template.selectedPage || 1
    );

    res.status(200).json({ detection });
  } catch (error: any) {
    console.error('Error in detectNameForTemplate:', error);
    res.status(500).json({ error: 'Failed to detect name section.' });
  }
}
