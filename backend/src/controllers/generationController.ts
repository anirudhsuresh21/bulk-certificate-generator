import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Template } from '../models/Template';
import { GenerateCertificateSchema } from '../validators/templateValidator';
import { generateCertificatePdf, generateBulkCertificates } from '../services/pdfGenerator';
import { parseExcelOrCsv } from '../services/excelParser';
import { GENERATED_DIR, getSafeFilePath } from '../utils/fileStorage';

export async function previewCertificate(
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

    const parseResult = GenerateCertificateSchema.safeParse(req.body);
    const values = parseResult.success ? parseResult.data.values : {};

    const pdfBytes = await generateCertificatePdf({
      template: template.toObject(),
      values,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('Error in previewCertificate:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate preview certificate.',
    });
  }
}

export async function generateCertificate(
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

    const parseResult = GenerateCertificateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: parseResult.error.format(),
      });
      return;
    }

    const { values, outputFileName } = parseResult.data;

    // Check required dynamic fields
    const missingFields: string[] = [];
    template.fields.forEach((field) => {
      if (
        field.isDynamic &&
        field.type !== 'signature_image' &&
        field.type !== 'logo_image'
      ) {
        const val = values[field.key];
        if (!val && !field.defaultValue) {
          missingFields.push(field.label || field.key);
        }
      }
    });

    // Generate PDF
    const pdfBytes = await generateCertificatePdf({
      template: template.toObject(),
      values,
    });

    // Determine sensible output filename
    let finalFileName = outputFileName;
    if (!finalFileName) {
      const recipientName =
        values['recipient_name'] || values['recipient'] || 'Participant';
      const cleanName = recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
      finalFileName = `Certificate_${cleanName}.pdf`;
    }
    if (!finalFileName.endsWith('.pdf')) {
      finalFileName += '.pdf';
    }

    const fileId = uuidv4();
    const diskFileName = `${fileId}_${finalFileName}`;
    const filePath = path.join(GENERATED_DIR, diskFileName);

    fs.writeFileSync(filePath, Buffer.from(pdfBytes));

    res.status(200).json({
      message: 'Certificate generated successfully.',
      certificateId: diskFileName,
      fileName: finalFileName,
      downloadUrl: `/api/certificates/${diskFileName}/download`,
      warnings: missingFields.length > 0 ? { missingFields } : undefined,
    });
  } catch (error: any) {
    console.error('Error in generateCertificate:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate certificate.',
    });
  }
}

export async function parseBulkSpreadsheet(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: 'No spreadsheet file uploaded.' });
      return;
    }

    const parsed = parseExcelOrCsv(req.file.buffer);

    res.status(200).json({
      message: 'Spreadsheet parsed successfully.',
      fileName: req.file.originalname,
      headers: parsed.headers,
      totalRows: parsed.totalRows,
      previewRows: parsed.previewRows,
      rows: parsed.rows,
      suggestedMapping: parsed.suggestedMapping,
    });
  } catch (error: any) {
    console.error('Error in parseBulkSpreadsheet:', error);
    res.status(400).json({
      error: error.message || 'Failed to parse spreadsheet file.',
    });
  }
}

export async function bulkGenerate(
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

    const {
      rows,
      columnMapping = {},
      mode = 'combined_pdf',
      baseFileName,
    } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'No recipient rows provided.' });
      return;
    }

    // Map each row according to columnMapping
    const mappedRecipients: Array<Record<string, string>> = rows.map(
      (row: Record<string, string>) => {
        const mappedRow: Record<string, string> = {};

        // 1. Copy over mapped columns
        for (const [fieldKey, sheetCol] of Object.entries(columnMapping)) {
          if (sheetCol && row[sheetCol as string] !== undefined) {
            mappedRow[fieldKey] = String(row[sheetCol as string]);
          }
        }

        // 2. Also keep direct fieldKey matches or fallback
        for (const [k, v] of Object.entries(row)) {
          if (!mappedRow[k]) {
            mappedRow[k] = String(v);
          }
        }

        return mappedRow;
      }
    );

    const result = await generateBulkCertificates({
      template: template.toObject(),
      recipients: mappedRecipients,
      mode: mode === 'zip_archive' ? 'zip_archive' : 'combined_pdf',
      baseFileName: baseFileName || template.name,
    });

    res.status(200).json({
      message: 'Bulk certificates generated successfully.',
      totalGenerated: result.totalGenerated,
      fileName: result.friendlyFileName,
      mode: result.mode,
      downloadUrl: `/api/certificates/${result.diskFileName}/download`,
    });
  } catch (error: any) {
    console.error('Error in bulkGenerate:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate bulk certificates.',
    });
  }
}

export async function downloadCertificate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params; // diskFileName
    const filePath = getSafeFilePath('generated', id);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Generated certificate not found.' });
      return;
    }

    // Extract original friendly name after uuid prefix
    const parts = id.split('_');
    const friendlyName = parts.length > 1 ? parts.slice(1).join('_') : id;
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.zip') {
      res.setHeader('Content-Type', 'application/zip');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(friendlyName)}"`
    );

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error: any) {
    console.error('Error in downloadCertificate:', error);
    res.status(400).json({ error: 'Invalid certificate download request.' });
  }
}
