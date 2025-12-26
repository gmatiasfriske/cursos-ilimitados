import React, { useState } from 'react';
import { theme } from '../../theme';

interface PasswordModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    onConfirm: (password: string) => void;
    onCancel: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(password);
        setPassword('');
    };

    const handleCancel = () => {
        setPassword('');
        onCancel();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}
            onClick={handleCancel}
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
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
            >
                <h2 style={{
                    margin: 0,
                    marginBottom: '0.5rem',
                    fontSize: '1.25rem',
                    color: theme.colors.text.primary,
                    fontWeight: 600
                }}>
                    {title}
                </h2>

                {message && (
                    <p style={{
                        margin: '0 0 1rem 0',
                        color: theme.colors.text.secondary,
                        fontSize: '0.9rem',
                        lineHeight: '1.5'
                    }}>
                        {message}
                    </p>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite a senha..."
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.borderRadius.md,
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none',
                            marginBottom: '1rem',
                            boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                        onBlur={(e) => e.target.style.borderColor = theme.colors.border}
                    />

                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end'
                    }}>
                        <button
                            type="button"
                            onClick={handleCancel}
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
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!password.trim()}
                            style={{
                                padding: '0.6rem 1.5rem',
                                borderRadius: theme.borderRadius.md,
                                border: 'none',
                                background: password.trim() ? theme.colors.primary : 'rgba(99, 102, 241, 0.3)',
                                color: 'white',
                                cursor: password.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;
