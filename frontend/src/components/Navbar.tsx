'use client';

import Link from 'next/link';
import { Award, Layers, PlusCircle } from 'lucide-react';

interface NavbarProps {
  onCreateClick?: () => void;
}

export function Navbar({ onCreateClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur dark:bg-slate-900/95 dark:border-slate-800">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm transition group-hover:bg-blue-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                CertiCraft
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Phase 1 Editor
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md hover:bg-slate-100 transition dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
          >
            <Layers className="w-4 h-4" />
            Templates
          </Link>

          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
