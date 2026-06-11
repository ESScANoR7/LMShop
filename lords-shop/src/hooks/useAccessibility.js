import { useEffect, useRef } from 'react';

/**
 * Хук для обробки keyboard shortcuts
 * @param {object} shortcuts - Об'єкт з key: callback парами
 * @param {boolean} enabled - Увімкнути/вимкнути shortcuts
 */
export const useKeyboardShortcuts = (shortcuts, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const alt = event.altKey;
      const shift = event.shiftKey;

      // Пропускаємо якщо фокус на input/textarea
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        return;
      }

      Object.entries(shortcuts).forEach(([shortcutKey, callback]) => {
        const [k, ...modifiers] = shortcutKey.toLowerCase().split('+');
        const hasCtrl = modifiers.includes('ctrl');
        const hasAlt = modifiers.includes('alt');
        const hasShift = modifiers.includes('shift');

        if (
          key === k &&
          ctrl === hasCtrl &&
          alt === hasAlt &&
          shift === hasShift
        ) {
          event.preventDefault();
          callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

/**
 * Хок для управління фокусом в модалях (focus trap)
 */
export const useFocusTrap = (elementRef) => {
  useEffect(() => {
    const element = elementRef?.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [elementRef]);
};

/**
 * Хок для оголошення動態 ARIA live regions
 */
export const useAriaLive = (message, politeness = 'polite') => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      const div = document.createElement('div');
      div.setAttribute('aria-live', politeness);
      div.setAttribute('aria-atomic', 'true');
      div.style.position = 'absolute';
      div.style.left = '-10000px';
      document.body.appendChild(div);
      containerRef.current = div;
    }

    if (message) {
      containerRef.current.textContent = message;
    }

    return () => {
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, [message, politeness]);

  return containerRef;
};

/**
 * Хок для перевірки режиму High Contrast
 */
export const useHighContrast = () => {
  const getHighContrast = () => {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-contrast: more)').matches;
    }
    return false;
  };

  const [isHighContrast, setIsHighContrast] = React.useState(getHighContrast);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');

    const handleChange = (e) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

/**
 * Хок для перевірки режиму reduced motion
 */
export const useReducedMotion = () => {
  const getReducedMotion = () => {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  };

  const [reducedMotion, setReducedMotion] = React.useState(getReducedMotion);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
};
