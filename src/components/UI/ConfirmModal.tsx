import React from 'react';
import { theme } from '../../theme';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'primary';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'primary'
}) => {
    if (!isOpen) return null;

    const accentColor = variant === 'danger' ? theme.colors.danger : theme.colors.primary;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}
            onClick={onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: '2rem',
                    maxWidth: '400px',
                    width: '100%',
                    border: `1px solid ${theme.colors.border}`,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    textAlign: 'center',
                    animation: 'modalEnter 0.3s ease-out'
                }}
            >
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: `${accentColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    color: accentColor
                }}>
                    <FaExclamationTriangle size={30} />
                </div>

                <h2 style={{
                    margin: 0,
                    marginBottom: '0.8rem',
                    fontSize: '1.5rem',
                    color: theme.colors.text.primary,
                    fontWeight: 700
                }}>
                    {title}
                </h2>

                <p style={{
                    margin: '0 0 2rem 0',
                    color: theme.colors.text.secondary,
                    fontSize: '1rem',
                    lineHeight: '1.6'
                }}>
                    {message}
                </p>

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '0.8rem 1.5rem',
                            borderRadius: theme.borderRadius.md,
                            border: `1px solid ${theme.colors.border}`,
                            background: 'transparent',
                            color: theme.colors.text.secondary,
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '0.8rem 1.5rem',
                            borderRadius: theme.borderRadius.md,
                            border: 'none',
                            background: accentColor,
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            boxShadow: variant === 'primary' ? theme.shadows.glow : `0 4px 12px ${accentColor}40`
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes modalEnter {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ConfirmModal;
