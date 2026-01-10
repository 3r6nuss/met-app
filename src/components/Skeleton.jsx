import React from 'react';

/**
 * Skeleton loading components for better UX during data fetching
 */

// Simple pulsing skeleton block
export const Skeleton = ({ className = '', width, height }) => (
    <div
        className={`animate-pulse bg-slate-700/50 rounded ${className}`}
        style={{ width, height }}
    />
);

// Text line skeleton
export const SkeletonText = ({ lines = 1, className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className="h-4"
                width={i === lines - 1 ? '70%' : '100%'}
            />
        ))}
    </div>
);

// Card skeleton
export const SkeletonCard = ({ className = '' }) => (
    <div className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3 ${className}`}>
        <Skeleton className="h-6 w-1/3" />
        <SkeletonText lines={2} />
        <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
        </div>
    </div>
);

// Table row skeleton
export const SkeletonTableRow = ({ columns = 5 }) => (
    <tr className="border-b border-slate-700/30">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <Skeleton className="h-4" width={i === 0 ? '80%' : '60%'} />
            </td>
        ))}
    </tr>
);

// Full table skeleton
export const SkeletonTable = ({ rows = 5, columns = 5 }) => (
    <div className="overflow-hidden rounded-xl border border-slate-700/50">
        <table className="w-full">
            <thead className="bg-slate-800/50">
                <tr>
                    {Array.from({ length: columns }).map((_, i) => (
                        <th key={i} className="px-4 py-3 text-left">
                            <Skeleton className="h-3 w-20" />
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
                {Array.from({ length: rows }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={columns} />
                ))}
            </tbody>
        </table>
    </div>
);

// List skeleton
export const SkeletonList = ({ items = 5, className = '' }) => (
    <div className={`space-y-3 ${className}`}>
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

// Page header skeleton
export const SkeletonPageHeader = () => (
    <div className="glass-panel rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
        </div>
    </div>
);

// Full page loading skeleton
export const SkeletonPage = ({ type = 'table' }) => (
    <div className="space-y-6 animate-fade-in">
        <SkeletonPageHeader />
        {type === 'table' ? (
            <SkeletonTable rows={8} columns={5} />
        ) : type === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        ) : (
            <SkeletonList items={8} />
        )}
    </div>
);

export default Skeleton;
