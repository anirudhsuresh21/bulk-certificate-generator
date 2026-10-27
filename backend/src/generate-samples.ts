import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateSampleFiles() {
  const samplesDir = path.resolve(__dirname, '../sample-assets');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  // 1. Create Sample Certificate PDF (A4 Landscape 842 x 595)
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Outer border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 802,
    height: 555,
    borderWidth: 3,
    borderColor: rgb(0.12, 0.23, 0.45),
    color: rgb(0.98, 0.99, 1.0),
  });

  page.drawRectangle({
    x: 28,
    y: 28,
    width: 786,
    height: 539,
    borderWidth: 1,
    borderColor: rgb(0.8, 0.7, 0.4),
  });

  // Certificate Header
  page.drawText('CERTIFICATE OF ACCOMPLISHMENT', {
    x: 180,
    y: 470,
    size: 26,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.45),
  });

  page.drawText('THIS CERTIFICATE IS PROUDLY PRESENTED TO', {
    x: 245,
    y: 420,
    size: 13,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.55),
  });

  // Legacy name to be replaced/covered
  page.drawText('Sample Participant Name', {
    x: 270,
    y: 350,
    size: 24,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2),
  });

  page.drawText('For successfully completing the Advanced Engineering Workshop', {
    x: 220,
    y: 290,
    size: 14,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  // Signature line
  page.drawLine({
    start: { x: 550, y: 150 },
    end: { x: 720, y: 150 },
    thickness: 1.5,
    color: rgb(0.6, 0.65, 0.7),
  });

  page.drawText('Authorized Signature', {
    x: 580,
    y: 130,
    size: 11,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  const pdfBytes = await doc.save();
  fs.writeFileSync(path.join(samplesDir, 'sample_certificate.pdf'), Buffer.from(pdfBytes));

  // 2. Create Transparent Signature PNG
  const svgSig = `
    <svg width="240" height="90" viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M 20 60 Q 60 10 90 50 T 150 40 T 210 25" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
      <path d="M 50 45 Q 80 80 120 40" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
      <path d="M 130 55 L 190 55" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `;

  await sharp(Buffer.from(svgSig))
    .png()
    .toFile(path.join(samplesDir, 'sample_signature.png'));

  console.log('Sample files generated in sample-assets/');
}

generateSampleFiles();
