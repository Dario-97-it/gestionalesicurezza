import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Icon */}
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                  isDangerous ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <ExclamationTriangleIcon className={`h-6 w-6 ${
                    isDangerous ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                </div>

                {/* Title */}
                <Dialog.Title as="h3" className="mt-4 text-lg font-medium leading-6 text-gray-900 text-center">
                  {title}
                </Dialog.Title>

                {/* Message */}
                <div className="mt-2">
                  <p className="text-sm text-gray-500 text-center">
                    {message}
                  </p>
                </div>

                {/* Buttons */}
                <div className="mt-6 flex gap-3 justify-end">
                  <Button
                    onClick={onCancel}
                    variant="secondary"
                    disabled={isLoading}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                  >
                    {isLoading ? 'Elaborazione...' : confirmText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
