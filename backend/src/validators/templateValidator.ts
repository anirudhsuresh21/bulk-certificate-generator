import { z } from 'zod';

export const FieldStyleSchema = z.object({
  fontFamily: z
    .enum([
      'Helvetica',
      'TimesRoman',
      'Courier',
      'GreatVibes',
      'AlexBrush',
      'DancingScript',
      'PinyonScript',
      'PlayfairDisplay',
      'Cinzel',
      'Montserrat',
    ])
    .default('Helvetica'),
  fontSize: z.number().min(6).max(200).default(24),
  isBold: z.boolean().default(false),
  isItalic: z.boolean().default(false),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').default('#000000'),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  letterSpacing: z.number().optional().default(0),
  lineHeight: z.number().optional().default(1.2),
  autoShrink: z.boolean().optional().default(true),
  minFontSize: z.number().optional().default(12),
  dateFormat: z.string().optional().default('YYYY-MM-DD'),
});

export const CertificateFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'recipient_name',
    'certificate_title',
    'event_name',
    'issue_date',
    'completion_date',
    'expiry_date',
    'roll_number',
    'organization_name',
    'authority_name',
    'authority_designation',
    'custom_text',
    'signature_image',
    'logo_image',
  ]),
  label: z.string().min(1),
  key: z.string().min(1),
  isDynamic: z.boolean().default(true),
  defaultValue: z.string().optional().default(''),
  sampleValue: z.string().optional().default(''),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional().default(0),
  style: FieldStyleSchema,
  assetKey: z.string().optional(),
  assetUrl: z.string().optional(),
});

export const BackgroundPatchSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  fillColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').default('#FFFFFF'),
  opacity: z.number().min(0).max(1).optional().default(1),
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(150),
  fileKey: z.string().min(1),
  originalFileName: z.string().min(1),
  fileType: z.enum(['pdf', 'png', 'jpg', 'jpeg']),
  pageDimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    orientation: z.enum(['landscape', 'portrait']),
  }),
  selectedPage: z.number().int().positive().default(1),
  totalPages: z.number().int().positive().default(1),
  fields: z.array(CertificateFieldSchema).default([]),
  patches: z.array(BackgroundPatchSchema).default([]),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  selectedPage: z.number().int().positive().optional(),
  fields: z.array(CertificateFieldSchema).optional(),
  patches: z.array(BackgroundPatchSchema).optional(),
});

export const GenerateCertificateSchema = z.object({
  values: z.record(z.string()).default({}),
  outputFileName: z.string().max(100).optional(),
});
