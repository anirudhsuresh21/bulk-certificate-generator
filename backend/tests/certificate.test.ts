import request from 'supertest';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app';
import { connectDB, disconnectDB } from '../src/config/database';
import { Template } from '../src/models/Template';

describe('Phase 1 Certificate Generator & Template API Test Suite', () => {
  let samplePdfBuffer: Buffer;
  let multiPagePdfBuffer: Buffer;
  let samplePngBuffer: Buffer;
  let sampleSignatureBuffer: Buffer;

  beforeAll(async () => {
    await connectDB();

    // 1. Create a 1-page Landscape PDF certificate buffer (842 x 595 - A4 Landscape)
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    page.drawText('Original Certificate of Achievement', {
      x: 200,
      y: 500,
      size: 24,
      font,
      color: rgb(0.1, 0.2, 0.5),
    });
    page.drawText('Legacy Name: John Doe', {
      x: 200,
      y: 350,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });
    samplePdfBuffer = Buffer.from(await doc.save());

    // 2. Create a 2-page PDF to test multi-page preservation
    const multiDoc = await PDFDocument.create();
    const p1 = multiDoc.addPage([842, 595]);
    p1.drawText('Page 1 Certificate Content', { x: 100, y: 500, size: 20 });
    const p2 = multiDoc.addPage([842, 595]);
    p2.drawText('Page 2 Appendix or Terms', { x: 100, y: 500, size: 20 });
    multiPagePdfBuffer = Buffer.from(await multiDoc.save());

    // 3. Create a 1000x700 PNG certificate image buffer
    samplePngBuffer = await sharp({
      create: {
        width: 1000,
        height: 700,
        channels: 4,
        background: { r: 245, g: 247, b: 250, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // 4. Create a 200x80 transparent PNG signature
    sampleSignatureBuffer = await sharp({
      create: {
        width: 200,
        height: 80,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    await Template.deleteMany({});
    await disconnectDB();
  });

  describe('1. File Upload & Magic Byte Verification', () => {
    it('should upload a valid PDF and detect landscape dimensions', async () => {
      const res = await request(app)
        .post('/api/templates/upload')
        .attach('file', samplePdfBuffer, 'cert_template.pdf');

      expect(res.status).toBe(200);
      expect(res.body.fileType).toBe('pdf');
      expect(res.body.dimensions.width).toBe(842);
      expect(res.body.dimensions.height).toBe(595);
      expect(res.body.dimensions.orientation).toBe('landscape');
      expect(res.body.totalPages).toBe(1);
      expect(res.body.fileKey).toBeDefined();
    });

    it('should upload a multi-page PDF and detect correct page count', async () => {
      const res = await request(app)
        .post('/api/templates/upload')
        .attach('file', multiPagePdfBuffer, 'multi_cert.pdf');

      expect(res.status).toBe(200);
      expect(res.body.totalPages).toBe(2);
    });

    it('should upload a PNG image and detect image dimensions', async () => {
      const res = await request(app)
        .post('/api/templates/upload')
        .attach('file', samplePngBuffer, 'cert_image.png');

      expect(res.status).toBe(200);
      expect(res.body.fileType).toBe('png');
      expect(res.body.dimensions.width).toBe(1000);
      expect(res.body.dimensions.height).toBe(700);
      expect(res.body.dimensions.orientation).toBe('landscape');
    });

    it('should upload a signature PNG image', async () => {
      const res = await request(app)
        .post('/api/templates/signatures/upload')
        .attach('signature', sampleSignatureBuffer, 'director_sig.png');

      expect(res.status).toBe(200);
      expect(res.body.assetKey).toBeDefined();
    });

    it('should reject a spoofed invalid file (e.g. text file renamed to .pdf)', async () => {
      const spoofedBuffer = Buffer.from('Just plain text, not a real PDF at all');
      const res = await request(app)
        .post('/api/templates/upload')
        .attach('file', spoofedBuffer, 'fake.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid, corrupt, or unsupported/i);
    });

    it('should reject unsupported file extensions like .exe or .txt', async () => {
      const res = await request(app)
        .post('/api/templates/upload')
        .attach('file', Buffer.from('hello'), 'script.exe');

      expect(res.status).toBe(500);
    });
  });

  describe('2. Template CRUD, Layouts, Patches & Fields', () => {
    let createdTemplateId: string;
    let uploadedFileKey: string;
    let uploadedSigKey: string;

    beforeAll(async () => {
      // Upload base PDF
      const uploadRes = await request(app)
        .post('/api/templates/upload')
        .attach('file', samplePdfBuffer, 'base_cert.pdf');
      uploadedFileKey = uploadRes.body.fileKey;

      // Upload signature
      const sigRes = await request(app)
        .post('/api/templates/signatures/upload')
        .attach('signature', sampleSignatureBuffer, 'sig.png');
      uploadedSigKey = sigRes.body.assetKey;
    });

    it('should create a template with patches and multiple fields', async () => {
      const payload = {
        name: 'Annual Excellence Award 2026',
        fileKey: uploadedFileKey,
        originalFileName: 'base_cert.pdf',
        fileType: 'pdf',
        pageDimensions: {
          width: 842,
          height: 595,
          orientation: 'landscape',
        },
        selectedPage: 1,
        totalPages: 1,
        patches: [
          {
            id: 'patch-1',
            x: 195,
            y: 230,
            width: 400,
            height: 30,
            fillColor: '#FFFFFF',
            opacity: 1,
          },
        ],
        fields: [
          {
            id: 'field-name',
            type: 'recipient_name',
            label: 'Recipient Name',
            key: 'recipient_name',
            isDynamic: true,
            defaultValue: '',
            sampleValue: 'Aarav Sharma',
            x: 200,
            y: 230,
            width: 400,
            height: 40,
            style: {
              fontFamily: 'Helvetica',
              fontSize: 28,
              isBold: true,
              isItalic: false,
              color: '#1a365d',
              alignment: 'center',
              autoShrink: true,
              minFontSize: 14,
            },
          },
          {
            id: 'field-event',
            type: 'event_name',
            label: 'Event Name',
            key: 'event_name',
            isDynamic: true,
            defaultValue: 'Full Stack Innovation Summit',
            sampleValue: 'Full Stack Innovation Summit',
            x: 200,
            y: 290,
            width: 400,
            height: 30,
            style: {
              fontFamily: 'Helvetica',
              fontSize: 18,
              isBold: false,
              isItalic: true,
              color: '#4a5568',
              alignment: 'center',
            },
          },
          {
            id: 'field-date',
            type: 'issue_date',
            label: 'Issue Date',
            key: 'issue_date',
            isDynamic: true,
            defaultValue: 'October 27, 2026',
            sampleValue: 'October 27, 2026',
            x: 100,
            y: 450,
            width: 180,
            height: 25,
            style: {
              fontFamily: 'TimesRoman',
              fontSize: 14,
              isBold: false,
              isItalic: false,
              color: '#2d3748',
              alignment: 'left',
            },
          },
          {
            id: 'field-sig',
            type: 'signature_image',
            label: 'Director Signature',
            key: 'director_sig',
            isDynamic: false,
            assetKey: uploadedSigKey,
            x: 550,
            y: 420,
            width: 150,
            height: 60,
            style: {
              fontFamily: 'Helvetica',
              fontSize: 14,
              isBold: false,
              isItalic: false,
              color: '#000000',
              alignment: 'center',
            },
          },
          {
            id: 'field-auth-title',
            type: 'authority_designation',
            label: 'Authority Designation',
            key: 'authority_designation',
            isDynamic: false,
            defaultValue: 'Executive Director',
            x: 550,
            y: 490,
            width: 150,
            height: 20,
            style: {
              fontFamily: 'Helvetica',
              fontSize: 12,
              isBold: true,
              isItalic: false,
              color: '#000000',
              alignment: 'center',
            },
          },
        ],
      };

      const res = await request(app).post('/api/templates').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.template).toBeDefined();
      expect(res.body.template.name).toBe('Annual Excellence Award 2026');
      expect(res.body.template.fields.length).toBe(5);
      expect(res.body.template.patches.length).toBe(1);

      createdTemplateId = res.body.template.id;
    });

    it('should list all saved templates', async () => {
      const res = await request(app).get('/api/templates');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.templates)).toBe(true);
      expect(res.body.templates.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a template by ID with all fields and styling intact', async () => {
      const res = await request(app).get(`/api/templates/${createdTemplateId}`);
      expect(res.status).toBe(200);
      expect(res.body.template.id).toBe(createdTemplateId);
      expect(res.body.template.fields[0].key).toBe('recipient_name');
      expect(res.body.template.fields[0].style.fontSize).toBe(28);
    });

    it('should update template fields and metadata', async () => {
      const res = await request(app)
        .patch(`/api/templates/${createdTemplateId}`)
        .send({
          name: 'Annual Excellence Award 2026 (Updated)',
        });

      expect(res.status).toBe(200);
      expect(res.body.template.name).toBe('Annual Excellence Award 2026 (Updated)');
    });

    it('should duplicate a template independently', async () => {
      const res = await request(app).post(
        `/api/templates/${createdTemplateId}/duplicate`
      );

      expect(res.status).toBe(201);
      expect(res.body.template.name).toContain('(Copy)');
      expect(res.body.template.id).not.toBe(createdTemplateId);
      expect(res.body.template.fields.length).toBe(5);

      // Clean up duplicated template
      await request(app).delete(`/api/templates/${res.body.template.id}`);
    });
  });

  describe('3. Certificate Generation, PDF Export & Downloads', () => {
    let templateId: string;

    beforeAll(async () => {
      const uploadRes = await request(app)
        .post('/api/templates/upload')
        .attach('file', samplePdfBuffer, 'gen_cert.pdf');

      const templateRes = await request(app)
        .post('/api/templates')
        .send({
          name: 'Generation Test Template',
          fileKey: uploadRes.body.fileKey,
          originalFileName: 'gen_cert.pdf',
          fileType: 'pdf',
          pageDimensions: { width: 842, height: 595, orientation: 'landscape' },
          selectedPage: 1,
          totalPages: 1,
          fields: [
            {
              id: 'f1',
              type: 'recipient_name',
              label: 'Recipient Name',
              key: 'recipient_name',
              isDynamic: true,
              x: 100,
              y: 200,
              width: 500,
              height: 50,
              style: {
                fontFamily: 'Helvetica',
                fontSize: 32,
                isBold: true,
                isItalic: false,
                color: '#102a43',
                alignment: 'center',
                autoShrink: true,
                minFontSize: 12,
              },
            },
          ],
          patches: [],
        });

      templateId = templateRes.body.template.id;
    });

    it('should generate a live PDF preview stream', async () => {
      const res = await request(app)
        .post(`/api/templates/${templateId}/preview`)
        .send({
          values: {
            recipient_name: 'Dr. Jane Foster',
          },
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');

      // Verify returned bytes are valid PDF
      const loadedPdf = await PDFDocument.load(res.body);
      expect(loadedPdf.getPageCount()).toBe(1);
    });

    it('should generate a personalized PDF certificate and return download URL', async () => {
      const res = await request(app)
        .post(`/api/templates/${templateId}/generate`)
        .send({
          values: {
            recipient_name: 'Aarav Sharma',
          },
          outputFileName: 'Certificate_Aarav_Sharma.pdf',
        });

      expect(res.status).toBe(200);
      expect(res.body.certificateId).toBeDefined();
      expect(res.body.downloadUrl).toBeDefined();

      // Test downloading the generated certificate
      const downloadRes = await request(app).get(res.body.downloadUrl);
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.header['content-type']).toBe('application/pdf');
      expect(downloadRes.header['content-disposition']).toContain(
        'Certificate_Aarav_Sharma.pdf'
      );

      const generatedPdf = await PDFDocument.load(downloadRes.body);
      expect(generatedPdf.getPageCount()).toBe(1);
    });

    it('should handle very long recipient names without errors (auto-shrink font)', async () => {
      const longName =
        'Very Long Distinguished Professor Sri Christopher Bartholomew Montgomery the Third';
      const res = await request(app)
        .post(`/api/templates/${templateId}/preview`)
        .send({
          values: {
            recipient_name: longName,
          },
        });

      expect(res.status).toBe(200);
      const generatedPdf = await PDFDocument.load(res.body);
      expect(generatedPdf.getPageCount()).toBe(1);
    });
  });

  describe('4. Multi-Page PDF Preservation', () => {
    it('should preserve other pages when modifying a multi-page certificate PDF', async () => {
      const uploadRes = await request(app)
        .post('/api/templates/upload')
        .attach('file', multiPagePdfBuffer, 'multi_test.pdf');

      const templateRes = await request(app)
        .post('/api/templates')
        .send({
          name: 'Multi-Page Certificate',
          fileKey: uploadRes.body.fileKey,
          originalFileName: 'multi_test.pdf',
          fileType: 'pdf',
          pageDimensions: { width: 842, height: 595, orientation: 'landscape' },
          selectedPage: 1, // editing page 1
          totalPages: 2,
          fields: [
            {
              id: 'name-field',
              type: 'recipient_name',
              label: 'Recipient Name',
              key: 'recipient_name',
              isDynamic: true,
              x: 100,
              y: 200,
              width: 400,
              height: 40,
              style: {
                fontFamily: 'Helvetica',
                fontSize: 24,
                isBold: true,
                isItalic: false,
                color: '#000000',
                alignment: 'center',
              },
            },
          ],
        });

      const multiTemplateId = templateRes.body.template.id;

      const previewRes = await request(app)
        .post(`/api/templates/${multiTemplateId}/preview`)
        .send({ values: { recipient_name: 'Multipage User' } });

      expect(previewRes.status).toBe(200);
      const resultDoc = await PDFDocument.load(previewRes.body);
      // Ensure all 2 pages are preserved!
      expect(resultDoc.getPageCount()).toBe(2);
    });
  });

  describe('5. Security & Path Traversal Prevention', () => {
    it('should reject path traversal in file download', async () => {
      const res = await request(app).get('/api/certificates/..%2F..%2Fpackage.json/download');
      expect(res.status).toBe(404);
    });

    it('should reject access to non-existent template ID', async () => {
      const res = await request(app).get('/api/templates/64f1234567890abcdef12345');
      expect(res.status).toBe(404);
    });
  });

  describe('6. Smart Name Section Detection & Auto-Placement', () => {
    it('should automatically detect the recipient name section during upload', async () => {
      const res = await request(app)
        .post('/api/templates/upload')
        .attach('file', samplePdfBuffer, 'cert_with_name.pdf');

      expect(res.status).toBe(200);
      expect(res.body.detectedNameSection).toBeDefined();
      expect(res.body.detectedNameSection.found).toBe(true);
      expect(res.body.detectedNameSection.detectedText).toContain('John Doe');
      expect(res.body.detectedNameSection.x).toBeGreaterThan(0);
      expect(res.body.detectedNameSection.y).toBeGreaterThan(0);
      expect(res.body.detectedNameSection.suggestedPatch).toBeDefined();
      expect(res.body.detectedNameSection.suggestedPatch.width).toBeGreaterThan(0);
    });

    it('should re-detect name section on existing template via /api/templates/:id/detect-name', async () => {
      const uploadRes = await request(app)
        .post('/api/templates/upload')
        .attach('file', samplePdfBuffer, 'detect_test.pdf');

      const templateRes = await request(app)
        .post('/api/templates')
        .send({
          name: 'Detection Test',
          fileKey: uploadRes.body.fileKey,
          originalFileName: 'detect_test.pdf',
          fileType: 'pdf',
          pageDimensions: { width: 842, height: 595, orientation: 'landscape' },
          selectedPage: 1,
          totalPages: 1,
        });

      const detectRes = await request(app)
        .post(`/api/templates/${templateRes.body.template.id}/detect-name`);

      expect(detectRes.status).toBe(200);
      expect(detectRes.body.detection).toBeDefined();
      expect(detectRes.body.detection.found).toBe(true);
      expect(detectRes.body.detection.detectedText).toContain('John Doe');
    });
  });

  describe('7. Multiple Fonts & Bulk Excel Certificate Generation', () => {
    let bulkTemplateId: string;

    beforeAll(async () => {
      const uploadRes = await request(app)
        .post('/api/templates/upload')
        .attach('file', samplePdfBuffer, 'bulk_test_base.pdf');

      const templateRes = await request(app)
        .post('/api/templates')
        .send({
          name: 'Bulk Excellence Template',
          fileKey: uploadRes.body.fileKey,
          originalFileName: 'bulk_test_base.pdf',
          fileType: 'pdf',
          pageDimensions: { width: 842, height: 595, orientation: 'landscape' },
          selectedPage: 1,
          totalPages: 1,
          fields: [
            {
              id: 'recipient_field',
              type: 'recipient_name',
              label: 'Recipient Name',
              key: 'recipient_name',
              isDynamic: true,
              x: 150,
              y: 200,
              width: 540,
              height: 50,
              style: {
                fontFamily: 'PlayfairDisplay', // Custom Google Font!
                fontSize: 32,
                isBold: false,
                isItalic: false,
                color: '#1e3a8a',
                alignment: 'center',
                autoShrink: true,
              },
            },
            {
              id: 'event_field',
              type: 'event_name',
              label: 'Event Name',
              key: 'event_name',
              isDynamic: true,
              x: 150,
              y: 270,
              width: 540,
              height: 35,
              style: {
                fontFamily: 'GreatVibes', // Calligraphy font!
                fontSize: 24,
                isBold: false,
                isItalic: false,
                color: '#475569',
                alignment: 'center',
              },
            },
          ],
        });

      bulkTemplateId = templateRes.body.template.id;
    });

    it('should generate a PDF embedding custom TrueType fonts (PlayfairDisplay & GreatVibes)', async () => {
      const res = await request(app)
        .post(`/api/templates/${bulkTemplateId}/preview`)
        .send({
          values: {
            recipient_name: 'Sophia Alistair Montgomery',
            event_name: 'Global Leadership Summit',
          },
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');

      const doc = await PDFDocument.load(res.body);
      expect(doc.getPageCount()).toBe(1);
    });

    it('should parse an uploaded CSV/Excel spreadsheet and suggest column mappings', async () => {
      const csvData =
        'Full Name,Event Name,Date\n' +
        'Alice Smith,Web Engineering 2026,2026-10-27\n' +
        'Bob Jones,Web Engineering 2026,2026-10-27\n' +
        'Charlie Brown,Web Engineering 2026,2026-10-27\n';

      const res = await request(app)
        .post(`/api/templates/${bulkTemplateId}/bulk-parse`)
        .attach('spreadsheet', Buffer.from(csvData), 'attendees.csv');

      expect(res.status).toBe(200);
      expect(res.body.totalRows).toBe(3);
      expect(res.body.headers).toContain('Full Name');
      expect(res.body.suggestedMapping.recipient_name).toBe('Full Name');
      expect(res.body.suggestedMapping.event_name).toBe('Event Name');
    });

    it('should bulk generate a Combined Master PDF containing all recipients', async () => {
      const rows = [
        { 'Full Name': 'Alice Smith', 'Event Name': 'Web Engineering 2026' },
        { 'Full Name': 'Bob Jones', 'Event Name': 'Web Engineering 2026' },
        { 'Full Name': 'Charlie Brown', 'Event Name': 'Web Engineering 2026' },
      ];

      const res = await request(app)
        .post(`/api/templates/${bulkTemplateId}/bulk-generate`)
        .send({
          rows,
          columnMapping: {
            recipient_name: 'Full Name',
            event_name: 'Event Name',
          },
          mode: 'combined_pdf',
          baseFileName: 'Master_Certificates',
        });

      expect(res.status).toBe(200);
      expect(res.body.totalGenerated).toBe(3);
      expect(res.body.mode).toBe('combined_pdf');
      expect(res.body.downloadUrl).toBeDefined();

      // Download the combined PDF and verify it has 3 pages (1 per recipient)
      const downloadRes = await request(app).get(res.body.downloadUrl);
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.header['content-type']).toBe('application/pdf');

      const combinedDoc = await PDFDocument.load(downloadRes.body);
      expect(combinedDoc.getPageCount()).toBe(3);
    });

    it('should bulk generate a ZIP archive containing individual PDFs for all recipients', async () => {
      const rows = [
        { 'Full Name': 'David Clark' },
        { 'Full Name': 'Emma Watson' },
      ];

      const res = await request(app)
        .post(`/api/templates/${bulkTemplateId}/bulk-generate`)
        .send({
          rows,
          columnMapping: { recipient_name: 'Full Name' },
          mode: 'zip_archive',
          baseFileName: 'Individual_Certificates',
        });

      expect(res.status).toBe(200);
      expect(res.body.totalGenerated).toBe(2);
      expect(res.body.mode).toBe('zip_archive');

      // Download ZIP and verify header
      const downloadRes = await request(app).get(res.body.downloadUrl);
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.header['content-type']).toBe('application/zip');
      expect(downloadRes.header['content-disposition']).toContain('.zip');
    });
  });
});
