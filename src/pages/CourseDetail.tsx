import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { Course, Question } from '../types';
import { theme } from '../theme';
import { convertToImageLink } from '../services/driveUtils';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { FaChevronLeft, FaPlayCircle, FaCheckCircle, FaChevronDown, FaChevronUp, FaLock, FaFileAlt, FaSearch, FaTimes, FaTrophy, FaExclamationCircle } from 'react-icons/fa';
import { MdQuiz } from 'react-icons/md';

interface CourseDetailProps {
    courses: Course[];
    isAdmin?: boolean;
}

interface ShuffledQuestion extends Question {
    shuffledOptions: string[];
    originalCorrectOption: string;
}

const CourseDetail: React.FC<CourseDetailProps> = ({ courses, isAdmin }) => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const course = courses.find(c => c.id === courseId);

    const [searchQuery, setSearchQuery] = useState('');
    const [showSpecialExam, setShowSpecialExam] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchInNotes, setSearchInNotes] = useState(true);

    // Exam States
    const [currentExamQuestions, setCurrentExamQuestions] = useState<ShuffledQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
    const [examFinished, setExamFinished] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

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
        window.addEventListener('focus', loadWatched);
        return () => window.removeEventListener('focus', loadWatched);
    }, [courseId]);

    useEffect(() => {
        const handleBackButton = App.addListener('backButton', () => {
            navigate('/', { replace: true });
        });
        return () => {
            handleBackButton.then((h: any) => h.remove());
        };
    }, [navigate]);

    // Close search when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                // Check if the click wasn't on the toggle button
                const toggleBtn = document.getElementById('search-toggle-btn');
                if (toggleBtn && toggleBtn.contains(event.target as Node)) return;

                setShowSearch(false);
            }
        };

        if (showSearch) {
            document.addEventListener('mousedown', handleClickOutside);
            // Auto focus input
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSearch]);

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => {
            const isCurrentlyExpanded = !!prev[moduleId];
            const newState = isCurrentlyExpanded ? {} : { [moduleId]: true };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            return newState;
        });
    };

    if (!course) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: theme.colors.text.secondary }}>Curso não encontrado.</div>;
    }

    const filteredModules = (course.modules || []).map(m => ({
        ...m,
        lessons: (m.lessons || []).filter(l => {
            const query = searchQuery.toLowerCase();
            const inBasic = l.title.toLowerCase().includes(query) ||
                (l.description && l.description.toLowerCase().includes(query));

            if (inBasic) return true;

            if (searchInNotes && searchQuery.length > 1) {
                const notesKey = `note_tabs_${courseId}_${l.id}`;
                const savedNotes = localStorage.getItem(notesKey);
                if (savedNotes) {
                    try {
                        const tabs = JSON.parse(savedNotes);
                        return tabs.some((tab: any) =>
                            tab.title.toLowerCase().includes(query) ||
                            tab.content.toLowerCase().includes(query)
                        );
                    } catch (e) {
                        return false;
                    }
                }
            }
            return false;
        })
    })).filter(m => m.lessons.length > 0 || m.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleStartExam = () => {
        if (!course.examPool || course.examPool.length === 0) {
            alert('Organizando banco de questões...');
            return;
        }

        // True random shuffle for questions
        const shuffledPool = [...course.examPool].sort(() => Math.random() - 0.5);
        const selected = shuffledPool.slice(0, 15).map(q => {
            const originalCorrect = q.options[q.correctOptionIndex];
            // Shuffle options
            const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
            return {
                ...q,
                shuffledOptions,
                originalCorrectOption: originalCorrect
            };
        });

        setCurrentExamQuestions(selected);
        setUserAnswers({});
        setExamFinished(false);
        setShowSpecialExam(true);
    };

    const handleSelectOption = (questionId: string, optionIndex: number) => {
        if (examFinished) return;
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: optionIndex
        }));

        // Auto-scroll to next question
        const currentIndex = currentExamQuestions.findIndex(q => q.id === questionId);
        if (currentIndex < currentExamQuestions.length - 1) {
            const nextQuestion = currentExamQuestions[currentIndex + 1];
            setTimeout(() => {
                const el = document.getElementById(`exam-q-${nextQuestion.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    };

    const finishExam = () => {
        setExamFinished(true);
        // Deslocar scroll para o topo do modal
        const container = document.getElementById('exam-scroll-container');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const calculateResult = () => {
        let correct = 0;
        currentExamQuestions.forEach(q => {
            const userIndex = userAnswers[q.id];
            if (userIndex !== undefined) {
                const userChoice = q.shuffledOptions[userIndex];
                if (userChoice === q.originalCorrectOption) {
                    correct++;
                }
            }
        });
        return {
            correct,
            total: currentExamQuestions.length,
            wrong: currentExamQuestions.length - correct
        };
    };

    const results = calculateResult();

    return (
        <div style={{ paddingBottom: '4rem', background: theme.colors.background, minHeight: '100vh' }}>
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
                    background: `linear-gradient(to top, ${theme.colors.background} 0%, rgba(10,10,10,0.5) 100%)`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '1.5rem'
                }}>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/', { replace: true })}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            left: '1rem',
                            color: theme.colors.text.primary,
                            background: 'rgba(0,0,0,0.5)',
                            padding: '0.5rem',
                            borderRadius: theme.borderRadius.sm,
                            backdropFilter: theme.backdropFilter
                        }}
                    >
                        <FaChevronLeft />
                    </Button>

                    {/* Header Icons Container - Shoved to the left to clear the gear icon */}
                    <div style={{
                        position: 'absolute',
                        top: '0.8rem',
                        right: '3.5rem',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                        <button
                            id="search-toggle-btn"
                            onClick={() => setShowSearch(!showSearch)}
                            style={{
                                background: 'rgba(0,0,0,0.5)',
                                color: theme.colors.text.primary,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.borderRadius.sm,
                                padding: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                                backdropFilter: theme.backdropFilter
                            }}
                        >
                            <FaSearch size={14} />
                        </button>

                        {isAdmin && (
                            <button
                                onClick={() => navigate(`/admin/exams/${courseId}`)}
                                style={{
                                    background: `rgba(99, 102, 241, 0.2)`,
                                    color: theme.colors.primary,
                                    border: `1px solid rgba(99, 102, 241, 0.4)`,
                                    borderRadius: theme.borderRadius.sm,
                                    padding: '0.5rem 0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backdropFilter: theme.backdropFilter
                                }}
                            >
                                <FaFileAlt size={14} /> Gerenciar Prova
                            </button>
                        )}

                        {course.examEnabled && (
                            <button
                                onClick={handleStartExam}
                                style={{
                                    background: `rgba(236, 72, 153, 0.2)`,
                                    color: theme.colors.secondary,
                                    border: `1px solid rgba(236, 72, 153, 0.4)`,
                                    borderRadius: theme.borderRadius.sm,
                                    padding: '0.5rem 0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backdropFilter: theme.backdropFilter
                                }}
                            >
                                <MdQuiz size={16} /> Prova Especial
                            </button>
                        )}
                    </div>

                    <h1 style={{
                        fontSize: theme.typography.sizes.h3,
                        color: theme.colors.text.primary,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        marginBottom: '0.25rem',
                        fontWeight: theme.typography.weights.bold
                    }}>
                        {course.title}
                    </h1>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ color: theme.colors.text.secondary, fontSize: theme.typography.sizes.small }}>
                            {course.modules.length} Módulos
                        </span>
                        <span style={{
                            background: theme.colors.primary,
                            padding: '0.15rem 0.6rem',
                            borderRadius: theme.borderRadius.full,
                            fontSize: '0.75rem',
                            fontWeight: theme.typography.weights.bold
                        }}>
                            {(() => {
                                const totalLessons = course.modules.reduce((acc, m) => acc + (m.lessons ? m.lessons.filter(l => !l.activity).length : 0), 0);
                                const totalActivities = course.modules.reduce((acc, m) => acc + (m.lessons ? m.lessons.filter(l => !!l.activity).length : 0), 0);
                                return `${totalLessons} Aulas${totalActivities > 0 ? ` + ${totalActivities} Atividades` : ''}`;
                            })()}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>

                {/* Global Search Bar - Animated Toggle */}
                <div
                    ref={searchRef}
                    style={{
                        maxHeight: showSearch ? '100px' : '0px',
                        overflow: 'hidden',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        marginBottom: showSearch ? '1.5rem' : '0',
                        opacity: showSearch ? 1 : 0,
                        position: 'relative'
                    }}
                >
                    <div style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        color: theme.colors.text.muted, opacity: 0.8
                    }}>
                        <FaSearch size={14} />
                    </div>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Pesquisar aulas ou módulos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: theme.colors.surfaceHighlight,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.borderRadius.sm,
                            padding: '0.8rem 1rem 0.8rem 2.8rem',
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.sizes.body,
                            outline: 'none',
                            transition: 'all 0.3s',
                            fontFamily: theme.typography.fontFamily
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', color: theme.colors.text.muted, cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <FaTimes size={14} />
                        </button>
                    )}
                </div>

                {showSearch && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '1rem',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: searchInNotes ? theme.colors.primary : theme.colors.text.secondary,
                            background: 'rgba(255,255,255,0.03)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: `1px solid ${searchInNotes ? theme.colors.primary + '40' : 'rgba(255,255,255,0.1)'}`,
                            transition: 'all 0.3s'
                        }}>
                            <input
                                type="checkbox"
                                checked={searchInNotes}
                                onChange={(e) => setSearchInNotes(e.target.checked)}
                                style={{
                                    accentColor: theme.colors.primary,
                                    width: '14px',
                                    height: '14px'
                                }}
                            />
                            Pesquisar dentro das minhas notas
                        </label>
                    </div>
                )}

                {filteredModules.length === 0 ? (
                    <p style={{ textAlign: 'center', color: theme.colors.text.secondary }}>Nenhum resultado encontrado para "{searchQuery}".</p>
                ) : (
                    filteredModules.map((module, mIdx) => {
                        const isExpanded = !!expandedModules[module.id] || searchQuery.length > 0;
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
                                        borderLeft: `3px solid ${theme.colors.secondary}`,
                                        backdropFilter: theme.backdropFilter,
                                        boxShadow: theme.shadows.sm
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                        <h2 style={{ fontSize: '1rem', color: theme.colors.text.primary, margin: 0, fontWeight: theme.typography.weights.medium }}>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
                                        {module.lessons.map((lesson, lIdx) => {
                                            const isWatched = watchedLessons.includes(String(lesson.id));
                                            const lessonTitle = /^\d/.test(lesson.title) ? lesson.title : `${lIdx + 1}. ${lesson.title}`;

                                            const moduleVideoLessons = module.lessons.filter(l =>
                                                !!l.videoUrl && l.videoUrl.trim() !== "" && !l.activity
                                            );
                                            const allModuleVideosWatched = moduleVideoLessons.every(l => watchedLessons.includes(String(l.id)));
                                            const isLockedActivity = !!lesson.activity && !allModuleVideosWatched;

                                            const isLibraryLesson = (!lesson.videoUrl || lesson.videoUrl.trim() === "") && lesson.contents && lesson.contents.length > 0 && !lesson.activity;
                                            return (
                                                <Card
                                                    key={lesson.id}
                                                    onClick={() => !isLockedActivity && navigate(`/course/${course.id}/lesson/${lesson.id}`)}
                                                    style={{
                                                        padding: '0.8rem 1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        cursor: isLockedActivity ? 'not-allowed' : 'pointer',
                                                        background: isLockedActivity ? 'rgba(255,255,255,0.01)' : theme.colors.surfaceHighlight,
                                                        borderRadius: theme.borderRadius.sm,
                                                        border: `1px solid ${isLockedActivity ? 'transparent' : theme.colors.border}`,
                                                        opacity: isLockedActivity ? 0.6 : 1,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '36px', height: '36px',
                                                        borderRadius: theme.borderRadius.full,
                                                        backgroundColor: (isLockedActivity || isLibraryLesson) ? 'rgba(255,255,255,0.05)' : (isWatched ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {(isLockedActivity || isLibraryLesson) ? (
                                                            isLockedActivity ? <FaLock color={theme.colors.text.muted} size={14} /> : <FaFileAlt color={theme.colors.primary} size={16} />
                                                        ) : (
                                                            isWatched ? (
                                                                <FaCheckCircle color={theme.colors.success} size={16} />
                                                            ) : (
                                                                lesson.activity ? (
                                                                    <MdQuiz color={theme.colors.secondary} size={18} />
                                                                ) : (
                                                                    <FaPlayCircle color={theme.colors.primary} size={18} />
                                                                )
                                                            )
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: theme.typography.weights.medium,
                                                            color: isWatched ? theme.colors.text.secondary : theme.colors.text.primary
                                                        }}>{lessonTitle}</span>
                                                        {lesson.activity ? (
                                                            <span style={{ fontSize: '0.7rem', color: theme.colors.secondary, display: 'block', fontWeight: theme.typography.weights.bold }}>ATIVIDADE</span>
                                                        ) : (!lesson.videoUrl || lesson.videoUrl.trim() === "") && lesson.contents && lesson.contents.length > 0 ? (
                                                            <span style={{ fontSize: '0.7rem', color: theme.colors.primary, display: 'block', fontWeight: theme.typography.weights.bold }}>BIBLIOTECA / APOIO</span>
                                                        ) : null}
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
                                                                fontWeight: theme.typography.weights.bold,
                                                                background: 'rgba(255,255,255,0.05)',
                                                                padding: '0.1rem 0.5rem',
                                                                borderRadius: '4px'
                                                            }}>
                                                                {activityScores[lesson.id].score}/{activityScores[lesson.id].total}
                                                            </span>
                                                        )}
                                                        {isWatched && !isLibraryLesson && <span style={{ fontSize: '0.75rem', color: theme.colors.success, fontWeight: theme.typography.weights.bold }}>OK</span>}
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

            {/* Special Exam Modal/Overlay */}
            {showSpecialExam && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                    backdropFilter: 'blur(15px)',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.2rem 1.5rem',
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Prova Especial</h2>
                            <p style={{ color: theme.colors.text.secondary, fontSize: '0.75rem', margin: 0 }}>
                                {!examFinished ? `Questão ${Object.keys(userAnswers).length} de ${currentExamQuestions.length}` : 'Relatório de Avaliação'}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSpecialExam(false)}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>

                    <div id="exam-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1rem' }}>
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                            {!examFinished ? (
                                <>
                                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                        <div style={{
                                            width: '50px', height: '50px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 0.8rem auto',
                                            boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)'
                                        }}>
                                            <MdQuiz size={24} color="white" />
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Avaliação em Curso</h3>
                                        <p style={{ color: theme.colors.text.secondary, fontSize: '0.8rem', marginTop: '0.3rem' }}>
                                            As respostas e opções foram aleatorizadas.
                                        </p>
                                    </div>

                                    {currentExamQuestions.map((q, idx) => (
                                        <Card key={q.id} id={`exam-q-${q.id}`} style={{
                                            marginBottom: '1rem',
                                            padding: '1.2rem',
                                            background: theme.colors.surface,
                                            border: `1px solid ${userAnswers[q.id] !== undefined ? theme.colors.primary + '50' : theme.colors.border}`,
                                            borderRadius: theme.borderRadius.md,
                                            boxShadow: userAnswers[q.id] !== undefined ? `0 0 15px ${theme.colors.primary}15` : 'none',
                                            transition: 'all 0.3s'
                                        }}>
                                            <p style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.5', color: 'white' }}>
                                                {idx + 1}. {q.question}
                                            </p>
                                            <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                {q.shuffledOptions.map((opt, optIdx) => {
                                                    const isSelected = userAnswers[q.id] === optIdx;
                                                    return (
                                                        <button
                                                            key={optIdx}
                                                            onClick={() => handleSelectOption(q.id, optIdx)}
                                                            style={{
                                                                padding: '0.8rem 1rem',
                                                                borderRadius: theme.borderRadius.sm,
                                                                background: isSelected ? `${theme.colors.primary}15` : 'rgba(255,255,255,0.03)',
                                                                border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                                                                color: isSelected ? 'white' : theme.colors.text.primary,
                                                                textAlign: 'left',
                                                                fontSize: '0.85rem',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                fontWeight: isSelected ? 600 : 400,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '18px', height: '18px', borderRadius: '50%',
                                                                border: `2px solid ${isSelected ? theme.colors.primary : theme.colors.text.muted}`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0,
                                                                background: isSelected ? theme.colors.primary : 'transparent'
                                                            }}>
                                                                {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                                                            </div>
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    ))}

                                    <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                                        <Button
                                            fullWidth
                                            variant="primary"
                                            onClick={finishExam}
                                            disabled={Object.keys(userAnswers).length < currentExamQuestions.length}
                                            style={{
                                                padding: '1rem',
                                                fontWeight: 800,
                                                boxShadow: theme.shadows.glow,
                                                opacity: Object.keys(userAnswers).length < currentExamQuestions.length ? 0.5 : 1
                                            }}
                                        >
                                            Finalizar e Ver Resultado
                                        </Button>
                                        {Object.keys(userAnswers).length < currentExamQuestions.length && (
                                            <p style={{ fontSize: '0.7rem', color: theme.colors.text.muted, marginTop: '0.8rem' }}>
                                                Responda todas as {currentExamQuestions.length} questões para finalizar.
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Result Section */
                                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '2rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: theme.borderRadius.lg,
                                        border: `1px solid ${theme.colors.border}`,
                                        marginBottom: '2rem'
                                    }}>
                                        <FaTrophy size={50} color={results.correct > results.total / 2 ? '#fbbf24' : theme.colors.text.muted} style={{ marginBottom: '1rem' }} />
                                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.5rem 0' }}>{Math.round((results.correct / results.total) * 100)}%</h2>
                                        <p style={{ color: theme.colors.text.secondary, fontSize: '1rem' }}>
                                            Você acertou <b>{results.correct}</b> de <b>{results.total}</b> questões.
                                        </p>

                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
                                            <div>
                                                <div style={{ color: theme.colors.success, fontSize: '1.2rem', fontWeight: 800 }}>{results.correct}</div>
                                                <div style={{ fontSize: '0.7rem', color: theme.colors.text.muted, textTransform: 'uppercase' }}>Acertos</div>
                                            </div>
                                            <div>
                                                <div style={{ color: theme.colors.danger, fontSize: '1.2rem', fontWeight: 800 }}>{results.wrong}</div>
                                                <div style={{ fontSize: '0.7rem', color: theme.colors.text.muted, textTransform: 'uppercase' }}>Erros</div>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Relatório Detalhado</h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {currentExamQuestions.map((q, idx) => {
                                            const userIdx = userAnswers[q.id];
                                            const userChoice = q.shuffledOptions[userIdx];
                                            const isCorrect = userChoice === q.originalCorrectOption;

                                            return (
                                                <div key={q.id} style={{
                                                    padding: '1rem',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    borderRadius: theme.borderRadius.md,
                                                    borderLeft: `4px solid ${isCorrect ? theme.colors.success : theme.colors.danger}`
                                                }}>
                                                    <p style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.8rem', opacity: 0.9 }}>
                                                        {idx + 1}. {q.question}
                                                    </p>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '8px' }}>
                                                            <FaCheckCircle color={theme.colors.success} size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                            <span>Resposta Correta: <b style={{ color: theme.colors.success }}>{q.originalCorrectOption}</b></span>
                                                        </div>

                                                        {!isCorrect && (
                                                            <div style={{ fontSize: '0.8rem', display: 'flex', gap: '8px' }}>
                                                                <FaExclamationCircle color={theme.colors.danger} size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                <span>Sua Escolha: <b style={{ color: theme.colors.danger }}>{userChoice}</b></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ padding: '3rem 0 1rem 0', textAlign: 'center' }}>
                                        <Button fullWidth onClick={() => setShowSpecialExam(false)} style={{ padding: '1rem', fontWeight: 800 }}>
                                            Fechar Relatório
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CourseDetail;
