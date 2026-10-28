'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Eye,
  FileEdit,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Sparkles,
  FileSpreadsheet,
  UploadCloud,
  Layers,
  Archive,
  Table,
  Check,
  FileText,
  Mail,
  Send,
  Server,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { ITemplate, BulkEmailSummary, SmtpConfig } from '../../../types';

export default function CertificateGenerationPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<ITemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mode: Single vs Bulk
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single mode form values
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [outputFileName, setOutputFileName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bulk Excel / CSV & Email state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([]);
  const [bulkRows, setBulkRows] = useState<Array<Record<string, string>>>([]);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [bulkMode, setBulkMode] = useState<'combined_pdf' | 'zip_archive' | 'email_delivery'>('combined_pdf');
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkBaseName, setBulkBaseName] = useState('');

  // Email Delivery state
  const [emailColumn, setEmailColumn] = useState('');
  const [emailSubject, setEmailSubject] = useState('Your Certificate of Achievement — {{event_name}}');
  const [emailBody, setEmailBody] = useState(
    'Congratulations {{recipient_name}},\n\nPlease find attached your official certificate for {{event_name}}.\n\nBest regards,\nCertification Team'
  );
  const [useCustomSmtp, setUseCustomSmtp] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
  });
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string; isTestAccount?: boolean } | null>(null);
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [emailSummary, setEmailSummary] = useState<BulkEmailSummary | null>(null);
  const [showSmtpAdvanced, setShowSmtpAdvanced] = useState(false);
  const [smtpDemoTab, setSmtpDemoTab] = useState<'outlook' | 'gmail'>('outlook');
  const [bulkRightView, setBulkRightView] = useState<'data' | 'email_results'>('data');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load template
  useEffect(() => {
    if (!templateId) return;

    const loadTemplate = async () => {
      try {
        setLoading(true);
        const res = await api.getTemplate(templateId);
        const t = res.template;
        setTemplate(t);

        // Populate initial single values
        const initial: Record<string, string> = {};
        t.fields?.forEach((f) => {
          if (
            f.isDynamic &&
            f.type !== 'signature_image' &&
            f.type !== 'logo_image'
          ) {
            initial[f.key] = f.defaultValue || f.sampleValue || '';
          }
        });
        setFormValues(initial);

        // Default filename
        const recipient = initial['recipient_name'] || 'Participant';
        setOutputFileName(
          `Certificate_${recipient.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        );
        setBulkBaseName(`${t.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Certificates`);
      } catch (err: any) {
        setError(err.message || 'Failed to load certificate template.');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  // Update preview PDF whenever single values change or on-demand
  const refreshPreview = async (currentValues: Record<string, string>) => {
    if (!template) return;
    setPreviewLoading(true);
    try {
      const blob = await api.previewCertificate(template.id, currentValues);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      const newUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newUrl);
    } catch (err: any) {
      console.warn('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (template) {
      refreshPreview(formValues);
    }
  }, [template]);

  const handleInputChange = (key: string, value: string) => {
    const updated = { ...formValues, [key]: value };
    setFormValues(updated);

    if (key === 'recipient_name') {
      const clean = value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      setOutputFileName(`Certificate_${clean || 'Participant'}.pdf`);
    }
  };

  const handleGenerateAndDownloadSingle = async () => {
    if (!template) return;

    const missing: string[] = [];
    template.fields.forEach((f) => {
      if (
        f.isDynamic &&
        f.type !== 'signature_image' &&
        f.type !== 'logo_image'
      ) {
        if (!formValues[f.key]?.trim()) {
          missing.push(f.label || f.key);
        }
      }
    });

    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }

    setValidationErrors([]);
    setIsGenerating(true);

    try {
      const res = await api.generateCertificate(
        template.id,
        formValues,
        outputFileName.trim()
      );

      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.download = res.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Certificate "${res.fileName}" downloaded successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate certificate.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Bulk Excel spreadsheet handler
  const handleSpreadsheetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !template) return;
    const file = e.target.files[0];
    setBulkFile(file);
    setBulkParsing(true);

    try {
      const res = await api.parseBulkSpreadsheet(template.id, file);
      setBulkHeaders(res.headers);
      setBulkRows(res.rows);
      setPreviewRows(res.previewRows);

      // Initialize mapping with smart suggestions
      const initialMap: Record<string, string> = { ...res.suggestedMapping };
      // Fallback matching
      template.fields.forEach((f) => {
        if (!initialMap[f.key]) {
          const match = res.headers.find(
            (h) => h.toLowerCase() === f.key.toLowerCase() || h.toLowerCase() === f.label.toLowerCase()
          );
          if (match) initialMap[f.key] = match;
        }
      });
      setColumnMapping(initialMap);
      if (res.suggestedMapping['recipient_email']) {
        setEmailColumn(res.suggestedMapping['recipient_email']);
      } else {
        const foundEmailHeader = res.headers.find((h) => /email|mail/i.test(h));
        if (foundEmailHeader) setEmailColumn(foundEmailHeader);
      }
      showToast(`✨ Loaded ${res.totalRows} recipients from "${file.name}"!`);
    } catch (err: any) {
      alert(err.message || 'Failed to parse Excel/CSV spreadsheet.');
      setBulkFile(null);
    } finally {
      setBulkParsing(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    if (!template) return;
    const dynamicKeys = template.fields
      .filter((f) => f.isDynamic && f.type !== 'signature_image' && f.type !== 'logo_image')
      .map((f) => f.key);

    const baseHeaders = dynamicKeys.length > 0 ? dynamicKeys : ['recipient_name', 'issue_date', 'event_name'];
    const headers = baseHeaders.includes('email') || baseHeaders.includes('recipient_email')
      ? baseHeaders
      : [...baseHeaders, 'email'];

    const row1 = headers.map((k) =>
      k === 'recipient_name'
        ? 'Aarav Sharma'
        : k === 'email' || k === 'recipient_email'
        ? 'aarav@example.com'
        : k.includes('date')
        ? '2026-10-28'
        : 'Full Stack Workshop'
    ).join(',');

    const row2 = headers.map((k) =>
      k === 'recipient_name'
        ? 'Jane Doe'
        : k === 'email' || k === 'recipient_email'
        ? 'jane@example.com'
        : k.includes('date')
        ? '2026-10-28'
        : 'Full Stack Workshop'
    ).join(',');

    const csvContent = `${headers.join(',')}\n${row1}\n${row2}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Sample_${template.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Recipients.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtpConnection(useCustomSmtp ? smtpConfig : undefined);
      setSmtpTestResult(res);
      showToast('✅ ' + res.message);
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'SMTP connection test failed.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleRunBulkEmail = async () => {
    if (!template || bulkRows.length === 0) return;
    setBulkEmailing(true);
    setEmailSummary(null);

    try {
      const res = await api.bulkEmail(template.id, {
        rows: bulkRows,
        columnMapping,
        emailColumn: emailColumn || columnMapping['recipient_email'],
        subjectTemplate: emailSubject,
        bodyTemplate: emailBody.replace(/\n/g, '<br/>'),
        smtpConfig: useCustomSmtp ? smtpConfig : undefined,
      });

      setEmailSummary(res);
      setBulkRightView('email_results');
      showToast(`📧 Campaign complete! ${res.sent} sent, ${res.failed} failed.`);
    } catch (err: any) {
      alert(err.message || 'Failed to send bulk certificate emails.');
    } finally {
      setBulkEmailing(false);
    }
  };

  const handleRunBulkGeneration = async () => {
    if (!template || bulkRows.length === 0) return;
    setBulkGenerating(true);

    try {
      const res = await api.bulkGenerate(template.id, {
        rows: bulkRows,
        columnMapping,
        mode: bulkMode === 'zip_archive' ? 'zip_archive' : 'combined_pdf',
        baseFileName: bulkBaseName.trim() || template.name,
      });

      // Trigger automatic file download
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.download = res.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`🎉 Generated & downloaded ${res.totalGenerated} certificates in ${res.mode === 'combined_pdf' ? 'a combined Master PDF' : 'a ZIP archive'}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate bulk certificates.');
    } finally {
      setBulkGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
        <h2 className="text-xl font-bold text-slate-900">Template Error</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">{error}</p>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const dynamicFields = template.fields.filter(
    (f) =>
      f.isDynamic &&
      f.type !== 'signature_image' &&
      f.type !== 'logo_image'
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm animate-bounce-short">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white border-b px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Generate Certificates
              </h1>
              <p className="text-xs text-slate-500">
                Template: <span className="font-semibold text-slate-700">{template.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'single'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Certificate
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'bulk'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Excel / CSV</span>
              </button>
            </div>

            <Link
              href={`/editor/${template.id}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <FileEdit className="w-4 h-4 text-slate-500" />
              <span>Editor</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form / Bulk Upload */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border shadow-xs space-y-6">
          {activeTab === 'single' ? (
            /* SINGLE CERTIFICATE WORKFLOW */
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recipient & Certificate Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter values to stamp onto the certificate.
                </p>
              </div>

              {/* Recorded Name Position Indicator */}
              {template.fields.find((f) => f.key === 'recipient_name') && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-indigo-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Recorded Name Position:
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 font-semibold">
                    X:{template.fields.find((f) => f.key === 'recipient_name')?.x} pt, Y:{template.fields.find((f) => f.key === 'recipient_name')?.y} pt
                  </span>
                </div>
              )}

              {/* Validation Warnings */}
              {validationErrors.length > 0 && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Please fill in the required fields:</span>
                  </div>
                  <ul className="list-disc list-inside pl-1 text-[11px] text-red-700">
                    {validationErrors.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dynamic Fields Form */}
              <div className="space-y-4">
                {dynamicFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>{field.label}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {`{{${field.key}}}`}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formValues[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-slate-300"
                    />
                  </div>
                ))}
              </div>

              {/* Output Filename */}
              <div className="pt-2 border-t space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Output PDF Filename
                </label>
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="Certificate.pdf"
                  className="w-full px-3.5 py-2.5 border rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 border-slate-300"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => refreshPreview(formValues)}
                  disabled={previewLoading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-xl border border-slate-200 transition"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>Update Preview</span>
                </button>

                <button
                  onClick={handleGenerateAndDownloadSingle}
                  disabled={isGenerating}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download Single PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* BULK EXCEL / CSV WORKFLOW */
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Bulk Excel / CSV Generator
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload an Excel of names to generate all certificates at once.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  title="Download a starter CSV with this template's columns"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample CSV</span>
                </button>
              </div>

              {/* Excel Dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleSpreadsheetFile}
              />

              {!bulkFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 p-6 rounded-2xl text-center cursor-pointer transition flex flex-col items-center gap-2 bg-slate-50/50"
                >
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Upload Excel (.xlsx, .xls) or CSV
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Columns should include recipient names and any optional dates or IDs
                    </p>
                  </div>
                  <span className="mt-2 text-xs font-semibold px-3 py-1 bg-white border rounded-lg text-slate-700 shadow-xs">
                    Choose Spreadsheet File
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950 truncate max-w-xs">
                        {bulkFile.name}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        {bulkRows.length} recipients detected &bull; {bulkHeaders.length} columns
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBulkFile(null);
                      setBulkRows([]);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Column Mapping Section */}
              {bulkRows.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Map Spreadsheet Columns
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Auto-mapped
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {dynamicFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800">
                            {field.label}
                          </span>
                          <span className="block text-[10px] font-mono text-slate-400">
                            {`{{${field.key}}}`}
                          </span>
                        </div>
                        <select
                          value={columnMapping[field.key] || ''}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              [field.key]: e.target.value,
                            })
                          }
                          className="px-2.5 py-1.5 border rounded-lg text-xs bg-white text-slate-700 font-semibold focus:ring-1 focus:ring-blue-500 max-w-[160px]"
                        >
                          <option value="">-- Ignore --</option>
                          {bulkHeaders.map((header) => (
                            <option key={header} value={header}>
                              Column: {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Output Mode Selection: Combined PDF vs ZIP vs Email Delivery */}
                  <div className="pt-3 border-t space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      Delivery & Export Action
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkMode('combined_pdf')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          bulkMode === 'combined_pdf'
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Combined PDF</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Single multi-page PDF
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBulkMode('zip_archive')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          bulkMode === 'zip_archive'
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Archive className="w-3.5 h-3.5 text-purple-600" />
                          <span>ZIP Archive</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Individual PDF files
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBulkMode('email_delivery')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          bulkMode === 'email_delivery'
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Mail className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Send via Email</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Nodemailer PDF delivery
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* If PDF Export (Combined or ZIP) */}
                  {bulkMode !== 'email_delivery' && (
                    <>
                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Base Filename
                        </label>
                        <input
                          type="text"
                          value={bulkBaseName}
                          onChange={(e) => setBulkBaseName(e.target.value)}
                          placeholder="Certificates"
                          className="w-full px-3.5 py-2 border rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleRunBulkGeneration}
                          disabled={bulkGenerating}
                          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3.5 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                        >
                          {bulkGenerating ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Generating {bulkRows.length} Certificates in PDF...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-5 h-5" />
                              <span>
                                Generate & Download {bulkRows.length} Certificates ({bulkMode === 'combined_pdf' ? 'Combined PDF' : 'ZIP'})
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}

                  {/* If Email Delivery Mode */}
                  {bulkMode === 'email_delivery' && (
                    <div className="space-y-4 pt-1">
                      {/* Recipient Email Column Selector */}
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>Recipient Email Column</span>
                          <span className="text-[10px] font-normal text-emerald-700">Required</span>
                        </label>
                        <select
                          value={emailColumn}
                          onChange={(e) => setEmailColumn(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Select Email Column from Excel --</option>
                          {bulkHeaders.map((header) => (
                            <option key={header} value={header}>
                              Column: {header}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500">
                          Personalized certificates will be attached to emails sent to this column.
                        </p>
                      </div>

                      {/* Subject Template */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>Email Subject</span>
                          <span className="text-[10px] text-slate-400">Supports placeholders</span>
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-3.5 py-2 border rounded-lg text-xs font-mono"
                          placeholder="Certificate for {{event_name}}"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {['{{recipient_name}}', '{{event_name}}', '{{issue_date}}'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setEmailSubject((prev) => `${prev} ${tag}`)}
                              className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-mono transition"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Email Body Message */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>Email Body Message</span>
                          <span className="text-[10px] text-slate-400">Sent as formatted email</span>
                        </label>
                        <textarea
                          rows={4}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="w-full px-3.5 py-2 border rounded-lg text-xs font-sans leading-relaxed"
                          placeholder="Enter your message to recipients..."
                        />
                      </div>

                      {/* SMTP Configuration Expandable Panel */}
                      <div className="border rounded-xl bg-slate-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowSmtpAdvanced(!showSmtpAdvanced)}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-2">
                            <Server className="w-3.5 h-3.5 text-slate-500" />
                            <span>SMTP Server Settings</span>
                            <span className="text-[10px] font-normal text-slate-400">
                              ({useCustomSmtp ? 'Custom Credentials' : 'Using System .env / Ethereal Test'})
                            </span>
                          </div>
                          {showSmtpAdvanced ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {showSmtpAdvanced && (
                          <div className="p-3.5 border-t bg-white space-y-3 text-xs">
                            <div className="flex items-center gap-2 pb-1">
                              <input
                                type="checkbox"
                                id="useCustomSmtp"
                                checked={useCustomSmtp}
                                onChange={(e) => setUseCustomSmtp(e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <label htmlFor="useCustomSmtp" className="font-semibold text-slate-700 cursor-pointer">
                                Override with custom SMTP credentials
                              </label>
                            </div>

                            {useCustomSmtp && (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {/* Provider Quick Presets */}
                                <div className="space-y-1 col-span-2">
                                  <label className="text-[11px] text-slate-500 font-medium">Quick Presets:</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSmtpConfig({ ...smtpConfig, host: 'smtp.office365.com', port: 587, secure: false })}
                                      className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200 transition"
                                    >
                                      Microsoft 365 / Office 365
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSmtpConfig({ ...smtpConfig, host: 'smtp-mail.outlook.com', port: 587, secure: false })}
                                      className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[11px] font-semibold border border-sky-200 transition"
                                    >
                                      Outlook.com / Hotmail
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSmtpConfig({ ...smtpConfig, host: 'smtp.gmail.com', port: 587, secure: false })}
                                      className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[11px] font-semibold border border-red-200 transition"
                                    >
                                      Gmail
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <label className="text-[11px] text-slate-500 font-medium">SMTP Host</label>
                                  <input
                                    type="text"
                                    value={smtpConfig.host || ''}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                    placeholder="smtp.office365.com"
                                    className="w-full px-2.5 py-1.5 border rounded text-xs"
                                  />
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <label className="text-[11px] text-slate-500 font-medium">SMTP Port</label>
                                  <input
                                    type="number"
                                    value={smtpConfig.port || 587}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                                    placeholder="587"
                                    className="w-full px-2.5 py-1.5 border rounded text-xs"
                                  />
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <label className="text-[11px] text-slate-500 font-medium">Username / Email</label>
                                  <input
                                    type="text"
                                    value={smtpConfig.user || ''}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                                    placeholder="yourname@outlook.com"
                                    className="w-full px-2.5 py-1.5 border rounded text-xs"
                                  />
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <label className="text-[11px] text-slate-500 font-medium">Password / App Pass</label>
                                  <input
                                    type="password"
                                    value={smtpConfig.pass || ''}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-2.5 py-1.5 border rounded text-xs"
                                  />
                                </div>
                                <div className="space-y-1 col-span-2">
                                  <label className="text-[11px] text-slate-500 font-medium">Sender Display (From)</label>
                                  <input
                                    type="text"
                                    value={smtpConfig.from || ''}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                                    placeholder="Certificates &lt;yourname@outlook.com&gt;"
                                    className="w-full px-2.5 py-1.5 border rounded text-xs"
                                  />
                                </div>

                                {/* Live Field-by-Field Demo for Outlook and Gmail */}
                                <div className="col-span-2 mt-2 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                  <div className="px-3 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between flex-wrap gap-1.5">
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-800">
                                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                      <span>What to fill in each field (Live Demo):</span>
                                    </div>
                                    <div className="flex bg-white p-0.5 rounded-lg border border-slate-200">
                                      <button
                                        type="button"
                                        onClick={() => setSmtpDemoTab('outlook')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                                          smtpDemoTab === 'outlook'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        Outlook / Office 365
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSmtpDemoTab('gmail')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                                          smtpDemoTab === 'gmail'
                                            ? 'bg-red-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        Google Gmail
                                      </button>
                                    </div>
                                  </div>

                                  {smtpDemoTab === 'outlook' ? (
                                    <div className="p-3 space-y-2 text-[11px] bg-blue-50/30">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-blue-900 flex items-center gap-1">
                                          🏢 Microsoft Outlook / Office 365
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSmtpConfig({
                                              host: 'smtp.office365.com',
                                              port: 587,
                                              secure: false,
                                              user: 'anirudha.mca25@siescoms.sies.edu.in',
                                              pass: '',
                                              from: '"CertiCraft" <anirudha.mca25@siescoms.sies.edu.in>',
                                            });
                                            showToast('✨ Loaded Outlook template into inputs!');
                                          }}
                                          className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline flex items-center gap-1"
                                        >
                                          ⚡ Autofill into fields
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-1 gap-1.5 font-mono text-[10px]">
                                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">1. SMTP Host</span>
                                            <span className="text-[9px] text-blue-600 font-semibold">Standard</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">smtp.office365.com</p>
                                          <p className="font-sans text-[10px] text-slate-500">
                                            For work/school/college accounts use <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-700">smtp.office365.com</code>. For personal @outlook.com / @hotmail.com, you can also use <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-700">smtp-mail.outlook.com</code>.
                                          </p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">2. SMTP Port</span>
                                            <span className="text-[9px] text-slate-400">STARTTLS</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">587</p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">3. Username / Email</span>
                                            <span className="text-[9px] text-blue-600 font-semibold">Your full email</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">anirudha.mca25@siescoms.sies.edu.in</p>
                                          <p className="font-sans text-[10px] text-slate-500">
                                            Enter your full college, organization, or personal Microsoft email address.
                                          </p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">4. Password / App Pass</span>
                                            <span className="text-[9px] text-slate-400">Login pass</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">••••••••</p>
                                          <p className="font-sans text-[10px] text-slate-500">
                                            Your regular Microsoft account password (or 16-character Microsoft App Password if 2-Step Verification is active).
                                          </p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">5. Sender Display (From)</span>
                                            <span className="text-[9px] text-amber-600 font-semibold">Crucial rule</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">"CertiCraft" &lt;anirudha.mca25@siescoms.sies.edu.in&gt;</p>
                                          <p className="font-sans text-[10px] text-amber-700 font-medium">
                                            ⚠️ Microsoft requires the email in &lt;...&gt; to match your Username exactly. The display name in quotes can be whatever you want.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 space-y-2 text-[11px] bg-red-50/30">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-red-900 flex items-center gap-1">
                                          📮 Google Gmail Demo
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSmtpConfig({
                                              host: 'smtp.gmail.com',
                                              port: 587,
                                              secure: false,
                                              user: 'yourname@gmail.com',
                                              pass: '',
                                              from: '"CertiCraft" <yourname@gmail.com>',
                                            });
                                            showToast('✨ Loaded Gmail template into inputs!');
                                          }}
                                          className="text-[10px] text-red-700 hover:text-red-900 font-bold underline flex items-center gap-1"
                                        >
                                          ⚡ Autofill into fields
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-1 gap-1.5 font-mono text-[10px]">
                                        <div className="bg-white p-2 rounded-lg border border-red-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">1. SMTP Host</span>
                                            <span className="text-[9px] text-red-600 font-semibold">Standard</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">smtp.gmail.com</p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-red-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">2. SMTP Port</span>
                                            <span className="text-[9px] text-slate-400">STARTTLS</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">587</p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-red-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">3. Username / Email</span>
                                            <span className="text-[9px] text-red-600 font-semibold">Your Google Email</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">yourname@gmail.com</p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-red-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">4. Password (App Password)</span>
                                            <span className="text-[9px] text-red-600 font-semibold">16 characters</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">abcd efgh ijkl mnop</p>
                                          <p className="font-sans text-[10px] text-red-700 font-medium">
                                            ⚠️ Regular Gmail password will NOT work. Visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold inline-flex items-center gap-0.5">Google App Passwords <ExternalLink className="w-2.5 h-2.5 inline" /></a>, generate a 16-character password for App: "Mail", and paste it here.
                                          </p>
                                        </div>

                                        <div className="bg-white p-2 rounded-lg border border-red-100 shadow-xs space-y-0.5">
                                          <div className="flex justify-between items-center text-slate-500 font-sans">
                                            <span className="font-bold text-slate-800">5. Sender Display (From)</span>
                                            <span className="text-[9px] text-slate-400">Display name + email</span>
                                          </div>
                                          <p className="text-slate-900 font-bold">"CertiCraft" &lt;yourname@gmail.com&gt;</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Test Connection Button */}
                            <div className="pt-2 flex items-center justify-between border-t">
                              <button
                                type="button"
                                onClick={handleTestSmtp}
                                disabled={testingSmtp}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                              >
                                {testingSmtp ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Verifying SMTP...</span>
                                  </>
                                ) : (
                                  <>
                                    <Key className="w-3.5 h-3.5" />
                                    <span>Test SMTP Connection</span>
                                  </>
                                )}
                              </button>

                              {smtpTestResult && (
                                <span
                                  className={`text-[11px] font-medium flex items-center gap-1 ${
                                    smtpTestResult.success ? 'text-emerald-600' : 'text-red-500'
                                  }`}
                                >
                                  {smtpTestResult.success ? 'Connected' : 'Failed'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Trigger Bulk Email Button */}
                      <div className="pt-2">
                        <button
                          onClick={handleRunBulkEmail}
                          disabled={bulkEmailing || !emailColumn}
                          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3.5 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                        >
                          {bulkEmailing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Sending Emails to {bulkRows.length} Recipients...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              <span>Send Certificates to All {bulkRows.length} Recipients</span>
                            </>
                          )}
                        </button>
                        {!emailColumn && (
                          <p className="text-[11px] text-amber-600 text-center mt-1">
                            Please select the recipient email column above to enable sending.
                          </p>
                        )}
                      </div>

                      {/* Campaign summary card */}
                      {emailSummary && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Campaign Summary
                            </span>
                            <span className="text-[11px] font-bold text-emerald-800">
                              {emailSummary.sent} / {emailSummary.total} Delivered
                            </span>
                          </div>
                          {emailSummary.failed > 0 && (
                            <p className="text-[11px] text-red-600">
                              ⚠️ {emailSummary.failed} emails could not be delivered. Check preview table on right.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live PDF Preview or Data Table */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab === 'bulk' && bulkRows.length > 0 ? (
                emailSummary && bulkRightView === 'email_results' ? (
                  <>
                    <Mail className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Email Campaign Delivery Report
                    </h3>
                  </>
                ) : (
                  <>
                    <Table className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Recipient Data Preview ({bulkRows.length} Total)
                    </h3>
                  </>
                )
              ) : (
                <>
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Live Certificate Template Preview
                  </h3>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle between Spreadsheet Data & Email Results */}
              {activeTab === 'bulk' && emailSummary && (
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border text-xs">
                  <button
                    type="button"
                    onClick={() => setBulkRightView('data')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      bulkRightView === 'data'
                        ? 'bg-white shadow-xs text-slate-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Spreadsheet Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkRightView('email_results')}
                    className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${
                      bulkRightView === 'email_results'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>Report ({emailSummary.sent}/{emailSummary.total})</span>
                  </button>
                </div>
              )}

              {previewLoading && (
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating preview...
                </span>
              )}
            </div>
          </div>

          {activeTab === 'bulk' && bulkRows.length > 0 ? (
            bulkRightView === 'email_results' && emailSummary ? (
              /* Email Results Table */
              <div className="flex-1 overflow-auto border rounded-xl bg-slate-50 p-2 space-y-3">
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-xs font-bold text-slate-700">Detailed Delivery Status</span>
                  <span className="text-xs">
                    <span className="text-emerald-600 font-bold">{emailSummary.sent} Sent</span> • <span className="text-red-500 font-bold">{emailSummary.failed} Failed</span>
                  </span>
                </div>
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="text-[11px] text-slate-500 uppercase bg-white border-b">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Email Address</th>
                      <th className="px-3 py-2">Delivery Status</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {emailSummary.results.map((res, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{res.recipientName}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{res.email}</td>
                        <td className="px-3 py-2">
                          {res.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-500">
                          {res.error ? (
                            <span className="text-red-600">{res.error}</span>
                          ) : res.previewUrl ? (
                            <a
                              href={res.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>View Test Email</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400">Attached Certificate PDF</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Data preview table */
              <div className="flex-1 overflow-auto border rounded-xl bg-slate-50 p-2 space-y-3">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="text-[11px] text-slate-500 uppercase bg-white border-b">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {bulkHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        {bulkHeaders.map((h) => (
                          <td key={h} className="px-3 py-2 truncate max-w-[150px]">
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {bulkRows.length > 5 && (
                  <p className="text-center text-[11px] text-slate-400 py-1">
                    Showing first 5 of {bulkRows.length} recipients. All {bulkRows.length} will be generated.
                  </p>
                )}

                {/* Template miniature preview */}
                <div className="pt-2 border-t">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                    Applied Template Preview
                  </span>
                  <div className="aspect-[1.6] max-h-72 w-full rounded-xl overflow-hidden border bg-white">
                    {pdfBlobUrl && (
                      <iframe
                        src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                        className="w-full h-full"
                        title="Certificate Preview"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Live PDF view */
            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden min-h-[480px] border flex items-center justify-center relative">
              {pdfBlobUrl ? (
                <iframe
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full rounded-xl bg-white"
                  title="Live Certificate Preview"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs">Preparing preview...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
