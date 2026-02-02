'use client';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesDialog({
  isOpen,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Unsaved Changes</h2>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-gray-600">
              You have unsaved changes in this form. Do you want to discard them and proceed to the next form?
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Keep Editing
            </button>
            <button
              onClick={onDiscard}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
            >
              Discard Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
