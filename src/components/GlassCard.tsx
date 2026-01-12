'use client';

import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingValues = {
    none: '0',
    sm: '12px',
    md: '16px',
    lg: '24px'
};

export default function GlassCard({
    children,
    className = '',
    padding = 'md'
}: GlassCardProps) {
    return (
        <div
            className={className}
            style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
                padding: paddingValues[padding],
                marginBottom: '16px',
                overflow: 'hidden'
            }}
        >
            {children}
        </div>
    );
}
