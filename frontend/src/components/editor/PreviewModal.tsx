'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Download, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { ITemplate } from '../../types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ITemplate;
}

export function PreviewModal({
  isOpen,
  onClose,
  template,
}: PreviewModalProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      return;
    }

    let active = true;
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        // Collect sample values
        const sampleValues: Record<string, string> = {};
        template.fields.forEach((f) => {
          sampleValues[f.key] =
            f.sampleValue || f.defaultValue || `Sample ${f.label}`;
        });

        const blob = await api.previewCertificate(template.id, sampleValues);
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Failed to render PDF preview.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPreview();

    return () => {
      active = false;
    };
  }, [isOpen, template]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Live PDF Preview
            </h3>
            <p className="text-xs text-slate-500">
              High-accuracy preview rendered directly via the PDF-Lib engine
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 relative">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm font-semibold">Generating PDF preview...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl max-w-md text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Preview Error</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && pdfBlobUrl && (
            <iframe
              src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full rounded-lg shadow-sm border bg-white"
              title="Certificate PDF Preview"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Preview is populated using your configured sample values.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
