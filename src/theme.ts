export const theme = {
    colors: {
        background: '#0a0a0a', // Deep black as base
        pageBackground: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)', // Subtle deep purple/blue night sky gradient
        surface: 'rgba(20, 20, 30, 0.7)', // Slightly blue-tinted glass
        surfaceHighlight: 'rgba(255, 255, 255, 0.05)',
        primary: '#6366f1', // Indigo-500
        primaryHover: '#4f46e5',
        secondary: '#ec4899', // Pink-500
        text: {
            primary: '#ffffff',
            secondary: '#a1a1aa',
            muted: '#64748b'
        },
        danger: '#ef4444',
        success: '#10b981',
        border: 'rgba(255, 255, 255, 0.1)',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)'
    },
    typography: {
        fontFamily: '"Outfit", "Inter", system-ui, sans-serif', // More modern font stack
        sizes: {
            h1: '2.5rem',
            h2: '2rem',
            h3: '1.5rem',
            body: '1rem',
            small: '0.875rem'
        },
        weights: {
            normal: 400,
            medium: 500,
            bold: 700
        }
    },
    borderRadius: {
        sm: '0.5rem',
        md: '1rem', // Rounder corners for modern feel
        lg: '1.5rem',
        full: '9999px'
    },
    shadows: {
        sm: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px rgba(99, 102, 241, 0.5)'
    },
    backdropFilter: 'blur(12px)'
};
