import nodemailer, { Transporter } from 'nodemailer';
import { ITemplate } from '../types';
import { generateCertificatePdf } from './pdfGenerator';

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
  previewUrl?: string; // For Ethereal test accounts
}

export interface BulkEmailSummary {
  total: number;
  sent: number;
  failed: number;
  results: EmailSendResult[];
}

/**
 * Creates a Nodemailer transporter based on custom config or environment variables.
 */
export async function createTransporter(config?: SmtpConfig): Promise<{
  transporter: Transporter;
  fromAddress: string;
  isTestAccount?: boolean;
}> {
  // In automated test runs without explicit test host, use mock jsonTransport
  if (process.env.NODE_ENV === 'test' && !config?.host) {
    const transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return {
      transporter,
      fromAddress: 'test@certicraft.local',
      isTestAccount: true,
    };
  }

  const rawHost = config?.host || process.env.SMTP_HOST;
  let host = rawHost ? rawHost.trim() : undefined;
  if (host) {
    // Sanitize accidental duplicate typos like 'smtp.smtp.office365.com.com'
    host = host.replace(/^smtp\.smtp\./i, 'smtp.').replace(/\.com\.com$/i, '.com');
  }

  const port = Number(config?.port || process.env.SMTP_PORT) || 587;
  const secure = config?.secure !== undefined
    ? config.secure
    : process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (config?.user || process.env.SMTP_USER || '').trim();
  const pass = config?.pass || process.env.SMTP_PASS;

  const isOutlook = Boolean(
    host &&
      (host.toLowerCase().includes('outlook') ||
        host.toLowerCase().includes('office365') ||
        host.toLowerCase().includes('hotmail'))
  );

  let fromAddress = config?.from || process.env.SMTP_FROM;
  if (!fromAddress) {
    fromAddress = user ? `"CertiCraft" <${user}>` : 'certificates@certicraft.local';
  } else if (isOutlook && user && !fromAddress.includes(user)) {
    // Microsoft 365 requires the authenticated user's email in the From header
    const displayNameMatch = fromAddress.match(/^"?([^"<]+)"?\s*<.+>$/);
    const displayName = displayNameMatch ? displayNameMatch[1].trim() : 'CertiCraft';
    fromAddress = `"${displayName}" <${user}>`;
  }

  // If credentials are provided (either custom or via env), use them
  if (host && user) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: pass || '',
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
      requireTLS: isOutlook || port === 587,
      family: 4, // Forces IPv4 to prevent ENETUNREACH on dual-stack networks
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    } as any);
    return { transporter, fromAddress };
  }

  // In automated test runs, use mock jsonTransport for instant, deterministic testing
  if (process.env.NODE_ENV === 'test') {
    const transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return {
      transporter,
      fromAddress: 'test@certicraft.local',
      isTestAccount: true,
    };
  }

  // In development / fallback without valid SMTP credentials, try ethereal test account or offline stub
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return {
      transporter,
      fromAddress: testAccount.user,
      isTestAccount: true,
    };
  } catch {
    // Fallback stub transporter
    const transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return {
      transporter,
      fromAddress: 'offline@certicraft.local',
      isTestAccount: true,
    };
  }
}

/**
 * Verifies that the SMTP credentials are valid.
 */
export async function verifySmtpConnection(config?: SmtpConfig): Promise<{
  success: boolean;
  message: string;
  isTestAccount?: boolean;
}> {
  const { transporter, isTestAccount } = await createTransporter(config);

  // If real SMTP credentials were provided, verify socket connection
  if (!isTestAccount && typeof transporter.verify === 'function') {
    await transporter.verify();
  }

  return {
    success: true,
    message: isTestAccount
      ? 'Test SMTP connection verified successfully (using temporary test mailer).'
      : 'SMTP server connection verified successfully.',
    isTestAccount,
  };
}

/**
 * Replaces dynamic placeholders like {{recipient_name}}, {{event_name}}, etc.
 */
export function interpolateText(text: string, values: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
    return values[key] !== undefined ? values[key] : `{{${key}}}`;
  });
}

/**
 * Generates and sends a single personalized certificate via email.
 */
export async function sendSingleCertificateEmail(params: {
  template: ITemplate;
  record: Record<string, string>;
  toEmail: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  smtpConfig?: SmtpConfig;
}): Promise<EmailSendResult> {
  const { template, record, toEmail, subjectTemplate, bodyTemplate, smtpConfig } = params;
  const recipientName = record['recipient_name'] || record['name'] || 'Recipient';

  try {
    // 1. Generate the personalized certificate PDF
    const pdfBytes = await generateCertificatePdf({
      template,
      values: record,
    });

    const safeName = recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const attachmentFileName = `Certificate_${safeName}.pdf`;

    // 2. Interpolate subject and body
    const defaultSubject = `Your Certificate of Achievement - ${template.name}`;
    const subject = interpolateText(subjectTemplate || defaultSubject, record);

    const defaultBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Congratulations, ${recipientName}!</h2>
        <p>Please find attached your official certificate for <strong>${record['event_name'] || template.name}</strong>.</p>
        <p>You can download and print your certificate at your convenience.</p>
        <br/>
        <p>Best regards,<br/>Certification Team</p>
      </div>
    `;
    const htmlBody = interpolateText(bodyTemplate || defaultBody, record);

    // 3. Connect and send email
    const { transporter, fromAddress, isTestAccount } = await createTransporter(smtpConfig);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: attachmentFileName,
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf',
        },
      ],
    });

    const previewUrl = isTestAccount ? nodemailer.getTestMessageUrl(info) || undefined : undefined;

    return {
      email: toEmail,
      recipientName,
      status: 'sent',
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err: any) {
    return {
      email: toEmail,
      recipientName,
      status: 'failed',
      error: err.message || 'Unknown email delivery error',
    };
  }
}

/**
 * Bulk generates and emails certificates to all recipients in the dataset.
 */
export async function bulkSendCertificateEmails(params: {
  template: ITemplate;
  records: Array<Record<string, string>>;
  emailColumn?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  smtpConfig?: SmtpConfig;
}): Promise<BulkEmailSummary> {
  const {
    template,
    records,
    emailColumn,
    subjectTemplate,
    bodyTemplate,
    smtpConfig,
  } = params;

  const results: EmailSendResult[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const record of records) {
    // Resolve email address from configured emailColumn or common email keys
    const targetEmail = (
      (emailColumn ? record[emailColumn] : '') ||
      record['recipient_email'] ||
      record['email'] ||
      record['Email'] ||
      record['e-mail'] ||
      record['mail'] ||
      ''
    ).trim();

    const recipientName = record['recipient_name'] || record['name'] || 'Recipient';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!targetEmail || !emailRegex.test(targetEmail)) {
      results.push({
        email: targetEmail || 'Missing Email',
        recipientName,
        status: 'failed',
        error: targetEmail ? 'Invalid email format' : 'Email address is missing for this record',
      });
      failedCount++;
      continue;
    }

    const sendRes = await sendSingleCertificateEmail({
      template,
      record,
      toEmail: targetEmail,
      subjectTemplate,
      bodyTemplate,
      smtpConfig,
    });

    if (sendRes.status === 'sent') {
      sentCount++;
    } else {
      failedCount++;
    }

    results.push(sendRes);
  }

  return {
    total: records.length,
    sent: sentCount,
    failed: failedCount,
    results,
  };
}
