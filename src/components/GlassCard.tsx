'use client';

import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
};

export default function GlassCard({
    children,
    className = '',
    hover = false,
    padding = 'md'
}: GlassCardProps) {
    return (
        <div className={`glass-card ${hover ? 'glass-card-hover' : ''} ${paddingClasses[padding]} ${className}`}>
            {children}
        </div>
    );
}
