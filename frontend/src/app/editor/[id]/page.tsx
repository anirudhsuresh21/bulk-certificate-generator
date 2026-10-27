'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ITemplate,
  CertificateField,
  BackgroundPatch,
  FieldType,
  FieldStyle,
} from '../../../types';
import { api } from '../../../lib/api';
import { EditorToolbar } from '../../../components/editor/EditorToolbar';
import { CertificateCanvas } from '../../../components/editor/CertificateCanvas';
import { FieldPropertiesPanel } from '../../../components/editor/FieldPropertiesPanel';
import { LayersPanel } from '../../../components/editor/LayersPanel';
import { PreviewModal } from '../../../components/editor/PreviewModal';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HistoryState {
  fields: CertificateField[];
  patches: BackgroundPatch[];
}

export default function CertificateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<ITemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Template editable state
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState<CertificateField[]>([]);
  const [patches, setPatches] = useState<BackgroundPatch[]>([]);

  // Selection
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);

  // Undo / Redo stacks
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryAction = useRef(false);

  // View state
  const [zoom, setZoom] = useState(1.0);
  const [layersOpen, setLayersOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingName, setIsDetectingName] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Push state to undo stack
  const pushHistory = useCallback(
    (newFields: CertificateField[], newPatches: BackgroundPatch[]) => {
      if (isHistoryAction.current) {
        isHistoryAction.current = false;
        return;
      }

      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [
          ...sliced,
          {
            fields: JSON.parse(JSON.stringify(newFields)),
            patches: JSON.parse(JSON.stringify(newPatches)),
          },
        ];
      });
      setHistoryIndex((prev) => prev + 1);
      setHasUnsavedChanges(true);
    },
    [historyIndex]
  );

  // Fetch initial template
  useEffect(() => {
    if (!templateId) return;

    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const res = await api.getTemplate(templateId);
        const t = res.template;
        setTemplate(t);
        setTemplateName(t.name);
        setFields(t.fields || []);
        setPatches(t.patches || []);

        // Initial history entry
        setHistory([
          {
            fields: JSON.parse(JSON.stringify(t.fields || [])),
            patches: JSON.parse(JSON.stringify(t.patches || [])),
          },
        ]);
        setHistoryIndex(0);

        // Auto-select first field if available
        if (t.fields && t.fields.length > 0) {
          setSelectedFieldId(t.fields[0].id);
        }

        // Adjust initial zoom to fit comfortably on screen
        if (t.pageDimensions) {
          const availableWidth = window.innerWidth - 450;
          const scale = Math.min(1.0, availableWidth / t.pageDimensions.width);
          setZoom(Math.max(0.6, Math.round(scale * 10) / 10));
        }
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load certificate template.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  // Undo / Redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryAction.current = true;
      const targetState = history[historyIndex - 1];
      setFields(JSON.parse(JSON.stringify(targetState.fields)));
      setPatches(JSON.parse(JSON.stringify(targetState.patches)));
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryAction.current = true;
      const targetState = history[historyIndex + 1];
      setFields(JSON.parse(JSON.stringify(targetState.fields)));
      setPatches(JSON.parse(JSON.stringify(targetState.patches)));
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
    }
  };

  // Keyboard shortcut listener (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  });

  // Warn on beforeunload if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save template layout to backend
  const handleSave = async () => {
    if (!template) return;
    setIsSaving(true);
    try {
      await api.updateTemplate(template.id, {
        name: templateName,
        fields,
        patches,
      });
      setHasUnsavedChanges(false);
      showToast('Template layout saved successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Field handler
  const handleAddField = (type: FieldType) => {
    if (!template) return;

    const uniqueId = `field_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const count = fields.filter((f) => f.type === type).length + 1;
    let label = type
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
    if (count > 1) {
      label = `${label} ${count}`;
    }

    const key = `${type}_${count}`.replace(/_1$/, '');
    const isImage = type === 'signature_image' || type === 'logo_image';

    const newField: CertificateField = {
      id: uniqueId,
      type,
      label,
      key,
      isDynamic: !isImage,
      defaultValue: '',
      sampleValue: `Sample ${label}`,
      x: Math.round(template.pageDimensions.width * 0.3),
      y: Math.round(template.pageDimensions.height * 0.4),
      width: isImage ? 160 : 320,
      height: isImage ? 70 : 40,
      style: {
        fontFamily: 'Helvetica',
        fontSize: type === 'recipient_name' ? 32 : 18,
        isBold: type === 'recipient_name' || type === 'certificate_title',
        isItalic: false,
        color: '#0f172a',
        alignment: 'center',
        autoShrink: true,
        minFontSize: 12,
      },
    };

    const updated = [...fields, newField];
    setFields(updated);
    setSelectedPatchId(null);
    setSelectedFieldId(uniqueId);
    pushHistory(updated, patches);
  };

  // Smart Auto-Detect Name Section handler
  const handleAutoDetectName = async () => {
    if (!template) return;
    setIsDetectingName(true);
    try {
      const res = await api.detectNameSection(template.id);
      const detection = res.detection;

      let updatedFields = [...fields];
      let updatedPatches = [...patches];

      // Add cover patch over legacy text if suggested
      if (detection.suggestedPatch) {
        const patchId = `patch_auto_${Date.now().toString(36)}`;
        updatedPatches = [
          ...updatedPatches,
          {
            id: patchId,
            x: detection.suggestedPatch.x,
            y: detection.suggestedPatch.y,
            width: detection.suggestedPatch.width,
            height: detection.suggestedPatch.height,
            fillColor: detection.suggestedPatch.fillColor || '#FFFFFF',
            opacity: 1.0,
          },
        ];
      }

      // Check if recipient_name field already exists
      const existingNameIndex = updatedFields.findIndex(
        (f) => f.type === 'recipient_name'
      );

      let targetFieldId = '';

      if (existingNameIndex >= 0) {
        targetFieldId = updatedFields[existingNameIndex].id;
        updatedFields[existingNameIndex] = {
          ...updatedFields[existingNameIndex],
          x: detection.x,
          y: detection.y,
          width: detection.width,
          height: detection.height,
          sampleValue: detection.detectedText || updatedFields[existingNameIndex].sampleValue,
          style: {
            ...updatedFields[existingNameIndex].style,
            fontSize: detection.fontSize || 32,
            alignment: detection.alignment || 'center',
          },
        };
      } else {
        targetFieldId = `field_recipient_name_${Date.now().toString(36)}`;
        updatedFields.push({
          id: targetFieldId,
          type: 'recipient_name',
          label: 'Recipient Name',
          key: 'recipient_name',
          isDynamic: true,
          defaultValue: '',
          sampleValue: detection.detectedText || 'Sample Recipient Name',
          x: detection.x,
          y: detection.y,
          width: detection.width,
          height: detection.height,
          style: {
            fontFamily: 'Helvetica',
            fontSize: detection.fontSize || 32,
            isBold: true,
            isItalic: false,
            color: '#0f172a',
            alignment: detection.alignment || 'center',
            autoShrink: true,
            minFontSize: 14,
          },
        });
      }

      setFields(updatedFields);
      setPatches(updatedPatches);
      setSelectedPatchId(null);
      setSelectedFieldId(targetFieldId);
      pushHistory(updatedFields, updatedPatches);

      if (detection.found) {
        showToast(
          `✨ Detected name "${detection.detectedText || 'area'}" & placed placeholder!`
        );
      } else {
        showToast(
          'Placed recipient name placeholder in central certificate band.'
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to detect name section.');
    } finally {
      setIsDetectingName(false);
    }
  };

  // Add Background Patch handler (Cover old text)
  const handleAddPatch = () => {
    if (!template) return;

    const uniqueId = `patch_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const newPatch: BackgroundPatch = {
      id: uniqueId,
      x: Math.round(template.pageDimensions.width * 0.3),
      y: Math.round(template.pageDimensions.height * 0.35),
      width: 300,
      height: 35,
      fillColor: '#FFFFFF',
      opacity: 1.0,
    };

    const updated = [...patches, newPatch];
    setPatches(updated);
    setSelectedFieldId(null);
    setSelectedPatchId(uniqueId);
    pushHistory(fields, updated);
  };

  // Update field
  const handleUpdateField = (id: string, updates: Partial<CertificateField>) => {
    setFields((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      pushHistory(next, patches);
      return next;
    });
  };

  // Update field styling
  const handleUpdateFieldStyle = (
    id: string,
    styleUpdates: Partial<FieldStyle>
  ) => {
    setFields((prev) => {
      const next = prev.map((f) =>
        f.id === id ? { ...f, style: { ...f.style, ...styleUpdates } } : f
      );
      pushHistory(next, patches);
      return next;
    });
  };

  // Update patch
  const handleUpdatePatch = (id: string, updates: Partial<BackgroundPatch>) => {
    setPatches((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      pushHistory(fields, next);
      return next;
    });
  };

  // Delete selected item (Field or Patch)
  const handleDeleteSelected = () => {
    if (selectedFieldId) {
      handleDeleteField(selectedFieldId);
    } else if (selectedPatchId) {
      handleDeletePatch(selectedPatchId);
    }
  };

  const handleDeleteField = (id: string) => {
    const updated = fields.filter((f) => f.id !== id);
    setFields(updated);
    if (selectedFieldId === id) setSelectedFieldId(null);
    pushHistory(updated, patches);
  };

  const handleDeletePatch = (id: string) => {
    const updated = patches.filter((p) => p.id !== id);
    setPatches(updated);
    if (selectedPatchId === id) setSelectedPatchId(null);
    pushHistory(fields, updated);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-700">
          Loading certificate editor canvas...
        </p>
      </div>
    );
  }

  if (loadError || !template) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center space-y-4">
        <div className="p-3 bg-red-100 text-red-600 rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Failed to load template
        </h2>
        <p className="text-sm text-slate-500 max-w-md">
          {loadError || 'Template could not be found or has been removed.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;
  const selectedPatch = patches.find((p) => p.id === selectedPatchId) || null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Toolbar */}
      <EditorToolbar
        templateName={templateName}
        onNameChange={(name) => {
          setTemplateName(name);
          setHasUnsavedChanges(true);
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(1.0)}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSave}
        onPreview={() => setPreviewOpen(true)}
        onAddField={handleAddField}
        onAddPatch={handleAddPatch}
        onAutoDetectName={handleAutoDetectName}
        isDetectingName={isDetectingName}
        onToggleLayers={() => setLayersOpen(!layersOpen)}
        layersOpen={layersOpen}
        templateId={template.id}
      />

      {/* Main Workspace: Layers Panel + Canvas + Properties Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Optional Collapsible Layers Panel */}
        <LayersPanel
          isOpen={layersOpen}
          onClose={() => setLayersOpen(false)}
          fields={fields}
          patches={patches}
          selectedFieldId={selectedFieldId}
          selectedPatchId={selectedPatchId}
          onSelectField={(id) => {
            setSelectedPatchId(null);
            setSelectedFieldId(id);
          }}
          onSelectPatch={(id) => {
            setSelectedFieldId(null);
            setSelectedPatchId(id);
          }}
          onDeleteField={handleDeleteField}
          onDeletePatch={handleDeletePatch}
        />

        {/* Central Visual Canvas */}
        <CertificateCanvas
          fileKey={template.fileKey}
          fileType={template.fileType}
          pageDimensions={template.pageDimensions}
          selectedPage={template.selectedPage}
          fields={fields}
          patches={patches}
          selectedFieldId={selectedFieldId}
          selectedPatchId={selectedPatchId}
          onSelectField={setSelectedFieldId}
          onSelectPatch={setSelectedPatchId}
          onUpdateField={handleUpdateField}
          onUpdatePatch={handleUpdatePatch}
          onDeleteSelected={handleDeleteSelected}
          zoom={zoom}
        />

        {/* Right Properties Panel */}
        <FieldPropertiesPanel
          selectedField={selectedField}
          selectedPatch={selectedPatch}
          onUpdateField={handleUpdateField}
          onUpdateFieldStyle={handleUpdateFieldStyle}
          onUpdatePatch={handleUpdatePatch}
          onDeleteField={handleDeleteField}
          onDeletePatch={handleDeletePatch}
        />
      </div>

      {/* Live PDF Preview Modal */}
      <PreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={{
          ...template,
          name: templateName,
          fields,
          patches,
        }}
      />
    </div>
  );
}
