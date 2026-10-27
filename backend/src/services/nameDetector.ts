import fs from 'fs';
import path from 'path';
import { PageDimensions } from '../types';

export interface DetectedNameSection {
  found: boolean;
  confidence: 'high' | 'medium' | 'fallback';
  detectedText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  suggestedPatch?: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor: string;
  };
}

interface TextItemInfo {
  str: string;
  x: number;
  y: number; // top-left coordinate system
  width: number;
  height: number;
  fontSize: number;
}

const ANCHOR_REGEX = /(presented to|certify that|awarded to|in recognition of|conferred upon|appreciation to|given to|name of participant|participant name|student name|recipient name|certificate awarded to|honors to)/i;

const PLACEHOLDER_NAME_REGEX = /(participant|recipient|candidate|john doe|jane doe|student|full name|your name|name here|first last|\[name\]|<name>|\{\{name\}\})/i;

/**
 * Accurately detects the recipient name section on a certificate PDF or image.
 */
export async function detectCertificateNameSection(
  filePath: string,
  fileType: 'pdf' | 'png' | 'jpg' | 'jpeg',
  pageDimensions: PageDimensions,
  selectedPage: number = 1
): Promise<DetectedNameSection> {
  const { width: docWidth, height: docHeight } = pageDimensions;

  // Default fallback position (center band, ~42% from top, wide box)
  const defaultFallback: DetectedNameSection = {
    found: false,
    confidence: 'fallback',
    x: Math.round(docWidth * 0.15),
    y: Math.round(docHeight * 0.42),
    width: Math.round(docWidth * 0.7),
    height: 52,
    fontSize: 32,
    alignment: 'center',
    suggestedPatch: undefined,
  };

  if (fileType !== 'pdf' || !fs.existsSync(filePath)) {
    return defaultFallback;
  }

  try {
    // Dynamically load pdfjs legacy build in Node
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    const dataBuffer = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
    const pdfDoc = await loadingTask.promise;

    const pageNum = Math.min(Math.max(1, selectedPage), pdfDoc.numPages);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: TextItemInfo[] = [];

    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;

      const tx = item.transform; // [scaleX, skewY, skewX, scaleY, translateX, translateY]
      const fontSize = Math.round(Math.hypot(tx[0], tx[1])) || 12;
      const pdfX = tx[4];
      const pdfY = tx[5];

      // Convert from PDF coordinate (origin bottom-left) to browser top-left
      const screenX = Math.round(pdfX);
      const screenY = Math.round(viewport.height - pdfY - fontSize);
      const width = Math.round(item.width || fontSize * item.str.length * 0.6);
      const height = Math.round(item.height || fontSize * 1.2);

      items.push({
        str: item.str.trim(),
        x: screenX,
        y: screenY,
        width,
        height,
        fontSize,
      });
    }

    if (items.length === 0) {
      return defaultFallback;
    }

    // Sort items vertically (top to bottom)
    items.sort((a, b) => a.y - b.y);

    // Strategy 1: Find Anchor phrase ("presented to", "certify that", etc.)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (ANCHOR_REGEX.test(item.str)) {
        // Look at subsequent items within 140pt below the anchor
        for (let j = i + 1; j < items.length; j++) {
          const candidate = items[j];
          const verticalDistance = candidate.y - item.y;

          if (verticalDistance > 10 && verticalDistance < 150) {
            // Check if candidate is not another generic label (like "For successfully...")
            const isFollowupIntro = /^(for|in|on|with|during|dated|date)\b/i.test(
              candidate.str
            );

            if (!isFollowupIntro) {
              // High confidence match!
              const boxWidth = Math.max(candidate.width + 40, Math.round(docWidth * 0.6));
              const boxX = Math.max(0, Math.round((docWidth - boxWidth) / 2));

              return {
                found: true,
                confidence: 'high',
                detectedText: candidate.str,
                x: boxX,
                y: Math.max(0, candidate.y - 4),
                width: boxWidth,
                height: Math.max(candidate.height + 12, 48),
                fontSize: Math.max(candidate.fontSize, 28),
                alignment: 'center',
                suggestedPatch: {
                  x: Math.max(0, candidate.x - 8),
                  y: Math.max(0, candidate.y - 4),
                  width: candidate.width + 16,
                  height: candidate.height + 8,
                  fillColor: '#FFFFFF',
                },
              };
            }
          }
        }
      }
    }

    // Strategy 2: Look for explicit placeholder text ("John Doe", "Participant Name", etc.)
    for (const item of items) {
      if (PLACEHOLDER_NAME_REGEX.test(item.str)) {
        const boxWidth = Math.max(item.width + 40, Math.round(docWidth * 0.6));
        const boxX = Math.max(0, Math.round((docWidth - boxWidth) / 2));

        return {
          found: true,
          confidence: 'high',
          detectedText: item.str,
          x: boxX,
          y: Math.max(0, item.y - 4),
          width: boxWidth,
          height: Math.max(item.height + 12, 48),
          fontSize: Math.max(item.fontSize, 28),
          alignment: 'center',
          suggestedPatch: {
            x: Math.max(0, item.x - 8),
            y: Math.max(0, item.y - 4),
            width: item.width + 16,
            height: item.height + 8,
            fillColor: '#FFFFFF',
          },
        };
      }
    }

    // Strategy 3: Central Visual Prominence
    // Find text in the vertical center band (25% to 65% height) with prominent font size
    const centerBandItems = items.filter(
      (item) =>
        item.y >= docHeight * 0.25 &&
        item.y <= docHeight * 0.65 &&
        item.str.length > 2 &&
        !/certificate|achievement|appreciation|excellence/i.test(item.str)
    );

    if (centerBandItems.length > 0) {
      // Pick item with largest font size in center band
      centerBandItems.sort((a, b) => b.fontSize - a.fontSize);
      const topCandidate = centerBandItems[0];

      const boxWidth = Math.max(topCandidate.width + 40, Math.round(docWidth * 0.6));
      const boxX = Math.max(0, Math.round((docWidth - boxWidth) / 2));

      return {
        found: true,
        confidence: 'medium',
        detectedText: topCandidate.str,
        x: boxX,
        y: Math.max(0, topCandidate.y - 4),
        width: boxWidth,
        height: Math.max(topCandidate.height + 12, 48),
        fontSize: Math.max(topCandidate.fontSize, 28),
        alignment: 'center',
        suggestedPatch: {
          x: Math.max(0, topCandidate.x - 8),
          y: Math.max(0, topCandidate.y - 4),
          width: topCandidate.width + 16,
          height: topCandidate.height + 8,
          fillColor: '#FFFFFF',
        },
      };
    }

    return defaultFallback;
  } catch (err) {
    console.warn('PDF text extraction error during name detection:', err);
    return defaultFallback;
  }
}
