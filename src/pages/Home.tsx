import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '../types';
import { theme } from '../theme';
import Card from '../components/UI/Card';
import { FaPlay, FaCrown, FaLock, FaUnlock, FaHeart, FaRegHeart } from 'react-icons/fa';
import { convertToImageLink } from '../services/driveUtils';
import PasswordModal from '../components/UI/PasswordModal';

interface HomeProps {
    courses: Course[];
    onRefresh: () => Promise<any>;
}

const Home: React.FC<HomeProps> = ({ courses, onRefresh }) => {
    const navigate = useNavigate();
    const [userName, setUserName] = React.useState(() => localStorage.getItem('user_name') || '');
    const [isEditingName, setIsEditingName] = React.useState(() => !localStorage.getItem('user_name'));
    const [showToast, setShowToast] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');

    // Pull to Refresh State
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const touchStartRef = React.useRef(0);
    const isAtTopRef = React.useRef(true);

    // VIP Mode State
    const [isVipMode, setIsVipMode] = useState(() => localStorage.getItem('is_vip_mode') === 'true');
    const [showVipModal, setShowVipModal] = useState(false);

    // Favorites State
    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('favorite_courses');
        return saved ? JSON.parse(saved) : [];
    });

    const toggleFavorite = (e: React.MouseEvent, courseId: string) => {
        e.stopPropagation();
        setFavorites(prev => {
            const isFav = prev.includes(courseId);
            const newFavs = isFav ? prev.filter(id => id !== courseId) : [...prev, courseId];
            localStorage.setItem('favorite_courses', JSON.stringify(newFavs));
            triggerToast(isFav ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
            return newFavs;
        });
    };

    const getCourseProgress = (course: Course) => {
        const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
        let totalLessons = 0;
        let watchedCount = 0;

        course.modules.forEach(m => {
            if (m.lessons) {
                m.lessons.forEach(l => {
                    totalLessons++;
                    if (watchedList.includes(String(l.id))) {
                        watchedCount++;
                    }
                });
            }
        });

        if (totalLessons === 0) return 0;
        return Math.round((watchedCount / totalLessons) * 100);
    };

    const toggleVipMode = () => {
        if (isVipMode) {
            // Exit VIP
            setIsVipMode(false);
            localStorage.setItem('is_vip_mode', 'false');
        } else {
            // Enter VIP - show modal
            setShowVipModal(true);
        }
    };

    const handleVipPasswordSubmit = (password: string) => {
        if (password === '.') {
            setIsVipMode(true);
            localStorage.setItem('is_vip_mode', 'true');
            setShowVipModal(false);
            triggerToast('Modo VIP Ativado');
        } else {
            alert('Senha incorreta.');
        }
    };

    const handleSaveName = () => {
        if (!userName.trim()) return;
        localStorage.setItem('user_name', userName);
        setIsEditingName(false);
        setToastMessage('Nome salvo');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };


    // Pull to Refresh Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY <= 0) {
            isAtTopRef.current = true;
            touchStartRef.current = e.touches[0].clientY;
        } else {
            isAtTopRef.current = false;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isAtTopRef.current || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartRef.current;

        if (diff > 0) {
            // Pulling down
            const distance = Math.min(diff * 0.5, 120); // Resistance
            setPullDistance(distance);
        }
    };

    const handleTouchEnd = async () => {
        if (isRefreshing) return;

        if (pullDistance > 80) {
            setIsRefreshing(true);
            setPullDistance(60); // Keep indicator visible

            try {
                await onRefresh();
                triggerToast('App atualizado');
            } catch (err) {
                console.error(err);
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    };

    const displayedCourses = courses.filter(c => isVipMode || !c.isVip);

    const sortedCourses = [...displayedCourses].sort((a, b) => {
        const isAFav = favorites.includes(a.id);
        const isBFav = favorites.includes(b.id);
        if (isAFav && !isBFav) return -1;
        if (!isAFav && isBFav) return 1;
        return 0;
    });

    return (
        <>
            <PasswordModal
                isOpen={showVipModal}
                title="Acesso VIP"
                message="Digite a senha para acessar os cursos VIP."
                onConfirm={handleVipPasswordSubmit}
                onCancel={() => setShowVipModal(false)}
            />

            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ paddingBottom: '2rem', position: 'relative' }}
            >
                {/* Refresh Indicator */}
                <div style={{
                    height: `${pullDistance}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: isRefreshing ? 'none' : 'height 0.2s',
                    background: 'rgba(99, 102, 241, 0.05)',
                    color: theme.colors.primary,
                    fontSize: '0.8rem',
                    fontWeight: 600
                }}>
                    <div style={{
                        transform: `rotate(${pullDistance * 3}deg)`,
                        transition: isRefreshing ? 'none' : 'transform 0.1s'
                    }}>
                        {isRefreshing ? '🔄 Atualizando...' : '↓ Solte para atualizar'}
                    </div>
                </div>
                {/* Hero Section */}
                <div style={{
                    background: `linear-gradient(to bottom, rgba(99, 102, 241, 0.15), ${theme.colors.background})`,
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    marginBottom: '1.5rem',
                    position: 'relative'
                }}>
                    {/* VIP Toggle Button */}
                    <button
                        onClick={toggleVipMode}
                        style={{
                            position: 'absolute', top: '1rem', left: '1rem',
                            background: 'transparent', border: 'none',
                            color: isVipMode ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '0.5rem'
                        }}
                        title={isVipMode ? "Sair do modo VIP" : "Acesso VIP"}
                    >
                        {isVipMode ? <FaUnlock size={14} /> : <FaLock size={14} />}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>VIP</span>
                    </button>

                    <h1 style={{
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        background: theme.colors.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem'
                    }}>
                        Aprenda sem Limites
                    </h1>

                    {/* User Name Section */}
                    <div style={{ margin: '1rem auto', maxWidth: '300px', minHeight: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {isEditingName ? (
                            <div style={{ display: 'flex', gap: '8px', width: '100%', animation: 'fadeIn 0.3s' }}>
                                <input
                                    type="text"
                                    placeholder="Seu nome..."
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.1)',
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: '20px',
                                        padding: '0.5rem 1rem',
                                        color: 'white',
                                        textAlign: 'center',
                                        outline: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={!userName.trim()}
                                    style={{
                                        background: theme.colors.primary,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '20px',
                                        padding: '0 1rem',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        opacity: userName.trim() ? 1 : 0.5
                                    }}
                                >
                                    OK
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsEditingName(true)}
                                title="Clique para editar"
                                style={{
                                    color: theme.colors.text.primary,
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Olá, {userName} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>✎</span>
                            </div>
                        )}
                    </div>

                    {/* Toast Message */}
                    {showToast && (
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.8)',
                            color: theme.colors.success,
                            padding: '0.3rem 0.8rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            animation: 'fadeInOut 3s forwards',
                            zIndex: 1000,
                            whiteSpace: 'nowrap'
                        }}>
                            {toastMessage}
                        </div>
                    )}

                    <p style={{
                        color: theme.colors.text.secondary,
                        maxWidth: '600px',
                        margin: '0 auto',
                        fontSize: '0.92rem'
                    }}>
                        Acesse seus cursos favoritos e evolua seu conhecimento a qualquer hora.
                    </p>
                </div>

                <div style={{ padding: '0 1rem' }}>
                    <h2 style={{
                        color: theme.colors.text.primary,
                        marginBottom: '1rem',
                        fontSize: '1.2rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        Meus Cursos
                        {isVipMode && <FaCrown size={18} color="#fbbf24" title="Você é VIP" />}
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '1rem',
                    }}>
                        {sortedCourses.map(course => {
                            const isFav = favorites.includes(course.id);
                            const progress = getCourseProgress(course);

                            return (
                                <Card
                                    key={course.id}
                                    className="course-card"
                                    onClick={() => navigate(`/course/${course.id}`)}
                                    style={{
                                        padding: 0,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: isFav ? `1px solid ${theme.colors.primary}` : (course.isVip ? '1px solid #fbbf24' : `1px solid ${theme.colors.border}`),
                                        boxShadow: isFav ? theme.shadows.glow : (course.isVip ? '0 0 10px rgba(251, 191, 36, 0.1)' : theme.shadows.sm),
                                        position: 'relative'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-6px)';
                                        e.currentTarget.style.borderColor = theme.colors.primary;
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.borderColor = isFav ? theme.colors.primary : (course.isVip ? '#fbbf24' : theme.colors.border);
                                    }}
                                >
                                    {/* Favorite Button */}
                                    <button
                                        onClick={(e) => toggleFavorite(e, course.id)}
                                        style={{
                                            position: 'absolute', top: '8px', left: '8px', zIndex: 10,
                                            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                                            border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: isFav ? theme.colors.secondary : 'white',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {isFav ? <FaHeart size={16} /> : <FaRegHeart size={16} />}
                                    </button>

                                    {/* Image Container */}
                                    <div style={{
                                        width: '100%',
                                        aspectRatio: '1/1',
                                        position: 'relative',
                                        backgroundColor: theme.colors.surfaceHighlight,
                                        overflow: 'hidden'
                                    }}>
                                        {course.imageUrl ? (
                                            <img
                                                src={convertToImageLink(course.imageUrl)}
                                                alt={course.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    transition: 'transform 0.5s ease'
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: theme.colors.text.secondary
                                            }}>
                                                Sem Arte
                                            </div>
                                        )}

                                        {/* Overlay Play Icon */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            background: 'rgba(0,0,0,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                            pointerEvents: 'none' // Allow click to pass through to Card
                                        }}
                                            className="play-overlay"
                                        >
                                            <div style={{
                                                background: 'rgba(255,255,255,0.2)',
                                                backdropFilter: 'blur(4px)',
                                                borderRadius: '50%',
                                                width: '50px', height: '50px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <FaPlay color="white" />
                                            </div>
                                        </div>

                                        {/* VIP Badge on Card */}
                                        {course.isVip && (
                                            <div style={{
                                                position: 'absolute', top: 5, right: 5,
                                                background: '#fbbf24', color: 'black',
                                                padding: '2px 6px', borderRadius: '4px',
                                                fontSize: '0.6rem', fontWeight: 'bold', zIndex: 10
                                            }}>
                                                VIP
                                            </div>
                                        )}

                                    </div>

                                    <div style={{ padding: '0.8rem' }}>
                                        <h3 style={{
                                            margin: '0 0 0.4rem 0',
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {course.title}
                                        </h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: theme.colors.text.secondary }}>
                                                {course.modules.length} Módulos
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: progress === 100 ? theme.colors.success : theme.colors.text.primary, fontWeight: 700 }}>
                                                {progress}%
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{
                                            width: '100%', height: '4px',
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                            borderRadius: '2px', overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${progress}%`, height: '100%',
                                                background: progress === 100 ? theme.colors.success : theme.colors.primary,
                                                transition: 'width 0.5s ease-out'
                                            }} />
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {displayedCourses.length === 0 && (
                        <div style={{ textAlign: 'center', color: theme.colors.text.secondary, marginTop: '4rem' }}>
                            <p>Nenhum curso encontrado.</p>
                            {courses.length > 0 && !isVipMode && (
                                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Alguns cursos são exclusivos para VIPs.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, 20px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }
                .course-card:hover .play-overlay {
                    opacity: 1 !important;
                }
                .course-card:hover img {
                    transform: scale(1.1);
                }
            `}</style>
        </>
    );
};

export default Home;
