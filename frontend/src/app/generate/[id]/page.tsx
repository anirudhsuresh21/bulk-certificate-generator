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
} from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { ITemplate } from '../../../types';

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

  // Bulk Excel / CSV state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([]);
  const [bulkRows, setBulkRows] = useState<Array<Record<string, string>>>([]);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [bulkMode, setBulkMode] = useState<'combined_pdf' | 'zip_archive'>('combined_pdf');
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkBaseName, setBulkBaseName] = useState('');

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

    const headers = dynamicKeys.length > 0 ? dynamicKeys : ['recipient_name', 'issue_date', 'event_name'];
    const row1 = headers.map((k) => (k === 'recipient_name' ? 'Aarav Sharma' : k.includes('date') ? '2026-10-27' : 'Full Stack Workshop')).join(',');
    const row2 = headers.map((k) => (k === 'recipient_name' ? 'Jane Doe' : k.includes('date') ? '2026-10-27' : 'Full Stack Workshop')).join(',');
    const csvContent = `${headers.join(',')}\n${row1}\n${row2}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Sample_${template.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Recipients.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRunBulkGeneration = async () => {
    if (!template || bulkRows.length === 0) return;
    setBulkGenerating(true);

    try {
      const res = await api.bulkGenerate(template.id, {
        rows: bulkRows,
        columnMapping,
        mode: bulkMode,
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

                  {/* Output Mode Selection */}
                  <div className="pt-3 border-t space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      Export Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkMode('combined_pdf')}
                        className={`p-3 rounded-xl border text-left transition ${
                          bulkMode === 'combined_pdf'
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>Combined PDF</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Single printable master PDF with all certificates
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBulkMode('zip_archive')}
                        className={`p-3 rounded-xl border text-left transition ${
                          bulkMode === 'zip_archive'
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Archive className="w-4 h-4 text-purple-600" />
                          <span>ZIP of PDFs</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Individual PDF files for each recipient in a ZIP
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Bulk Filename */}
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

                  {/* Run Bulk Generation Button */}
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
                            Generate All {bulkRows.length} Certificates ({bulkMode === 'combined_pdf' ? 'Combined PDF' : 'ZIP'})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
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
                <>
                  <Table className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Recipient Data Preview ({bulkRows.length} Total)
                  </h3>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Live Certificate Template Preview
                  </h3>
                </>
              )}
            </div>

            {previewLoading && (
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating preview...
              </span>
            )}
          </div>

          {activeTab === 'bulk' && bulkRows.length > 0 ? (
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
