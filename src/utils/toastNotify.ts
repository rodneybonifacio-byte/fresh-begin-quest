import { toast } from 'sonner';

const defaultOptions = {
  position: 'top-center' as const,
};

export const toastSuccess = (message: string) => toast.success(message, defaultOptions);
export const toastError = (message: string) => toast.error(message, defaultOptions);
export const toastWarning = (message: string) => toast.warning(message, defaultOptions);
export const toastInfo = (message: string) => toast.info(message, defaultOptions);
