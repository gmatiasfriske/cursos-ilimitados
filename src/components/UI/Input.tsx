import React from 'react';
import { theme } from '../../theme';

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ style, ...props }) => {
    return (
        <input
            style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
                color: 'white',
                fontSize: '1rem',
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
                transition: 'border-color 0.2s ease',
                ...style
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = theme.colors.primary}
            onBlur={(e) => e.currentTarget.style.borderColor = theme.colors.border}
            {...props}
        />
    );
};

export default Input;
