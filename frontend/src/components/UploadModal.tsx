'use client';

import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { UploadResponse } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Uploaded state
  const [uploadedInfo, setUploadedInfo] = useState<UploadResponse | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [savedNameCoords, setSavedNameCoords] = useState<any>(null);
  const [useRecordedCoords, setUseRecordedCoords] = useState(true);

  // Check for saved coordinates in localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('certi_saved_name_coordinates');
      if (stored) {
        setSavedNameCoords(JSON.parse(stored));
      }
    } catch {}
  }, []);

  if (!isOpen) return null;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = async (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(ext)) {
      setErrorMessage(
        'Unsupported file format. Please upload a PDF, PNG, JPG, or JPEG file.'
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25 MB limit.');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(true);

    try {
      const result = await api.uploadCertificate(file);
      setUploadedInfo(result);
      const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTemplateName(
        defaultName.charAt(0).toUpperCase() + defaultName.slice(1)
      );
      setSelectedPage(1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload certificate.');
      setSelectedFile(null);
    } finally {
      setUploadProgress(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!uploadedInfo) return;
    if (!templateName.trim()) {
      setErrorMessage('Please enter a template name.');
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const detection = uploadedInfo.detectedNameSection;
      const initialPatches = [];

      // Determine recipient name placement: recorded coordinates priority vs auto-detected vs default
      let nameX = Math.round(uploadedInfo.dimensions.width * 0.25);
      let nameY = Math.round(uploadedInfo.dimensions.height * 0.42);
      let nameWidth = Math.round(uploadedInfo.dimensions.width * 0.5);
      let nameHeight = 48;
      let nameFontSize = 32;
      let nameAlignment: 'left' | 'center' | 'right' = 'center';

      if (useRecordedCoords && savedNameCoords) {
        nameX = savedNameCoords.x;
        nameY = savedNameCoords.y;
        nameWidth = savedNameCoords.width;
        nameHeight = savedNameCoords.height;
        nameFontSize = savedNameCoords.fontSize;
        nameAlignment = savedNameCoords.alignment || 'center';
      } else if (detection && detection.found) {
        nameX = detection.x;
        nameY = detection.y;
        nameWidth = detection.width;
        nameHeight = detection.height;
        nameFontSize = detection.fontSize;
        nameAlignment = detection.alignment;
      }

      // If detection found a legacy name to cover, automatically add a background cover patch
      if (detection && detection.found && detection.suggestedPatch) {
        initialPatches.push({
          id: `patch_auto_name`,
          x: detection.suggestedPatch.x,
          y: detection.suggestedPatch.y,
          width: detection.suggestedPatch.width,
          height: detection.suggestedPatch.height,
          fillColor: detection.suggestedPatch.fillColor || '#FFFFFF',
          opacity: 1.0,
        });
      }

      // Initial fields with accurately placed recipient name placeholder
      const initialFields = [
        {
          id: 'field_recipient_name',
          type: 'recipient_name' as const,
          label: 'Recipient Name',
          key: 'recipient_name',
          isDynamic: true,
          defaultValue: '',
          sampleValue: detection?.detectedText || 'Johnathan Doe',
          x: nameX,
          y: nameY,
          width: nameWidth,
          height: nameHeight,
          style: {
            fontFamily: 'Helvetica' as const,
            fontSize: nameFontSize,
            isBold: true,
            isItalic: false,
            color: '#1e293b',
            alignment: nameAlignment,
            autoShrink: true,
            minFontSize: 16,
          },
        },
        {
          id: 'field_issue_date',
          type: 'issue_date' as const,
          label: 'Issue Date',
          key: 'issue_date',
          isDynamic: true,
          defaultValue: new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          sampleValue: 'October 27, 2026',
          x: Math.round(uploadedInfo.dimensions.width * 0.15),
          y: Math.round(uploadedInfo.dimensions.height * 0.78),
          width: 200,
          height: 32,
          style: {
            fontFamily: 'Helvetica' as const,
            fontSize: 16,
            isBold: false,
            isItalic: false,
            color: '#475569',
            alignment: 'left' as const,
            autoShrink: true,
          },
        },
      ];

      const res = await api.createTemplate({
        name: templateName.trim(),
        fileKey: uploadedInfo.fileKey,
        originalFileName: uploadedInfo.originalFileName,
        fileType: uploadedInfo.fileType,
        pageDimensions: uploadedInfo.dimensions,
        selectedPage,
        totalPages: uploadedInfo.totalPages,
        fields: initialFields,
        patches: initialPatches,
      });

      onClose();
      router.push(`/editor/${res.template.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize certificate template.');
      setIsCreating(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadedInfo(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Upload Certificate Design
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Import an existing PDF or image certificate to customize.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        {!uploadedInfo ? (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={handleFileInput}
              />

              <div className="p-4 bg-blue-100/70 text-blue-600 rounded-full shadow-sm">
                {uploadProgress ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>

              <div>
                <p className="text-base font-semibold text-slate-800">
                  {uploadProgress
                    ? 'Analyzing certificate file...'
                    : 'Click to upload or drag & drop'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PDF, PNG, JPG, or JPEG (up to 25 MB)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mt-2 bg-white px-4 py-2 rounded-lg border shadow-xs">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  PDF Documents
                </span>
                <span className="h-3 w-px bg-slate-200" />
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  PNG & JPG Images
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Document metadata summary badge */}
            <div className="p-4 bg-slate-50 border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-xs">
                    {uploadedInfo.originalFileName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {uploadedInfo.fileType.toUpperCase()} &bull;{' '}
                    {uploadedInfo.dimensions.width} &times;{' '}
                    {uploadedInfo.dimensions.height} pt &bull;{' '}
                    <span className="capitalize">
                      {uploadedInfo.dimensions.orientation}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="text-xs font-medium text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-200 transition"
              >
                Change File
              </button>
            </div>

            {/* Smart Name Detection Banner */}
            {uploadedInfo.detectedNameSection?.found ? (
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold">Name Section Auto-Detected: </span>
                  <span className="bg-white/90 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                    "{uploadedInfo.detectedNameSection.detectedText}"
                  </span>
                  <p className="text-blue-700 text-[11px] mt-1">
                    The recipient name placeholder &amp; cover patch will be automatically placed right at this position.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-2.5 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>
                  Standard recipient name placeholder will be positioned at the certificate center band.
                </span>
              </div>
            )}

            {/* Recorded Coordinates Auto-Apply Option */}
            {savedNameCoords && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-900">
                    Use My Recorded Name Position
                  </p>
                  <p className="text-[11px] text-indigo-700">
                    X: {savedNameCoords.x} pt, Y: {savedNameCoords.y} pt, W: {savedNameCoords.width} pt
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={useRecordedCoords}
                  onChange={(e) => setUseRecordedCoords(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            )}

            {/* Template Name Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Annual Workshop Certificate"
                className="w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-slate-300"
              />
            </div>

            {/* Multi-page PDF page selector */}
            {uploadedInfo.fileType === 'pdf' && uploadedInfo.totalPages > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                  <span>Target Page to Edit</span>
                  <span className="text-xs text-slate-500">
                    Total {uploadedInfo.totalPages} pages detected
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from(
                    { length: uploadedInfo.totalPages },
                    (_, i) => i + 1
                  ).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setSelectedPage(pageNum)}
                      className={`p-3 rounded-xl border text-sm font-semibold transition ${
                        selectedPage === pageNum
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Page {pageNum}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Other pages will be safely preserved when exporting the multi-page PDF.
                </p>
              </div>
            )}

            {/* Confirm & Launch Editor Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Launching Editor...</span>
                  </>
                ) : (
                  <>
                    <span>Open in Visual Editor</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
