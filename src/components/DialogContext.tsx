import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PdfPreviewModal } from './PdfPreviewModal';

type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
};

type DialogContextType = {
  confirm: (message: string, options?: string | ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
  askOptions: <T>(config: { title: string; message: string; options: { label: string; value: T }[] }) => Promise<T | null>;
  preview: (element: HTMLElement, title: string) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogs, setDialogs] = useState<any[]>([]);

  const confirm = useCallback((message: string, options?: string | ConfirmOptions) => {
    let title = 'Confirmação';
    let confirmText = 'Confirmar';
    let cancelText = 'Cancelar';
    let type = 'warning';

    if (typeof options === 'string') {
      title = options;
    } else if (options) {
      title = options.title || title;
      confirmText = options.confirmText || confirmText;
      cancelText = options.cancelText || cancelText;
      type = options.type || type;
    }

    // Auto-detect danger from message or title
    if (
      message.toLowerCase().includes('excluir') || 
      message.toLowerCase().includes('apagar') ||
      title.toLowerCase().includes('excluir') ||
      title.toLowerCase().includes('apagar')
    ) {
      type = 'danger';
      confirmText = 'Sim, Apagar';
      if (title === 'Confirmação') title = 'Apagar Documento?';
    }

    return new Promise<boolean>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'confirm',
          dialogType: type,
          title,
          message,
          confirmText,
          cancelText,
          resolve,
        },
      ]);
    });
  }, []);

  const alert = useCallback((message: string | any, title: string = 'Aviso') => {
    let finalMessage = '';
    let finalTitle = title;
    if (typeof message === 'object' && message !== null) {
      finalMessage = message.message || message.description || message.error || JSON.stringify(message);
      finalTitle = message.title || title;
    } else {
      finalMessage = String(message ?? '');
    }

    return new Promise<void>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'alert',
          title: finalTitle,
          message: finalMessage,
          resolve,
        },
      ]);
    });
  }, []);

  const askOptions = useCallback(<T,>(config: { title: string; message: string; options: { label: string; value: T }[] }) => {
    return new Promise<T | null>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'options',
          title: config.title,
          message: config.message,
          options: config.options,
          resolve,
        },
      ]);
    });
  }, []);

  const preview = useCallback((element: HTMLElement, title: string) => {
    return new Promise<boolean>((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type: 'preview',
          element,
          title,
          resolve,
        },
      ]);
    });
  }, []);

  const handleClose = (id: string, result: any) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id);
      if (dialog) dialog.resolve(result);
      return prev.filter((d) => d.id !== id);
    });
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, askOptions, preview }}>
      {children}
      <AnimatePresence>
        {dialogs.map((dialog) => (
            dialog.type === 'preview' ? (
                <PdfPreviewModal
                    key={dialog.id}
                    element={dialog.element}
                    title={dialog.title}
                    onClose={(action) => handleClose(dialog.id, action)}
                />
            ) : (
          <motion.div
            key={dialog.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/25 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/95 backdrop-blur-2xl rounded-2xl border border-black/[0.08] shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden text-[#1d1d1f]"
            >
              <div className="p-6 overflow-y-auto">
                <div className="flex flex-col items-center text-center gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    dialog.type === 'confirm' 
                      ? dialog.dialogType === 'danger' 
                        ? 'bg-rose-50 text-[#ff3b30] border-rose-200/60' 
                        : 'bg-amber-50 text-[#ff9500] border-amber-200/60' 
                      : 'bg-emerald-50 text-[#34c759] border-emerald-200/60'
                  }`}>
                    {dialog.type === 'confirm' ? (
                      dialog.dialogType === 'danger' ? <AlertTriangle size={22} /> : <AlertCircle size={22} />
                    ) : (
                      <CheckCircle2 size={22} />
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-[#1d1d1f] tracking-tight">
                    {typeof dialog.title === 'string' ? dialog.title : 'Aviso'}
                  </h3>
                </div>
                <p className="text-xs text-[#515154] text-center whitespace-pre-wrap leading-relaxed font-normal">
                  {typeof dialog.message === 'string' ? dialog.message : JSON.stringify(dialog.message)}
                </p>
                {dialog.type === 'options' && (
                  <div className="mt-5 flex flex-col gap-2">
                    {dialog.options.map((opt: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleClose(dialog.id, opt.value)}
                        className="w-full px-4 py-2.5 text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] border border-black/[0.06] rounded-xl hover:bg-[#e8e8ed] transition-colors cursor-pointer"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-3.5 bg-black/[0.02] border-t border-black/[0.06] flex items-center justify-end gap-2.5">
                {(dialog.type === 'confirm' || dialog.type === 'options') && (
                  <button
                    onClick={() => handleClose(dialog.id, dialog.type === 'options' ? null : false)}
                    className="px-4 py-2 text-xs font-medium text-[#515154] bg-[#f5f5f7] border border-black/[0.06] rounded-xl hover:bg-[#e8e8ed] hover:text-[#1d1d1f] transition-colors cursor-pointer"
                  >
                    {dialog.type === 'options' ? 'Cancelar' : (dialog.cancelText || 'Cancelar')}
                  </button>
                )}
                {dialog.type !== 'options' && (
                  <button
                    onClick={() => handleClose(dialog.id, dialog.type === 'confirm' ? true : undefined)}
                    className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer shadow-xs ${
                      dialog.type === 'confirm' 
                        ? dialog.dialogType === 'danger'
                          ? 'bg-[#ff3b30] hover:bg-[#e03126]'
                          : 'bg-[#ff9500] hover:bg-[#e08400]' 
                        : 'bg-[#0071e3] hover:bg-[#0077ed]'
                    }`}
                  >
                    {dialog.type === 'confirm' ? (dialog.confirmText || 'Confirmar') : 'OK'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
          )
        ))}
      </AnimatePresence>
    </DialogContext.Provider>
  );
};
