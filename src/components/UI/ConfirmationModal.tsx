import React from 'react';
import { theme } from '../../theme';
// We'll trust the global theme or pass props. For simplicity, we use inline styles + theme object.

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen, title, message, onConfirm, onCancel,
    confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false
}) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
        }}>
            <div style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '12px',
                padding: '1.5rem',
                minWidth: '300px',
                maxWidth: '90%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                animation: 'slideUp 0.2s ease-out'
            }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: theme.colors.text.primary, fontSize: '1.1rem' }}>{title}</h3>
                <p style={{ margin: '0 0 1.5rem 0', color: theme.colors.text.secondary, fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                    {cancelText && (
                        <button
                            onClick={onCancel}
                            style={{
                                background: 'transparent',
                                border: `1px solid ${theme.colors.border}`,
                                color: theme.colors.text.primary,
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        style={{
                            background: isDestructive ? theme.colors.danger : theme.colors.primary,
                            border: 'none',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ConfirmationModal;
