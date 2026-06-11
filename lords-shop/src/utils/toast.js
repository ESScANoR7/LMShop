import toast from 'react-hot-toast';

/**
 * Показує toast сповіщення про успіх
 */
export const showSuccessToast = (message) => {
  return toast.success(message, {
    duration: 3000,
    position: 'bottom-right',
  });
};

/**
 * Показує toast сповіщення про помилку
 */
export const showErrorToast = (message) => {
  return toast.error(message, {
    duration: 4000,
    position: 'bottom-right',
  });
};

/**
 * Показує toast сповіщення про інформацію
 */
export const showInfoToast = (message) => {
  return toast(message, {
    duration: 3000,
    position: 'bottom-right',
    icon: 'ℹ️',
  });
};

/**
 * Показує toast сповіщення про loading
 */
export const showLoadingToast = (message) => {
  return toast.loading(message, {
    position: 'bottom-right',
  });
};

/**
 * Оновлює toast сповіщення
 */
export const updateToast = (toastId, options) => {
  return toast.remove(toastId) || toast(options.message, options);
};
