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
  color: string; // hex or rgb, e.g. #000000
  alignment: TextAlignment;
  letterSpacing?: number;
  lineHeight?: number;
  autoShrink?: boolean;
  minFontSize?: number;
  dateFormat?: string; // e.g. YYYY-MM-DD, DD/MM/YYYY, MMMM D, YYYY
}

export interface CertificateField {
  id: string;
  type: FieldType;
  label: string;
  key: string; // placeholder key e.g. "recipient_name", "authority_1_name"
  isDynamic: boolean; // true = supplied during generation, false = fixed template content
  defaultValue?: string;
  sampleValue?: string;
  
  // Coordinates relative to original document dimensions (points or unscaled pixels)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  
  style: FieldStyle;
  
  // For signature or logo images
  assetKey?: string;
  assetUrl?: string;
}

export interface BackgroundPatch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string; // hex e.g. #ffffff
  opacity?: number;
}

export interface PageDimensions {
  width: number;
  height: number;
  orientation: PageOrientation;
}

export interface ITemplate {
  id?: string;
  name: string;
  fileKey: string;
  originalFileName: string;
  fileType: 'pdf' | 'png' | 'jpg' | 'jpeg';
  pageDimensions: PageDimensions;
  selectedPage: number; // 1-indexed
  totalPages: number;
  fields: CertificateField[];
  patches: BackgroundPatch[];
  createdAt?: Date;
  updatedAt?: Date;
}
