import React from 'react';
import { theme } from '../../theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', fullWidth, style, ...props }) => {
    let bg = theme.colors.primary;
    let color = 'white';

    if (variant === 'secondary') bg = theme.colors.surfaceHighlight;
    if (variant === 'danger') bg = theme.colors.danger;
    if (variant === 'success') bg = theme.colors.success;
    if (variant === 'ghost') {
        bg = 'transparent';
        color = theme.colors.text.secondary;
    }

    return (
        <button
            style={{
                background: variant === 'primary' ? theme.colors.gradient : bg,
                color: color,
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: theme.borderRadius.sm, // Using sm (0.5rem) or md (1rem)
                fontSize: theme.typography.sizes.body,
                fontWeight: theme.typography.weights.medium,
                cursor: 'pointer',
                width: fullWidth ? '100%' : 'auto',
                transition: 'all 0.2s ease',
                boxShadow: variant === 'primary' ? theme.shadows.glow : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxSizing: 'border-box',
                ...style
            }}
            onMouseOver={(e) => {
                if (variant !== 'ghost') e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
            }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
