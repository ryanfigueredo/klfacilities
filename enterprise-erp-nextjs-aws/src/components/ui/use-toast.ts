'use client';

import { toast as sonnerToast } from 'sonner';

type ToastPayload = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | string;
};

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastPayload) => {
      const t = variant === 'destructive' ? sonnerToast.error : sonnerToast;
      const message = title ?? '';
      if (description) t(message, { description });
      else t(message);
    },
    toastForbidden: (module?: string, action?: string) => {
      sonnerToast.error('Ação não permitida para seu perfil', {
        description: [module, action].filter(Boolean).join(' / ') || undefined,
      });
    },
  } as const;
}
