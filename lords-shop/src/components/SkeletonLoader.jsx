import React from 'react';

const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  if (type === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-5/6" />
            </div>
            <div className="h-10 bg-slate-700 rounded mt-4" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card animate-pulse h-48">
            <div className="h-20 bg-slate-700 rounded mb-3" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
            </div>
            <div className="h-8 bg-slate-700 rounded mt-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-700 rounded w-full" />
        ))}
      </div>
    );
  }

  return null;
};

export default SkeletonLoader;
