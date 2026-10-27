'use client';

import React, { useEffect, useRef, useState, MouseEvent } from 'react';
import { CertificateField, BackgroundPatch, PageDimensions } from '../../types';
import { api } from '../../lib/api';
import { getFontCssFamily } from '../../lib/utils';

interface CertificateCanvasProps {
  fileKey: string;
  fileType: 'pdf' | 'png' | 'jpg' | 'jpeg';
  pageDimensions: PageDimensions;
  selectedPage: number;
  fields: CertificateField[];
  patches: BackgroundPatch[];
  selectedFieldId: string | null;
  selectedPatchId: string | null;
  onSelectField: (id: string | null) => void;
  onSelectPatch: (id: string | null) => void;
  onUpdateField: (id: string, updates: Partial<CertificateField>) => void;
  onUpdatePatch: (id: string, updates: Partial<BackgroundPatch>) => void;
  onDeleteSelected: () => void;
  zoom: number;
}

export function CertificateCanvas({
  fileKey,
  fileType,
  pageDimensions,
  selectedPage,
  fields,
  patches,
  selectedFieldId,
  selectedPatchId,
  onSelectField,
  onSelectPatch,
  onUpdateField,
  onUpdatePatch,
  onDeleteSelected,
  zoom,
}: CertificateCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction dragging / resizing state
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionType, setInteractionType] = useState<
    'move_field' | 'resize_field' | 'move_patch' | 'resize_patch' | null
  >(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [initialItemState, setInitialItemState] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 0, y: 0, width: 0, height: 0 });

  // PDF.js render logic for PDF certificates
  useEffect(() => {
    if (fileType !== 'pdf' || !pdfCanvasRef.current) return;

    let isMounted = true;
    const renderPdfPage = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Configure PDF.js worker
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        }

        const fileUrl = api.getTemplateFileUrl(fileKey);
        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        const page = await pdf.getPage(selectedPage || 1);
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        // Render at 2x scale for sharp vector clarity
        const viewport = page.getViewport({ scale: 2.0 });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Failed to render PDF page via PDF.js:', err);
      }
    };

    renderPdfPage();

    return () => {
      isMounted = false;
    };
  }, [fileKey, fileType, selectedPage]);

  // Keyboard navigation & fine tuning (Arrow keys, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If focused inside an input or textarea, let standard typing work
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFieldId || selectedPatchId) {
          e.preventDefault();
          onDeleteSelected();
        }
        return;
      }

      const step = e.shiftKey ? 10 : 1;

      if (selectedFieldId) {
        const field = fields.find((f) => f.id === selectedFieldId);
        if (!field) return;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onUpdateField(selectedFieldId, { x: Math.max(0, field.x - step) });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onUpdateField(selectedFieldId, { x: field.x + step });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          onUpdateField(selectedFieldId, { y: Math.max(0, field.y - step) });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onUpdateField(selectedFieldId, { y: field.y + step });
        }
      } else if (selectedPatchId) {
        const patch = patches.find((p) => p.id === selectedPatchId);
        if (!patch) return;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onUpdatePatch(selectedPatchId, { x: Math.max(0, patch.x - step) });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onUpdatePatch(selectedPatchId, { x: patch.x + step });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          onUpdatePatch(selectedPatchId, { y: Math.max(0, patch.y - step) });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onUpdatePatch(selectedPatchId, { y: patch.y + step });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFieldId,
    selectedPatchId,
    fields,
    patches,
    onUpdateField,
    onUpdatePatch,
    onDeleteSelected,
  ]);

  // Mouse drag & resize handlers
  const handleStartMoveField = (e: MouseEvent, field: CertificateField) => {
    e.stopPropagation();
    onSelectPatch(null);
    onSelectField(field.id);
    setIsInteracting(true);
    setInteractionType('move_field');
    setActiveId(field.id);
    setStartPos({ x: e.clientX, y: e.clientY });
    setInitialItemState({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    });
  };

  const handleStartResizeField = (e: MouseEvent, field: CertificateField) => {
    e.stopPropagation();
    setIsInteracting(true);
    setInteractionType('resize_field');
    setActiveId(field.id);
    setStartPos({ x: e.clientX, y: e.clientY });
    setInitialItemState({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    });
  };

  const handleStartMovePatch = (e: MouseEvent, patch: BackgroundPatch) => {
    e.stopPropagation();
    onSelectField(null);
    onSelectPatch(patch.id);
    setIsInteracting(true);
    setInteractionType('move_patch');
    setActiveId(patch.id);
    setStartPos({ x: e.clientX, y: e.clientY });
    setInitialItemState({
      x: patch.x,
      y: patch.y,
      width: patch.width,
      height: patch.height,
    });
  };

  const handleStartResizePatch = (e: MouseEvent, patch: BackgroundPatch) => {
    e.stopPropagation();
    setIsInteracting(true);
    setInteractionType('resize_patch');
    setActiveId(patch.id);
    setStartPos({ x: e.clientX, y: e.clientY });
    setInitialItemState({
      x: patch.x,
      y: patch.y,
      width: patch.width,
      height: patch.height,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isInteracting || !activeId) return;

    // Delta in screen pixels adjusted by zoom factor
    const deltaX = (e.clientX - startPos.x) / zoom;
    const deltaY = (e.clientY - startPos.y) / zoom;

    if (interactionType === 'move_field') {
      const newX = Math.round(Math.max(0, initialItemState.x + deltaX));
      const newY = Math.round(Math.max(0, initialItemState.y + deltaY));
      onUpdateField(activeId, { x: newX, y: newY });
    } else if (interactionType === 'resize_field') {
      const newW = Math.round(Math.max(30, initialItemState.width + deltaX));
      const newH = Math.round(Math.max(16, initialItemState.height + deltaY));
      onUpdateField(activeId, { width: newW, height: newH });
    } else if (interactionType === 'move_patch') {
      const newX = Math.round(Math.max(0, initialItemState.x + deltaX));
      const newY = Math.round(Math.max(0, initialItemState.y + deltaY));
      onUpdatePatch(activeId, { x: newX, y: newY });
    } else if (interactionType === 'resize_patch') {
      const newW = Math.round(Math.max(10, initialItemState.width + deltaX));
      const newH = Math.round(Math.max(10, initialItemState.height + deltaY));
      onUpdatePatch(activeId, { width: newW, height: newH });
    }
  };

  const handleMouseUp = () => {
    if (isInteracting) {
      setIsInteracting(false);
      setInteractionType(null);
      setActiveId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => {
        onSelectField(null);
        onSelectPatch(null);
      }}
      className="flex-1 overflow-auto canvas-grid flex items-center justify-center p-8 relative select-none"
    >
      {/* Scaled Certificate Board */}
      <div
        style={{
          width: `${pageDimensions.width}px`,
          height: `${pageDimensions.height}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        className="relative bg-white transition-transform duration-75 ease-out rounded-sm overflow-hidden flex-shrink-0"
      >
        {/* Background Layer: PDF canvas or image */}
        {fileType === 'pdf' ? (
          <canvas
            ref={pdfCanvasRef}
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <img
            src={api.getTemplateFileUrl(fileKey)}
            alt="Certificate Background"
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Layer: Background Patches (Covers legacy text) */}
        {patches.map((patch) => {
          const isSelected = selectedPatchId === patch.id;
          return (
            <div
              key={patch.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectField(null);
                onSelectPatch(patch.id);
              }}
              onMouseDown={(e) => handleStartMovePatch(e, patch)}
              style={{
                left: `${patch.x}px`,
                top: `${patch.y}px`,
                width: `${patch.width}px`,
                height: `${patch.height}px`,
                backgroundColor: patch.fillColor || '#FFFFFF',
                opacity: patch.opacity !== undefined ? patch.opacity : 1.0,
              }}
              className={`absolute cursor-move transition-shadow ${
                isSelected
                  ? 'ring-2 ring-amber-500 shadow-md'
                  : 'hover:ring-1 hover:ring-amber-400'
              }`}
            >
              {isSelected && (
                <>
                  <span className="absolute -top-5 left-0 text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">
                    Cover Patch
                  </span>
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleStartResizePatch(e, patch)}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-600 border border-white rounded-xs cursor-se-resize shadow-sm"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Layer: Editable Dynamic Text & Signature Overlays */}
        {fields.map((field) => {
          const isSelected = selectedFieldId === field.id;
          const isSignature =
            field.type === 'signature_image' || field.type === 'logo_image';

          // Text to show in visual editor
          let displayText = field.defaultValue || field.sampleValue;
          if (!displayText) {
            displayText = field.isDynamic
              ? `{{${field.key}}}`
              : `[${field.label}]`;
          }

          return (
            <div
              key={field.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPatch(null);
                onSelectField(field.id);
              }}
              onMouseDown={(e) => handleStartMoveField(e, field)}
              style={{
                left: `${field.x}px`,
                top: `${field.y}px`,
                width: `${field.width}px`,
                height: `${field.height}px`,
              }}
              className={`absolute cursor-move flex items-center group transition-colors ${
                isSelected
                  ? 'ring-2 ring-blue-600 bg-blue-50/20'
                  : 'hover:ring-1 hover:ring-blue-400/80'
              }`}
            >
              {/* Field Label Badge on hover or selection */}
              <div
                className={`absolute -top-5 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-tight flex items-center gap-1 shadow-xs pointer-events-none transition-opacity ${
                  isSelected
                    ? 'bg-blue-600 text-white opacity-100'
                    : 'bg-slate-800 text-white opacity-0 group-hover:opacity-90'
                }`}
              >
                <span>{field.label}</span>
                {field.isDynamic && (
                  <span className="text-blue-200 text-[9px] font-mono">
                    {`{{${field.key}}}`}
                  </span>
                )}
              </div>

              {/* Content Rendering: Signature vs Text */}
              {isSignature ? (
                field.assetKey ? (
                  <img
                    src={api.getSignatureFileUrl(field.assetKey)}
                    alt={field.label}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center p-2 text-center text-slate-400 bg-slate-50/50">
                    <span className="text-xs font-semibold">
                      {field.label}
                    </span>
                    <span className="text-[10px]">Upload signature image</span>
                  </div>
                )
              ) : (
                <div
                  style={{
                    fontFamily: getFontCssFamily(field.style.fontFamily),
                    fontSize: `${field.style.fontSize}px`,
                    fontWeight: field.style.isBold ? 'bold' : 'normal',
                    fontStyle: field.style.isItalic ? 'italic' : 'normal',
                    color: field.style.color || '#000000',
                    textAlign: field.style.alignment,
                    lineHeight: 1.1,
                  }}
                  className="w-full truncate px-1 pointer-events-none select-none"
                >
                  {displayText}
                </div>
              )}

              {/* Resize Handle */}
              {isSelected && (
                <div
                  onMouseDown={(e) => handleStartResizeField(e, field)}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border border-white rounded-xs cursor-se-resize shadow-sm"
                  title="Drag to resize field box"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
