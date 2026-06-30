// Modal.js
// Reusable popup dialog component
// Used for Add/Edit forms throughout the app

import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    // Dark overlay background
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal box */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full 
                       ${sizeClasses[size]} max-h-[90vh] flex flex-col`}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 
                        border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                       p-2 rounded-lg transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>

      </div>
    </div>
  );
};

export default Modal;