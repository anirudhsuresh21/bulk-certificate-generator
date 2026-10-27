'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  PlusCircle,
  Copy,
  Trash2,
  FileEdit,
  Download,
  Calendar,
  Layers,
  Sparkles,
  Search,
  MoreVertical,
  ExternalLink,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { UploadModal } from '../components/UploadModal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { api } from '../lib/api';
import { ITemplate } from '../types';
import { formatDate } from '../lib/utils';

export default function DashboardPage() {
  const [templates, setTemplates] = useState<ITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Confirmation dialogs
  const [deleteTarget, setDeleteTarget] = useState<ITemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<ITemplate | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.getTemplates();
      setTemplates(res.templates || []);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteTemplate(deleteTarget.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      showToast('Template deleted successfully.');
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete template.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (tmpl: ITemplate) => {
    try {
      const res = await api.duplicateTemplate(tmpl.id);
      setTemplates((prev) => [res.template, ...prev]);
      showToast(`Duplicated "${tmpl.name}" successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate template.');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    try {
      const res = await api.updateTemplate(renameTarget.id, {
        name: renameValue.trim(),
      });
      setTemplates((prev) =>
        prev.map((t) => (t.id === renameTarget.id ? res.template : t))
      );
      showToast('Template renamed successfully.');
      setRenameTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to rename template.');
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onCreateClick={() => setIsUploadOpen(true)} />

      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero / Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border shadow-xs">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Certificate Studio
            </h1>
            <p className="text-sm sm:text-base text-slate-500 max-w-2xl">
              Upload existing certificates, visually configure dynamic overlays,
              cover legacy text with precision patches, and generate downloadable PDFs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Certificate Template</span>
            </button>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Saved Templates
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {templates.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Precision Overlays
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {templates.reduce((acc, t) => acc + (t.fields?.length || 0), 0)}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Latest Edit
              </p>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                {templates[0] ? formatDate(templates[0].updatedAt) : 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <p className="text-xs font-medium text-slate-500 self-start sm:self-center">
            Showing {filteredTemplates.length} of {templates.length} templates
          </p>
        </div>

        {/* Templates Grid / Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border p-5 space-y-4 animate-pulse"
              >
                <div className="aspect-[1.4] bg-slate-100 rounded-xl" />
                <div className="h-5 bg-slate-100 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white border rounded-2xl p-12 text-center space-y-4 shadow-xs">
            <div className="inline-flex p-4 rounded-full bg-blue-50 text-blue-600">
              <Award className="w-10 h-10" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900">
                {searchQuery
                  ? 'No matching templates found'
                  : 'No certificate templates yet'}
              </h3>
              <p className="text-sm text-slate-500">
                {searchQuery
                  ? `No template names match "${searchQuery}". Clear your search query or create a new template.`
                  : 'Get started by uploading your existing certificate PDF or image. Add names, dates, designations, patches, and signatures.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload First Certificate</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Visual Thumbnail Frame */}
                <div className="relative aspect-[1.4] bg-slate-100 border-b overflow-hidden flex items-center justify-center p-3 group-hover:bg-slate-50 transition">
                  {template.fileType === 'pdf' ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                      <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                        <Award className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        PDF Certificate Template
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Page {template.selectedPage} of {template.totalPages}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={api.getTemplateFileUrl(template.fileKey)}
                      alt={template.name}
                      className="max-h-full max-w-full object-contain rounded shadow-xs"
                    />
                  )}

                  {/* Orientation badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 uppercase tracking-wide border shadow-xs">
                    {template.pageDimensions.orientation}
                  </div>

                  {/* Quick Edit Overlay Button */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <Link
                      href={`/editor/${template.id}`}
                      className="bg-white text-slate-900 hover:bg-blue-50 text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition flex items-center gap-1.5"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-blue-600" />
                      Edit Design
                    </Link>
                    <Link
                      href={`/generate/${template.id}`}
                      className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Generate
                    </Link>
                  </div>
                </div>

                {/* Card Information */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-blue-600 transition"
                        title={template.name}
                      >
                        {template.name}
                      </h3>

                      {/* Dropdown / Quick Menu */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setRenameTarget(template);
                            setRenameValue(template.name);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 text-xs font-medium"
                          title="Rename Template"
                        >
                          Rename
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{template.fields?.length || 0} fields</span>
                      <span>&bull;</span>
                      <span>
                        {template.pageDimensions.width} &times;{' '}
                        {template.pageDimensions.height} pt
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(template.updatedAt)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Duplicate Template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(template)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          fetchTemplates();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete Certificate Template"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated layout configurations will be removed permanently.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Template'}
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleRenameSubmit}
            className="bg-white rounded-xl shadow-xl border max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              Rename Template
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3.5 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-slate-300"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Save Name
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
