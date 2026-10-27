'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Eye,
  Download,
  Plus,
  Shield,
  Layers,
  ChevronDown,
  Loader2,
  Check,
  Type,
  FileBadge,
  Calendar,
  Building,
  UserCheck,
  Award,
  Hash,
  PenTool,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { FieldType } from '../../types';

interface EditorToolbarProps {
  templateName: string;
  onNameChange: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onPreview: () => void;
  onAddField: (type: FieldType) => void;
  onAddPatch: () => void;
  onAutoDetectName: () => void;
  isDetectingName?: boolean;
  onToggleLayers: () => void;
  layersOpen: boolean;
  templateId: string;
}

const FIELD_OPTIONS: {
  type: FieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: 'recipient_name', label: 'Recipient Name', icon: Award },
  { type: 'certificate_title', label: 'Certificate Title', icon: Type },
  { type: 'event_name', label: 'Event / Workshop', icon: FileBadge },
  { type: 'issue_date', label: 'Issue Date', icon: Calendar },
  { type: 'completion_date', label: 'Completion Date', icon: Calendar },
  { type: 'expiry_date', label: 'Expiry Date', icon: Calendar },
  { type: 'roll_number', label: 'Roll / ID Number', icon: Hash },
  { type: 'organization_name', label: 'Organization Name', icon: Building },
  { type: 'authority_name', label: 'Authority Name', icon: UserCheck },
  { type: 'authority_designation', label: 'Authority Designation', icon: Shield },
  { type: 'custom_text', label: 'Custom Text', icon: Type },
  { type: 'signature_image', label: 'Signature Image', icon: PenTool },
  { type: 'logo_image', label: 'Seal / Logo Image', icon: ImageIcon },
];

export function EditorToolbar({
  templateName,
  onNameChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  onResetZoom,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onPreview,
  onAddField,
  onAddPatch,
  onAutoDetectName,
  isDetectingName,
  onToggleLayers,
  layersOpen,
  templateId,
}: EditorToolbarProps) {
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);

  return (
    <div className="h-16 border-b bg-white dark:bg-slate-900 border-slate-200 px-4 flex items-center justify-between gap-3 select-none z-30">
      {/* Left: Back button & Template Name */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            className="font-bold text-base text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md px-2 py-1 transition focus:outline-none focus:bg-white"
            title="Click to rename template"
          />
          {hasUnsavedChanges && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"
              title="Unsaved changes"
            />
          )}
        </div>
      </div>

      {/* Middle: Undo/Redo, Zoom, Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={() => onZoomChange(Math.max(0.4, zoom - 0.1))}
            className="p-1.5 rounded-md text-slate-700 hover:bg-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2 min-w-[3.5rem] text-center text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
            className="p-1.5 rounded-md text-slate-700 hover:bg-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1.5 rounded-md text-slate-700 hover:bg-white transition"
            title="Reset Zoom to 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Add Field Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFieldMenuOpen(!fieldMenuOpen)}
            className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-blue-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Field</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {fieldMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 max-h-96 overflow-y-auto animate-fade-in">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Field Type
              </div>
              {FIELD_OPTIONS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      onAddField(item.type);
                      setFieldMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition"
                  >
                    <IconComponent className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Background Cover Patch Tool */}
        <button
          onClick={onAddPatch}
          className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-amber-200 transition"
          title="Place a solid background patch to cover legacy text/dates on the certificate"
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Cover Patch</span>
        </button>

        {/* Smart Auto-Detect Name Section */}
        <button
          onClick={onAutoDetectName}
          disabled={isDetectingName}
          className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-indigo-200 transition disabled:opacity-50"
          title="Automatically detect the recipient name area on the certificate and snap the placeholder & cover patch there"
        >
          {isDetectingName ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-600" />
          )}
          <span className="hidden md:inline">Auto-Detect Name</span>
        </button>

        {/* Toggle Layers Sidebar */}
        <button
          onClick={onToggleLayers}
          className={`p-2 rounded-lg border transition ${
            layersOpen
              ? 'bg-slate-200 text-slate-900 border-slate-300'
              : 'text-slate-600 hover:bg-slate-100 border-slate-200'
          }`}
          title="Toggle Layers Panel"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Preview, Save, Generate */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-200 transition"
          title="Preview Certificate PDF"
        >
          <Eye className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Live Preview</span>
        </button>

        <button
          onClick={onSave}
          disabled={isSaving}
          className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-lg border shadow-xs transition active:scale-95 ${
            hasUnsavedChanges
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasUnsavedChanges ? (
            <Save className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
        </button>

        <Link
          href={`/generate/${templateId}`}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg shadow-sm transition active:scale-95"
          title="Generate Certificate"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Generate</span>
        </Link>
      </div>
    </div>
  );
}
