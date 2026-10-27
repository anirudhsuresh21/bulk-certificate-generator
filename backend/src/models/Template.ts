import mongoose, { Document, Schema } from 'mongoose';
import { ITemplate, CertificateField, BackgroundPatch } from '../types';

export interface ITemplateDocument extends Omit<ITemplate, 'id'>, Document {}

const FieldStyleSchema = new Schema(
  {
    fontFamily: {
      type: String,
      enum: [
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
      ],
      default: 'Helvetica',
    },
    fontSize: { type: Number, default: 24 },
    isBold: { type: Boolean, default: false },
    isItalic: { type: Boolean, default: false },
    color: { type: String, default: '#000000' },
    alignment: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'center',
    },
    letterSpacing: { type: Number, default: 0 },
    lineHeight: { type: Number, default: 1.2 },
    autoShrink: { type: Boolean, default: true },
    minFontSize: { type: Number, default: 12 },
    dateFormat: { type: String, default: 'YYYY-MM-DD' },
  },
  { _id: false }
);

const CertificateFieldSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    label: { type: String, required: true },
    key: { type: String, required: true },
    isDynamic: { type: Boolean, default: true },
    defaultValue: { type: String, default: '' },
    sampleValue: { type: String, default: '' },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    rotation: { type: Number, default: 0 },
    style: { type: FieldStyleSchema, required: true },
    assetKey: { type: String },
    assetUrl: { type: String },
  },
  { _id: false }
);

const BackgroundPatchSchema = new Schema(
  {
    id: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    fillColor: { type: String, default: '#FFFFFF' },
    opacity: { type: Number, default: 1.0 },
  },
  { _id: false }
);

const TemplateSchema = new Schema<ITemplateDocument>(
  {
    name: { type: String, required: true, trim: true },
    fileKey: { type: String, required: true },
    originalFileName: { type: String, required: true },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'png', 'jpg', 'jpeg'],
    },
    pageDimensions: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      orientation: {
        type: String,
        required: true,
        enum: ['landscape', 'portrait'],
      },
    },
    selectedPage: { type: Number, default: 1 },
    totalPages: { type: Number, default: 1 },
    fields: [CertificateFieldSchema],
    patches: [BackgroundPatchSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Template = mongoose.model<ITemplateDocument>('Template', TemplateSchema);
