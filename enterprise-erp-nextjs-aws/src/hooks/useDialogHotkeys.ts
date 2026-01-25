import { useEffect } from 'react';

interface UseDialogHotkeysProps {
  isOpen: boolean;
  onClose: () => void;
  onCommandK?: () => void;
}

export function useDialogHotkeys({
  isOpen,
  onClose,
  onCommandK,
}: UseDialogHotkeysProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      // ESC para fechar
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Cmd/Ctrl + K para comando especial
      if ((event.metaKey || event.ctrlKey) && event.key === 'k' && onCommandK) {
        event.preventDefault();
        onCommandK();
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onCommandK]);
}

// Hook específico para diálogos
export function useDialogKeyboard({
  onClose,
  onCommandK,
  enabled = true,
}: {
  onClose: () => void;
  onCommandK?: () => void;
  enabled?: boolean;
}) {
  return useDialogHotkeys({
    isOpen: enabled,
    onClose,
    onCommandK,
  });
}

// Hook para Command Palette
export function useCommandPalette({
  onOpen,
  enabled = true,
}: {
  onOpen: () => void;
  enabled?: boolean;
}) {
  return useDialogHotkeys({
    isOpen: enabled,
    onClose: () => {},
    onCommandK: onOpen,
  });
}
