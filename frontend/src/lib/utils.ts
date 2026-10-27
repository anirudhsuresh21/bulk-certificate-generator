import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FONT_OPTIONS: { id: import('../types').FontFamily; label: string; category: string }[] = [
  // Script / Calligraphy
  { id: 'GreatVibes', label: 'Great Vibes (Calligraphy)', category: 'Script' },
  { id: 'AlexBrush', label: 'Alex Brush (Cursive)', category: 'Script' },
  { id: 'DancingScript', label: 'Dancing Script (Modern Script)', category: 'Script' },
  { id: 'PinyonScript', label: 'Pinyon Script (Luxury Diploma)', category: 'Script' },
  // Serif
  { id: 'PlayfairDisplay', label: 'Playfair Display (Academic Serif)', category: 'Serif' },
  { id: 'Cinzel', label: 'Cinzel (Classical Roman)', category: 'Serif' },
  { id: 'TimesRoman', label: 'Times Roman (Formal Serif)', category: 'Serif' },
  // Sans-Serif
  { id: 'Montserrat', label: 'Montserrat (Modern Sans)', category: 'Sans-Serif' },
  { id: 'Helvetica', label: 'Helvetica / Arial (Clean Sans)', category: 'Sans-Serif' },
  // Monospace
  { id: 'Courier', label: 'Courier (Monospace)', category: 'Monospace' },
];

export function getFontCssFamily(fontFamily: import('../types').FontFamily | string): string {
  switch (fontFamily) {
    case 'GreatVibes':
      return "'Great Vibes', cursive";
    case 'AlexBrush':
      return "'Alex Brush', cursive";
    case 'DancingScript':
      return "'Dancing Script', cursive";
    case 'PinyonScript':
      return "'Pinyon Script', cursive";
    case 'PlayfairDisplay':
      return "'Playfair Display', serif";
    case 'Cinzel':
      return "'Cinzel', serif";
    case 'Montserrat':
      return "'Montserrat', sans-serif";
    case 'TimesRoman':
      return "'Times New Roman', serif";
    case 'Courier':
      return "'Courier New', monospace";
    case 'Helvetica':
    default:
      return "Helvetica, Arial, sans-serif";
  }
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
