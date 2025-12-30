import React from 'react';
import { theme } from '../../theme';

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, style, ...props }) => {
    return (
        <div
            style={{
                backgroundColor: theme.colors.surface,
                backdropFilter: theme.backdropFilter,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                boxShadow: theme.shadows.sm,
                padding: '1.5rem',
                color: theme.colors.text.primary,
                boxSizing: 'border-box',
                ...style
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
