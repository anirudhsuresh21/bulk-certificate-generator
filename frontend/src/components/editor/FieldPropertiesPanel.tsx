'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  CertificateField,
  BackgroundPatch,
  FieldStyle,
  FieldType,
  TextAlignment,
} from '../../types';
import { api } from '../../lib/api';
import {
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Info,
  Shield,
  Layers,
  BookmarkCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface FieldPropertiesPanelProps {
  selectedField: CertificateField | null;
  selectedPatch: BackgroundPatch | null;
  onUpdateField: (id: string, updates: Partial<CertificateField>) => void;
  onUpdateFieldStyle: (id: string, styleUpdates: Partial<FieldStyle>) => void;
  onUpdatePatch: (id: string, updates: Partial<BackgroundPatch>) => void;
  onDeleteField: (id: string) => void;
  onDeletePatch: (id: string) => void;
}

const COLOR_PRESETS = [
  '#000000',
  '#1e293b',
  '#0f172a',
  '#1e3a8a',
  '#1e40af',
  '#065f46',
  '#991b1b',
  '#78350f',
  '#4c1d95',
  '#ffffff',
];

const PATCH_PRESETS = [
  '#ffffff',
  '#f8fafc',
  '#f1f5f9',
  '#fef3c7',
  '#fdf2e9',
  '#e2e8f0',
  '#000000',
];

export function FieldPropertiesPanel({
  selectedField,
  selectedPatch,
  onUpdateField,
  onUpdateFieldStyle,
  onUpdatePatch,
  onDeleteField,
  onDeletePatch,
}: FieldPropertiesPanelProps) {
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const [recordedPreset, setRecordedPreset] = useState<any>(null);
  const [justSavedPreset, setJustSavedPreset] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('certi_saved_name_coordinates');
      if (saved) {
        setRecordedPreset(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleRecordNameCoordinates = () => {
    if (!selectedField) return;
    const presetData = {
      x: selectedField.x,
      y: selectedField.y,
      width: selectedField.width,
      height: selectedField.height,
      fontSize: selectedField.style.fontSize,
      alignment: selectedField.style.alignment,
      fontFamily: selectedField.style.fontFamily,
      color: selectedField.style.color,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(
        'certi_saved_name_coordinates',
        JSON.stringify(presetData)
      );
      setRecordedPreset(presetData);
      setJustSavedPreset(true);
      setTimeout(() => setJustSavedPreset(false), 2500);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  const handleApplyRecordedCoordinates = () => {
    if (!selectedField || !recordedPreset) return;
    onUpdateField(selectedField.id, {
      x: recordedPreset.x,
      y: recordedPreset.y,
      width: recordedPreset.width,
      height: recordedPreset.height,
    });
    onUpdateFieldStyle(selectedField.id, {
      fontSize: recordedPreset.fontSize,
      alignment: recordedPreset.alignment,
      fontFamily: recordedPreset.fontFamily,
      color: recordedPreset.color,
    });
  };

  // If a background cover patch is selected
  if (selectedPatch) {
    return (
      <div className="w-80 border-l bg-white border-slate-200 p-5 space-y-6 overflow-y-auto z-20">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Shield className="w-4 h-4" />
            <h3 className="font-bold text-sm">Cover Patch Properties</h3>
          </div>
          <button
            onClick={() => onDeletePatch(selectedPatch.id)}
            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
            title="Delete Patch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Use this patch to obscure legacy names, dates, or authority signatures
          printed on your original certificate background.
        </p>

        {/* Patch Fill Color */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">
            Patch Fill Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedPatch.fillColor}
              onChange={(e) =>
                onUpdatePatch(selectedPatch.id, { fillColor: e.target.value })
              }
              className="w-10 h-10 rounded border p-0.5 cursor-pointer"
            />
            <input
              type="text"
              value={selectedPatch.fillColor}
              onChange={(e) =>
                onUpdatePatch(selectedPatch.id, { fillColor: e.target.value })
              }
              className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono uppercase"
            />
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            {PATCH_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() =>
                  onUpdatePatch(selectedPatch.id, { fillColor: color })
                }
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-md border shadow-xs transition ${
                  selectedPatch.fillColor.toLowerCase() === color.toLowerCase()
                    ? 'ring-2 ring-blue-500 scale-110'
                    : 'hover:scale-105'
                }`}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Width (pt)
            </label>
            <input
              type="number"
              value={selectedPatch.width}
              onChange={(e) =>
                onUpdatePatch(selectedPatch.id, {
                  width: Math.max(5, parseInt(e.target.value) || 10),
                })
              }
              className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Height (pt)
            </label>
            <input
              type="number"
              value={selectedPatch.height}
              onChange={(e) =>
                onUpdatePatch(selectedPatch.id, {
                  height: Math.max(5, parseInt(e.target.value) || 10),
                })
              }
              className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs"
            />
          </div>
        </div>
      </div>
    );
  }

  // If no field or patch is selected
  if (!selectedField) {
    return (
      <div className="w-80 border-l bg-white border-slate-200 p-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-3 z-20">
        <div className="p-3 bg-slate-100 rounded-full text-slate-500">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">No Field Selected</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
            Click on any field or patch on the certificate to edit its typography,
            position, and dynamic rules.
          </p>
        </div>
      </div>
    );
  }

  const isImageField =
    selectedField.type === 'signature_image' ||
    selectedField.type === 'logo_image';

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const file = e.target.files[0];
      const res = await api.uploadSignature(file);
      onUpdateField(selectedField.id, {
        assetKey: res.assetKey,
        assetUrl: res.assetUrl,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to upload signature image.');
    }
  };

  return (
    <div className="w-80 border-l bg-white border-slate-200 p-5 space-y-6 overflow-y-auto z-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900">
            {selectedField.label}
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            ID: {selectedField.id}
          </span>
        </div>
        <button
          onClick={() => onDeleteField(selectedField.id)}
          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
          title="Delete Field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Field Label & Key / Placeholder */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-700">
            Field Label
          </label>
          <input
            type="text"
            value={selectedField.label}
            onChange={(e) =>
              onUpdateField(selectedField.id, { label: e.target.value })
            }
            className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 border-slate-300"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Dynamic Placeholder Key</span>
            <span className="text-[10px] text-blue-600 font-mono">
              {`{{${selectedField.key}}}`}
            </span>
          </label>
          <input
            type="text"
            value={selectedField.key}
            onChange={(e) =>
              onUpdateField(selectedField.id, {
                key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
              })
            }
            className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs font-mono focus:ring-1 focus:ring-blue-500 border-slate-300"
          />
        </div>
      </div>

      {/* Dynamic Mode Toggle */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-800">Dynamic Value</p>
          <p className="text-[11px] text-slate-500">
            {selectedField.isDynamic
              ? 'Entered during certificate generation'
              : 'Fixed template text'}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onUpdateField(selectedField.id, {
              isDynamic: !selectedField.isDynamic,
            })
          }
          className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
            selectedField.isDynamic ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
              selectedField.isDynamic ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Dedicated Coordinate Recording & Bulk-Gen Preset */}
      {selectedField.type === 'recipient_name' && (
        <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Recorded Name Coordinates
            </span>
            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">
              X:{selectedField.x} Y:{selectedField.y}
            </span>
          </div>

          <p className="text-[11px] text-indigo-800/80 leading-relaxed">
            Record these coordinates once. When you duplicate this template or run bulk generation, these coordinates are automatically fetched and applied.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRecordNameCoordinates}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 ${
                justSavedPreset
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{justSavedPreset ? 'Coordinates Recorded!' : 'Record Coordinates'}</span>
            </button>

            {recordedPreset && (
              <button
                type="button"
                onClick={handleApplyRecordedCoordinates}
                className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs transition"
                title={`Snap to recorded position (X: ${recordedPreset.x}, Y: ${recordedPreset.y})`}
              >
                Apply Saved
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Upload for Signature / Logo */}
      {isImageField ? (
        <div className="space-y-3 pt-1 border-t">
          <label className="text-xs font-semibold text-slate-700">
            Signature / Asset Image
          </label>
          <input
            ref={sigFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleSignatureUpload}
          />
          {selectedField.assetKey ? (
            <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
              <div className="h-16 flex items-center justify-center p-2 bg-white rounded border">
                <img
                  src={api.getSignatureFileUrl(selectedField.assetKey)}
                  alt="Asset Preview"
                  className="max-h-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => sigFileInputRef.current?.click()}
                className="w-full text-xs font-medium text-blue-600 hover:text-blue-700 py-1"
              >
                Replace Image
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sigFileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 p-4 rounded-xl text-center flex flex-col items-center gap-1.5 transition text-slate-600 hover:text-blue-600"
            >
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-semibold">
                Upload PNG / JPG Asset
              </span>
              <span className="text-[10px] text-slate-400">
                Transparent PNG recommended
              </span>
            </button>
          )}
        </div>
      ) : (
        /* Typography Styling Controls */
        <div className="space-y-4 pt-1 border-t">
          {/* Font Family */}
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Font Family
            </label>
            <select
              value={selectedField.style.fontFamily}
              onChange={(e) =>
                onUpdateFieldStyle(selectedField.id, {
                  fontFamily: e.target.value as any,
                })
              }
              className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs bg-white border-slate-300 font-medium"
            >
              <optgroup label="Calligraphy & Script">
                <option value="GreatVibes">Great Vibes (Classic Calligraphy)</option>
                <option value="AlexBrush">Alex Brush (Cursive Script)</option>
                <option value="DancingScript">Dancing Script (Modern Script)</option>
                <option value="PinyonScript">Pinyon Script (Luxury Diploma)</option>
              </optgroup>
              <optgroup label="Serif">
                <option value="PlayfairDisplay">Playfair Display (Academic Serif)</option>
                <option value="Cinzel">Cinzel (Classical Roman)</option>
                <option value="TimesRoman">Times Roman (Formal Serif)</option>
              </optgroup>
              <optgroup label="Sans-Serif">
                <option value="Montserrat">Montserrat (Modern Geometric)</option>
                <option value="Helvetica">Helvetica / Arial (Universal Sans)</option>
              </optgroup>
              <optgroup label="Monospace">
                <option value="Courier">Courier (Monospace)</option>
              </optgroup>
            </select>
          </div>

          {/* Font Size & Formats */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Font Size
              </label>
              <span className="text-xs font-mono text-slate-500">
                {selectedField.style.fontSize} pt
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="96"
              value={selectedField.style.fontSize}
              onChange={(e) =>
                onUpdateFieldStyle(selectedField.id, {
                  fontSize: parseInt(e.target.value) || 24,
                })
              }
              className="w-full accent-blue-600"
            />
          </div>

          {/* Bold, Italic & Alignment Toolbar */}
          <div className="flex items-center justify-between gap-2">
            {/* Bold & Italic */}
            <div className="flex items-center border rounded-lg p-0.5 bg-slate-50 border-slate-200">
              <button
                type="button"
                onClick={() =>
                  onUpdateFieldStyle(selectedField.id, {
                    isBold: !selectedField.style.isBold,
                  })
                }
                className={`p-1.5 rounded-md transition ${
                  selectedField.style.isBold
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateFieldStyle(selectedField.id, {
                    isItalic: !selectedField.style.isItalic,
                  })
                }
                className={`p-1.5 rounded-md transition ${
                  selectedField.style.isItalic
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center border rounded-lg p-0.5 bg-slate-50 border-slate-200">
              {(['left', 'center', 'right'] as TextAlignment[]).map((align) => {
                const Icon =
                  align === 'left'
                    ? AlignLeft
                    : align === 'center'
                    ? AlignCenter
                    : AlignRight;
                const isActive = selectedField.style.alignment === align;
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() =>
                      onUpdateFieldStyle(selectedField.id, { alignment: align })
                    }
                    className={`p-1.5 rounded-md transition ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title={`Align ${align}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              Text Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedField.style.color || '#000000'}
                onChange={(e) =>
                  onUpdateFieldStyle(selectedField.id, { color: e.target.value })
                }
                className="w-9 h-9 rounded border p-0.5 cursor-pointer"
              />
              <input
                type="text"
                value={selectedField.style.color || '#000000'}
                onChange={(e) =>
                  onUpdateFieldStyle(selectedField.id, { color: e.target.value })
                }
                className="flex-1 px-3 py-1.5 border rounded-lg text-xs font-mono uppercase border-slate-300"
              />
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    onUpdateFieldStyle(selectedField.id, { color })
                  }
                  style={{ backgroundColor: color }}
                  className={`w-5 h-5 rounded-md border shadow-xs transition ${
                    selectedField.style.color.toLowerCase() ===
                    color.toLowerCase()
                      ? 'ring-2 ring-blue-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Auto-shrink Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-semibold text-slate-700">Auto-Shrink Font</p>
              <p className="text-[10px] text-slate-400">
                Prevents text clipping for long names
              </p>
            </div>
            <input
              type="checkbox"
              checked={selectedField.style.autoShrink !== false}
              onChange={(e) =>
                onUpdateFieldStyle(selectedField.id, {
                  autoShrink: e.target.checked,
                })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </div>

          {/* Sample / Default Value */}
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Sample Preview Value
            </label>
            <input
              type="text"
              value={selectedField.sampleValue || ''}
              onChange={(e) =>
                onUpdateField(selectedField.id, {
                  sampleValue: e.target.value,
                })
              }
              placeholder="e.g. Dr. Emily Watson"
              className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300"
            />
          </div>
        </div>
      )}

      {/* Box Dimensions */}
      <div className="pt-2 border-t space-y-2">
        <label className="text-xs font-semibold text-slate-700">
          Box Dimensions
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-slate-500">Width</span>
            <input
              type="number"
              value={selectedField.width}
              onChange={(e) =>
                onUpdateField(selectedField.id, {
                  width: Math.max(20, parseInt(e.target.value) || 20),
                })
              }
              className="w-full mt-0.5 px-3 py-1.5 border rounded-lg text-xs border-slate-300"
            />
          </div>
          <div>
            <span className="text-[11px] text-slate-500">Height</span>
            <input
              type="number"
              value={selectedField.height}
              onChange={(e) =>
                onUpdateField(selectedField.id, {
                  height: Math.max(10, parseInt(e.target.value) || 10),
                })
              }
              className="w-full mt-0.5 px-3 py-1.5 border rounded-lg text-xs border-slate-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
