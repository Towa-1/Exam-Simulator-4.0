import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function Modal({ isOpen, onClose, onConfirm, title, message }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel relative w-full max-w-md p-8 rounded-3xl border border-primary/30 z-10 shadow-2xl"
          >
            <h2 className="text-2xl font-black text-primary mb-3 uppercase tracking-tight">{title}</h2>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed mb-8">{message}</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 px-6 rounded-2xl border border-primary/20 text-slate-300 font-bold hover:bg-primary/10 transition-colors text-xs md:text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-primary text-slate-950 font-black hover:bg-primary-hover transition-colors text-xs md:text-sm cursor-pointer shadow-lg shadow-primary/15"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
