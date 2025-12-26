import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { Course } from '../types';
import { theme } from '../theme';
import { convertToImageLink } from '../services/driveUtils';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { FaChevronLeft, FaPlayCircle, FaCheckCircle, FaChevronDown, FaChevronUp, FaLock } from 'react-icons/fa';
import { MdQuiz } from 'react-icons/md';

interface CourseDetailProps {
    courses: Course[];
}

const CourseDetail: React.FC<CourseDetailProps> = ({ courses }) => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const course = courses.find(c => c.id === courseId);

    // Accordion State - persistent
    const STORAGE_KEY = `expanded_modules_${courseId}`;
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    });

    const [watchedLessons, setWatchedLessons] = useState<string[]>([]);
    const [activityScores, setActivityScores] = useState<Record<string, { score: number, total: number }>>({});

    const loadWatched = () => {
        const savedWatched = localStorage.getItem('watched_lessons');
        if (savedWatched) setWatchedLessons(JSON.parse(savedWatched));

        const savedScores = localStorage.getItem('activity_scores');
        if (savedScores) setActivityScores(JSON.parse(savedScores));
    };

    useEffect(() => {
        loadWatched();
        // Refresh when window/app gains focus (to catch updates from other components)
        window.addEventListener('focus', loadWatched);
        return () => window.removeEventListener('focus', loadWatched);
    }, [courseId]);

    // Handle Android Back Button
    useEffect(() => {
        const handleBackButton = App.addListener('backButton', () => {
            navigate('/', { replace: true });
        });

        return () => {
            handleBackButton.then((h: any) => h.remove());
        };
    }, [navigate]);

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => {
            const isCurrentlyExpanded = !!prev[moduleId];
            // If already expanded, close it. If not, open only this one.
            const newState = isCurrentlyExpanded ? {} : { [moduleId]: true };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            return newState;
        });
    };

    if (!course) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Curso não encontrado.</div>;
    }

    return (
        <div style={{ paddingBottom: '4rem' }}>
            {/* Header / Hero for Course */}
            <div style={{
                position: 'relative',
                height: '240px',
                width: '100%',
                overflow: 'hidden'
            }}>
                {course.imageUrl && (
                    <img
                        src={convertToImageLink(course.imageUrl)}
                        alt={course.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                )}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.5) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '1.5rem'
                }}>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/', { replace: true })}
                        style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '0.5rem' }}
                    >
                        <FaChevronLeft />
                    </Button>
                    <h1 style={{ fontSize: '1.8rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '0.25rem' }}>
                        {course.title}
                    </h1>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ color: theme.colors.text.secondary, fontSize: '0.85rem' }}>
                            {course.modules.length} Módulos
                        </span>
                        <span style={{
                            background: theme.colors.primary,
                            padding: '0.15rem 0.6rem',
                            borderRadius: theme.borderRadius.full,
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}>
                            {(() => {
                                const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.filter(l => !l.activity).length, 0);
                                const totalActivities = course.modules.reduce((acc, m) => acc + m.lessons.filter(l => !!l.activity).length, 0);
                                return `${totalLessons} Aulas${totalActivities > 0 ? ` + ${totalActivities} Atividades` : ''}`;
                            })()}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                {course.modules.length === 0 ? (
                    <p style={{ textAlign: 'center', color: theme.colors.text.secondary }}>Nenhum módulo disponível.</p>
                ) : (
                    course.modules.map((module, mIdx) => {
                        const isExpanded = !!expandedModules[module.id];
                        // Auto-numbering for Modules
                        const moduleTitle = /^\d/.test(module.title) ? module.title : `${mIdx + 1}. ${module.title}`;

                        return (
                            <div key={module.id} style={{ marginBottom: '1rem' }}>
                                <div
                                    onClick={() => toggleModule(module.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        backgroundColor: theme.colors.surface,
                                        borderRadius: theme.borderRadius.sm,
                                        cursor: 'pointer',
                                        borderLeft: `3px solid ${theme.colors.secondary}`
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                        <h2 style={{ fontSize: '1rem', color: theme.colors.text.primary, margin: 0 }}>
                                            {moduleTitle}
                                        </h2>
                                        {module.lessons.length > 0 && module.lessons.every(l => watchedLessons.includes(String(l.id))) && (
                                            <FaCheckCircle color={theme.colors.success} size={14} title="Módulo Concluído" />
                                        )}
                                    </div>
                                    <div style={{ color: theme.colors.text.secondary }}>
                                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {module.lessons.map((lesson, lIdx) => {
                                            const isWatched = watchedLessons.includes(String(lesson.id));
                                            // Auto-numbering for Lessons
                                            const lessonTitle = /^\d/.test(lesson.title) ? lesson.title : `${lIdx + 1}. ${lesson.title}`;

                                            // Determine if activity is locked: all VIDEO lessons in this MODULE must be watched
                                            const moduleVideoLessons = module.lessons.filter(l =>
                                                !!l.videoUrl && l.videoUrl.trim() !== "" && !l.activity
                                            );
                                            const allModuleVideosWatched = moduleVideoLessons.every(l => watchedLessons.includes(String(l.id)));
                                            const isLockedActivity = !!lesson.activity && !allModuleVideosWatched;

                                            return (
                                                <Card
                                                    key={lesson.id}
                                                    onClick={() => !isLockedActivity && navigate(`/course/${course.id}/lesson/${lesson.id}`)}
                                                    style={{
                                                        padding: '0.75rem 1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        cursor: isLockedActivity ? 'not-allowed' : 'pointer',
                                                        background: isLockedActivity ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                                                        borderRadius: theme.borderRadius.sm,
                                                        border: `1px solid ${isLockedActivity ? 'transparent' : theme.colors.border}`,
                                                        opacity: isLockedActivity ? 0.5 : 1
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '32px', height: '32px',
                                                        borderRadius: '50%',
                                                        backgroundColor: isLockedActivity ? 'rgba(255,255,255,0.05)' : (isWatched ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {isLockedActivity ? (
                                                            <FaLock color={theme.colors.text.muted} size={14} />
                                                        ) : (
                                                            isWatched ? (
                                                                <FaCheckCircle color={theme.colors.success} size={16} />
                                                            ) : (
                                                                lesson.activity ? <MdQuiz color={theme.colors.secondary} size={18} /> : <FaPlayCircle color={theme.colors.primary} size={16} />
                                                            )
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: isWatched ? theme.colors.text.secondary : 'white' }}>{lessonTitle}</span>
                                                        {lesson.activity && <span style={{ fontSize: '0.7rem', color: theme.colors.secondary, display: 'block', fontWeight: 600 }}>ATIVIDADE</span>}
                                                    </div>
                                                    {isLockedActivity && (
                                                        <span style={{ fontSize: '0.65rem', color: theme.colors.text.muted, fontWeight: 700, textAlign: 'right' }}>
                                                            BLOQUEADA<br />
                                                            {moduleVideoLessons.filter(l => watchedLessons.includes(String(l.id))).length}/{moduleVideoLessons.length} vídeos
                                                        </span>
                                                    )}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {isWatched && lesson.activity && activityScores[lesson.id] && (
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: activityScores[lesson.id].score === activityScores[lesson.id].total ? theme.colors.success : theme.colors.secondary,
                                                                fontWeight: 700,
                                                                background: 'rgba(255,255,255,0.05)',
                                                                padding: '0.1rem 0.4rem',
                                                                borderRadius: '4px'
                                                            }}>
                                                                {activityScores[lesson.id].score}/{activityScores[lesson.id].total}
                                                            </span>
                                                        )}
                                                        {isWatched && <span style={{ fontSize: '0.7rem', color: theme.colors.success, fontWeight: 700 }}>OK</span>}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CourseDetail;
