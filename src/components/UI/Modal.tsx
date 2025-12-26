import React from 'react';
import { theme } from '../../theme';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#1E1E1E', // Solid bg for modal to avoid too much transparency issues
                border: `1px solid ${theme.colors.border}`,
                width: '95%',
                maxWidth: '600px',
                maxHeight: '90vh',
                borderRadius: theme.borderRadius.lg,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: theme.shadows.md,
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '1rem',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {title && <h2 style={{ margin: 0, fontSize: theme.typography.sizes.h3 }}>{title}</h2>}
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: theme.colors.text.secondary,
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                        }}
                    >
                        <FaTimes />
                    </button>
                </div>
                <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
