import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="neu-card w-full max-w-xl rounded-2xl p-6 relative transition-all"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-color)', color: 'var(--text-color)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 neumorphic-interactive hover:opacity-80"
          aria-label="Fechar modal"
          title="Fechar"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
