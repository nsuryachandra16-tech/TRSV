import React from 'react';

export default function SkeletonLoader({ type = 'card', count = 1, className = '' }) {
  const elements = Array.from({ length: count });

  if (type === 'list') {
    return (
      <div className="flex flex-col gap-3 w-full">
        {elements.map((_, i) => (
          <div key={i} className={`h-16 w-full rounded-xl bg-slate-200 dark:bg-slate-800/80 animate-pulse ${className}`} />
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="flex flex-col gap-2 w-full">
        {elements.map((_, i) => (
          <div key={i} className={`h-4 w-${i % 2 === 0 ? 'full' : '3/4'} rounded bg-slate-200 dark:bg-slate-800/80 animate-pulse ${className}`} />
        ))}
      </div>
    );
  }

  // default card type
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full ${className}`}>
      {elements.map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800/80 animate-pulse shadow-sm" />
      ))}
    </div>
  );
}
