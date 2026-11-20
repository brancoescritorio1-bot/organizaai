import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X } from 'lucide-react';

export interface PdfOrientationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orientation: 'p' | 'l') => void;
}

export function PdfOrientationModal({ isOpen, onClose, onConfirm }: PdfOrientationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl border border-transparent dark:border-white/[0.08] w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Formato do PDF</h3>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-gray-600 dark:text-zinc-400 mb-6 font-medium text-center">
                Como você deseja gerar este arquivo PDF?
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => onConfirm('p')}
                  className="flex items-center justify-between w-full px-5 py-4 border-2 border-gray-100 dark:border-white/[0.08] rounded-xl text-left hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-zinc-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Vertical (Retrato)</span>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Melhor para listas e relatórios curtos</span>
                  </div>
                  <div className="w-8 h-10 border-2 border-gray-300 dark:border-zinc-600 rounded overflow-hidden flex flex-col group-hover:border-indigo-500">
                    <div className="flex-1 bg-gray-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20" />
                  </div>
                </button>
                
                <button
                  onClick={() => onConfirm('l')}
                  className="flex items-center justify-between w-full px-5 py-4 border-2 border-gray-100 dark:border-white/[0.08] rounded-xl text-left hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-zinc-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Horizontal (Paisagem)</span>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Melhor para gráficos e tabelas largas</span>
                  </div>
                  <div className="w-10 h-8 mt-1 border-2 border-gray-300 dark:border-zinc-600 rounded overflow-hidden flex group-hover:border-indigo-500">
                    <div className="flex-1 bg-gray-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20" />
                  </div>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-white/[0.03] border-t border-transparent dark:border-white/[0.06] flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-white/[0.08] rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors w-full"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
