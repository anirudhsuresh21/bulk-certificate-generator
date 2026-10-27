'use client';

import React from 'react';
import { CertificateField, BackgroundPatch } from '../../types';
import {
  Layers,
  Shield,
  Type,
  Award,
  Calendar,
  PenTool,
  Hash,
  Trash2,
  X,
} from 'lucide-react';

interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fields: CertificateField[];
  patches: BackgroundPatch[];
  selectedFieldId: string | null;
  selectedPatchId: string | null;
  onSelectField: (id: string) => void;
  onSelectPatch: (id: string) => void;
  onDeleteField: (id: string) => void;
  onDeletePatch: (id: string) => void;
}

export function LayersPanel({
  isOpen,
  onClose,
  fields,
  patches,
  selectedFieldId,
  selectedPatchId,
  onSelectField,
  onSelectPatch,
  onDeleteField,
  onDeletePatch,
}: LayersPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="w-64 border-r bg-white border-slate-200 flex flex-col h-full z-20">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-900">Layers</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Fields list */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Fields ({fields.length})
          </span>
          {fields.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-2 py-1">
              No fields added
            </p>
          ) : (
            fields.map((field) => {
              const isSelected = selectedFieldId === field.id;
              return (
                <div
                  key={field.id}
                  onClick={() => onSelectField(field.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer group ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Type className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                    <span className="truncate">{field.label}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteField(field.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Patches list */}
        <div className="space-y-1 border-t pt-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Cover Patches ({patches.length})
          </span>
          {patches.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-2 py-1">
              No cover patches
            </p>
          ) : (
            patches.map((patch, idx) => {
              const isSelected = selectedPatchId === patch.id;
              return (
                <div
                  key={patch.id}
                  onClick={() => onSelectPatch(patch.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer group ${
                    isSelected
                      ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="truncate">Patch #{idx + 1}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePatch(patch.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
