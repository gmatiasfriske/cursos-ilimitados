import React from 'react';
import { theme } from '../../theme';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'success';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'primary'
}) => {
    if (!isOpen) return null;

    const getButtonColor = () => {
        if (variant === 'danger') return theme.colors.danger;
        if (variant === 'success') return theme.colors.success;
        return theme.colors.primary;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
        }}
            onClick={onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: '1.5rem',
                    maxWidth: '400px',
                    width: '100%',
                    border: `1px solid ${theme.colors.border}`,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    animation: 'fadeIn 0.2s ease-out'
                }}
            >
                <h2 style={{
                    margin: 0,
                    marginBottom: '0.75rem',
                    fontSize: '1.25rem',
                    color: theme.colors.text.primary,
                    fontWeight: 600
                }}>
                    {title}
                </h2>

                <p style={{
                    margin: '0 0 1.5rem 0',
                    color: theme.colors.text.secondary,
                    fontSize: '0.95rem',
                    lineHeight: '1.6'
                }}>
                    {message}
                </p>

                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: theme.borderRadius.md,
                            border: 'none',
                            background: 'rgba(255,255,255,0.05)',
                            color: theme.colors.text.secondary,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                        }}
                        style={{
                            padding: '0.6rem 1.5rem',
                            borderRadius: theme.borderRadius.md,
                            border: 'none',
                            background: getButtonColor(),
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            boxShadow: `0 4px 12px ${variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
