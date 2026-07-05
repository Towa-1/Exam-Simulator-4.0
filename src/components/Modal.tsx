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
            className="glass-panel relative w-full max-w-md p-8 rounded-2xl"
          >
            <h2 className="text-2xl font-bold text-yellow-500 mb-4">{title}</h2>
            <p className="text-slate-300 mb-8">{message}</p>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 rounded-xl border border-yellow-500/20 text-yellow-500 font-bold hover:bg-yellow-500/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-6 rounded-xl bg-yellow-500 text-slate-950 font-bold hover:bg-yellow-600 transition-colors"
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
