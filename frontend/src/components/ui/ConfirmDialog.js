// ConfirmDialog.js
// "Are you sure you want to delete?" popup

import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full 
                      max-w-md p-6">

        <div className="flex items-center gap-4 mb-4">
          <div className="bg-red-100 p-3 rounded-full">
            <FiAlertTriangle className="text-red-600 text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {title || 'Confirm Delete'}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {message || 'This action cannot be undone.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="btn-danger"
          >
            Yes, Delete
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;