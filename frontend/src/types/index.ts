export type FieldType =
  | 'recipient_name'
  | 'certificate_title'
  | 'event_name'
  | 'issue_date'
  | 'completion_date'
  | 'expiry_date'
  | 'roll_number'
  | 'organization_name'
  | 'authority_name'
  | 'authority_designation'
  | 'custom_text'
  | 'signature_image'
  | 'logo_image';

export type TextAlignment = 'left' | 'center' | 'right';
export type PageOrientation = 'landscape' | 'portrait';

export type FontFamily =
  | 'Helvetica'
  | 'TimesRoman'
  | 'Courier'
  | 'GreatVibes'
  | 'AlexBrush'
  | 'DancingScript'
  | 'PinyonScript'
  | 'PlayfairDisplay'
  | 'Cinzel'
  | 'Montserrat';

export interface FieldStyle {
  fontFamily: FontFamily;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  alignment: TextAlignment;
  letterSpacing?: number;
  lineHeight?: number;
  autoShrink?: boolean;
  minFontSize?: number;
  dateFormat?: string;
}

export interface CertificateField {
  id: string;
  type: FieldType;
  label: string;
  key: string;
  isDynamic: boolean;
  defaultValue?: string;
  sampleValue?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style: FieldStyle;
  assetKey?: string;
  assetUrl?: string;
}

export interface BackgroundPatch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  opacity?: number;
}

export interface PageDimensions {
  width: number;
  height: number;
  orientation: PageOrientation;
}

export interface ITemplate {
  id: string;
  name: string;
  fileKey: string;
  originalFileName: string;
  fileType: 'pdf' | 'png' | 'jpg' | 'jpeg';
  pageDimensions: PageDimensions;
  selectedPage: number;
  totalPages: number;
  fields: CertificateField[];
  patches: BackgroundPatch[];
  createdAt: string;
  updatedAt: string;
}

export interface DetectedNameSection {
  found: boolean;
  confidence: 'high' | 'medium' | 'fallback';
  detectedText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  suggestedPatch?: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor: string;
  };
}

export interface UploadResponse {
  message: string;
  fileKey: string;
  originalFileName: string;
  fileType: 'pdf' | 'png' | 'jpg' | 'jpeg';
  dimensions: PageDimensions;
  totalPages: number;
  detectedNameSection?: DetectedNameSection;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

export interface EmailSendResult {
  email: string;
  recipientName: string;
  status: 'sent' | 'failed';
  error?: string;
  messageId?: string;
  previewUrl?: string;
}

export interface BulkEmailSummary {
  message: string;
  total: number;
  sent: number;
  failed: number;
  results: EmailSendResult[];
}
