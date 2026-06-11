import React, { memo } from 'react';

/**
 * Оптимізований компонент для пустого стану
 */
const EmptyState = memo(({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon && (
        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-center max-w-sm mb-6">{description}</p>
      {action && action}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
