import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { Course, Lesson } from '../types';
import { theme } from '../theme';
import { convertToDirectLink } from '../services/driveUtils';
import { correctAndOrganizeNotes } from '../services/aiService';
import { savePublicNote, getPublicNotes, type PublicNote, deletePublicNote } from '../services/dataService';
import { downloadVideo, deleteVideo, getLocalVideoUrl, isPlatformNative } from '../services/videoService';
import { checkPermissions } from '../services/permissions';
import Button from '../components/UI/Button';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import {
    FaChevronLeft, FaCheckCircle, FaRegCircle,
    FaMagic, FaStepBackward, FaStepForward, FaBold, FaItalic,
    FaUnderline, FaListUl, FaEraser, FaCloudUploadAlt, FaUsers,
    FaPlus, FaTimes, FaStickyNote, FaCopy, FaTrash, FaArrowDown, FaSpinner,
    FaToggleOn, FaToggleOff
} from 'react-icons/fa';

interface LessonViewProps {
    courses: Course[];
}

interface NoteTab {
    id: string;
    title: string;
    content: string;
}

const LessonView: React.FC<LessonViewProps> = ({ courses }) => {
    const { courseId, lessonId } = useParams<{ courseId: string, lessonId: string }>();
    const navigate = useNavigate();

    // Data State
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [lessonTitle, setLessonTitle] = useState('');
    const [prevLessonId, setPrevLessonId] = useState<string | null>(null);
    const [nextLessonId, setNextLessonId] = useState<string | null>(null);

    // Video State
    const [localVideoSrc, setLocalVideoSrc] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const isDownloadingRef = useRef(false);
    const [isSticky, setIsSticky] = useState(() => localStorage.getItem('video_sticky') !== 'false');
    const [videoHeight, setVideoHeight] = useState(() => {
        const saved = localStorage.getItem('video_height');
        return saved ? parseInt(saved) : 400;
    });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartY = useRef(0);
    const resizeStartHeight = useRef(400);

    // Notes State (Tabs)
    const TABS_KEY = `note_tabs_${courseId}_${lessonId}`;
    const [tabs, setTabs] = useState<NoteTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [showNoteToast, setShowNoteToast] = useState(false);
    const [isToolbarSticky, setIsToolbarSticky] = useState(() => localStorage.getItem('toolbar_sticky') !== 'false');

    // Community State
    const [showCommunity, setShowCommunity] = useState(false);
    const [publicNotes, setPublicNotes] = useState<PublicNote[]>([]);
    const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const currentUser = localStorage.getItem('user_name');

    // AI & Watched
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [isWatched, setIsWatched] = useState(() => {
        const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
        return watchedList.includes(String(lessonId));
    });
    const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showActivitySummary, setShowActivitySummary] = useState(false);
    const pageTimeRef = useRef(0); // Time spent on page in seconds

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
        isDestructive?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Editor Ref
    const editorRef = useRef<HTMLDivElement>(null);
    const currentContentRef = useRef('');

    // Find Data
    useEffect(() => {
        if (Array.isArray(courses)) {
            const course = courses.find(c => c.id === courseId);
            if (course && course.modules) {
                const allLessons: Lesson[] = [];
                course.modules.forEach(m => {
                    if (m.lessons) allLessons.push(...m.lessons);
                });

                let foundLesson: Lesson | undefined;
                let titleWithNumber = '';
                let lessonCounter = 0;
                for (const m of course.modules) {
                    if (m.lessons) {
                        for (const l of m.lessons) {
                            lessonCounter++;
                            if (l.id === lessonId) {
                                foundLesson = l;
                                titleWithNumber = /^\d/.test(l.title) ? l.title : `${lessonCounter}. ${l.title}`;
                                break;
                            }
                        }
                    }
                    if (foundLesson) break;
                }

                if (foundLesson) {
                    setLesson(foundLesson);
                    setLessonTitle(titleWithNumber);
                    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
                    setPrevLessonId(currentIndex > 0 ? allLessons[currentIndex - 1].id : null);
                    setNextLessonId(currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1].id : null);
                }
            }
        }
    }, [courses, courseId, lessonId]);

    // Reset watched state and timer when lesson changes
    useEffect(() => {
        const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
        setIsWatched(watchedList.includes(String(lessonId)));
        pageTimeRef.current = 0; // Reset timer
        setUserAnswers({});
        setCurrentQuestionIndex(0);
        setShowActivitySummary(false);
    }, [lessonId]);

    // Handle Android Back Button
    useEffect(() => {
        const handleBackButton = App.addListener('backButton', () => {
            navigate(`/course/${courseId}`, { replace: true });
        });

        return () => {
            handleBackButton.then((h: any) => h.remove());
        };
    }, [navigate, courseId]);

    // Check Local Video
    useEffect(() => {
        setLocalVideoSrc(null);
        if (lessonId && isPlatformNative()) {
            getLocalVideoUrl(lessonId).then(src => {
                if (src) setLocalVideoSrc(src);
            });
        }
    }, [lessonId]);

    // Track time on page and mark as watched after 2 minutes (for iframes)
    useEffect(() => {
        if (isWatched) return; // Already watched

        const interval = setInterval(() => {
            pageTimeRef.current += 1;
            // After 2 minutes (120 seconds) on page, mark as watched
            if (pageTimeRef.current >= 120 && !isWatched) {
                const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
                if (!watchedList.includes(lessonId)) {
                    const newList = [...watchedList, lessonId];
                    localStorage.setItem('watched_lessons', JSON.stringify(newList));
                    setIsWatched(true);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lessonId, isWatched]);

    // Load Tabs Logic (Local Only)
    useEffect(() => {
        const savedTabs = localStorage.getItem(TABS_KEY);
        let initialTabs: NoteTab[] = [];

        if (savedTabs) {
            try {
                initialTabs = JSON.parse(savedTabs);
            } catch (e) { console.error("Tab parse error", e); }
        }

        if (initialTabs.length === 0) {
            initialTabs.push({ id: 'main', title: 'Principal', content: '' });
        }

        setTabs(initialTabs);
        if (initialTabs.length > 0) {
            setActiveTabId(initialTabs[0].id);
            currentContentRef.current = initialTabs[0].content;
            if (editorRef.current) editorRef.current.innerHTML = initialTabs[0].content;
        }
    }, [courseId, lessonId, TABS_KEY]);

    // Load Watched
    useEffect(() => {
        const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
        if (lessonId && watchedList.includes(lessonId)) setIsWatched(true);
    }, [lessonId]);

    // Update Editor content when Tab switches
    useEffect(() => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab && editorRef.current) {
            if (editorRef.current.innerHTML !== tab.content) {
                editorRef.current.innerHTML = tab.content;
                currentContentRef.current = tab.content;
            }
        }
    }, [activeTabId, tabs]);

    // ---------------- Handlers ----------------

    const saveCurrentTab = (newContent: string) => {
        currentContentRef.current = newContent;
        setTabs(prev => {
            const newTabs = prev.map(t => t.id === activeTabId ? { ...t, content: newContent } : t);
            localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
            return newTabs;
        });
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 800);
    };

    const handleCreateTab = (title: string = 'Nova Nota', content: string = '') => {
        const newId = Date.now().toString();
        const newTab = { id: newId, title, content };
        setTabs(prev => {
            const updated = [...prev, newTab];
            localStorage.setItem(TABS_KEY, JSON.stringify(updated));
            return updated;
        });
        setActiveTabId(newId);
        setShowCommunity(false);
    };

    const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        if (tabs.length <= 1) return;
        // Direct close, no confirmation
        let nextActive = activeTabId;
        const newTabs = tabs.filter(t => t.id !== tabId);
        if (activeTabId === tabId) nextActive = newTabs[newTabs.length - 1].id;

        setTabs(newTabs);
        localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
        setActiveTabId(nextActive);
    };

    const handleDownloadVideo = async () => {
        if (!lesson) return;

        // Cancel logic
        if (isDownloading) {
            isDownloadingRef.current = false;
            setIsDownloading(false);
            return;
        }

        setIsDownloading(true);
        isDownloadingRef.current = true;

        const hasPerm = await checkPermissions();
        if (!hasPerm) {
            setModalConfig({
                isOpen: true,
                title: 'Permissão Negada',
                message: 'É necessário conceder permissão de armazenamento para baixar vídeos.',
                confirmText: 'Entendido',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
            setIsDownloading(false);
            return;
        }

        try {
            if (!lesson.videoUrl) throw new Error('Sem URL de vídeo');
            await downloadVideo(lessonId!, lesson.videoUrl);
            if (!isDownloadingRef.current) return; // Was cancelled

            const local = await getLocalVideoUrl(lessonId!);
            setLocalVideoSrc(local);
            setModalConfig({
                isOpen: true,
                title: 'Sucesso',
                message: 'Vídeo baixado para uso offline!',
                confirmText: 'Legal!',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        } catch (e) {
            if (isDownloadingRef.current) {
                setModalConfig({
                    isOpen: true,
                    title: 'Erro no Download',
                    message: 'Erro ao baixar o vídeo. Certifique-se de estar usando o app nativo e ter conexão com a internet.',
                    confirmText: 'OK',
                    onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            }
        }
        setIsDownloading(false);
    };

    const handleDeleteVideo = async () => {
        setModalConfig({
            isOpen: true,
            title: 'Excluir Download',
            message: 'Tem certeza que deseja remover este vídeo do seu dispositivo?',
            isDestructive: true,
            onConfirm: async () => {
                await deleteVideo(lessonId!);
                setLocalVideoSrc(null);
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const toggleSticky = () => {
        const newVal = !isSticky;
        setIsSticky(newVal);
        localStorage.setItem('video_sticky', String(newVal));
    };

    const toggleToolbarSticky = () => {
        const newVal = !isToolbarSticky;
        setIsToolbarSticky(newVal);
        localStorage.setItem('toolbar_sticky', String(newVal));
    };

    // Video Resize Handlers
    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsResizing(true);
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        resizeStartY.current = clientY;
        resizeStartHeight.current = videoHeight;
        e.preventDefault();
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const delta = clientY - resizeStartY.current;
            // Drag down = smaller, Drag up = larger (inverted for natural feel)
            // Min 80px, Max based on screen width 16:9
            const maxH = Math.min(400, window.innerWidth * 9 / 16);
            const newHeight = Math.max(80, Math.min(maxH, resizeStartHeight.current + delta));
            setVideoHeight(newHeight);
        };

        const handleEnd = () => {
            setIsResizing(false);
            localStorage.setItem('video_height', String(videoHeight));
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isResizing, videoHeight]);

    // --- Community Features ---

    const handleOpenCommunity = async () => {
        setShowCommunity(true);
        setIsLoadingCommunity(true);
        const notes = await getPublicNotes(lessonId || '');
        setPublicNotes(notes);
        setIsLoadingCommunity(false);
    };

    const handleShareNote = async () => {
        if (!currentUser || currentUser.startsWith('user-')) {
            setModalConfig({
                isOpen: true,
                title: 'Ação Necessária',
                message: 'Defina um nome na Home para poder compartilhar anotações e interagir com a comunidade.',
                confirmText: 'Ir para Home',
                cancelText: 'Depois',
                onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    navigate('/');
                }
            });
            return;
        }

        setIsSharing(true);
        try {
            await savePublicNote(lessonId || '', currentUser, currentContentRef.current);
            setShowNoteToast(true);
            setTimeout(() => setShowNoteToast(false), 2000);
        } catch (e) {
            setModalConfig({
                isOpen: true,
                title: 'Erro ao Salvar',
                message: 'Não foi possível salvar sua nota online. Verifique sua conexão.',
                confirmText: 'Tentar depois',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
        setIsSharing(false);
    };

    const handleDeletePublicNote = async () => {
        // Direct delete, no confirm
        try {
            await deletePublicNote(lessonId || '', currentUser || '');
            handleOpenCommunity();
        } catch (e) {
            setModalConfig({
                isOpen: true,
                title: 'Erro',
                message: 'Erro ao apagar a nota online.',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const handleImportNote = (note: PublicNote) => {
        // Direct import, NO confirmation at all
        handleCreateTab(`Nota de ${note.user}`, note.content);
        setShowNoteToast(true);
        setTimeout(() => setShowNoteToast(false), 2000);
    };

    // --- Editor Commands ---
    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            saveCurrentTab(editorRef.current.innerHTML);
            editorRef.current.focus();
        }
    };

    const handleMagicOrganize = async () => {
        if (!currentContentRef.current.trim()) return;

        // Get selected text
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || '';

        setModalConfig({
            isOpen: true,
            title: 'Organizar com IA',
            message: selectedText
                ? 'A IA irá corrigir e organizar o texto selecionado.'
                : 'A IA irá corrigir e organizar toda a anotação. O conteúdo será alterado.',
            isDestructive: false,
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setIsOrganizing(true);

                if (selectedText) {
                    // Work on selection only
                    const html = await correctAndOrganizeNotes(selectedText);
                    document.execCommand('insertHTML', false, html);
                    if (editorRef.current) {
                        saveCurrentTab(editorRef.current.innerHTML);
                    }
                } else {
                    // Work on all text
                    const text = editorRef.current?.innerText || "";
                    const html = await correctAndOrganizeNotes(text);

                    if (editorRef.current) {
                        editorRef.current.innerHTML = html;
                        saveCurrentTab(html);
                    }
                }
                setIsOrganizing(false);
            }
        });
    };

    const markAsWatched = (activityScore?: { score: number, total: number }) => {
        const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
        if (!watchedList.includes(String(lessonId))) {
            const newList = [...watchedList, String(lessonId)];
            localStorage.setItem('watched_lessons', JSON.stringify(newList));
            setIsWatched(true);
        }

        if (activityScore && lessonId) {
            const scores = JSON.parse(localStorage.getItem('activity_scores') || '{}');
            scores[lessonId] = activityScore;
            localStorage.setItem('activity_scores', JSON.stringify(scores));
        }
    };

    const toggleWatched = () => {
        const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
        let newList;
        if (isWatched) newList = watchedList.filter((id: string) => id !== String(lessonId));
        else newList = [...watchedList, String(lessonId)];

        localStorage.setItem('watched_lessons', JSON.stringify(newList));
        setIsWatched(!isWatched);
    };

    const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        if (isWatched) return;
        const target = e.currentTarget;
        if (target.duration > 0 && target.currentTime > (target.duration * 0.6)) {
            markAsWatched();
        }
    };

    const handleOptionSelect = (questionId: string, index: number) => {
        if (userAnswers[questionId] !== undefined) return;

        setUserAnswers(prev => ({ ...prev, [questionId]: index }));

        // Auto advance after short delay if correct?
        // Or wait for user to click next.
    };

    const handleNextQuestion = () => {
        if (!lesson?.activity) return;
        const questions = lesson.activity.questions || [];
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Calculate score and mark as watched (regardless of score)
            const correctCount = questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length;
            markAsWatched({ score: correctCount, total: questions.length });
            setShowActivitySummary(true);
        }
    };

    if (!lesson) {
        return <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'white' }}>
            <p>Carregando...</p>
            <Button onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>Sair</Button>
        </div>;
    }

    // Video Source Logic
    const iframeSrc = lesson.videoUrl ? convertToDirectLink(lesson.videoUrl) : null;

    // Reusable Content Area (Video or Activity)
    const MainContentArea = (
        <div style={{
            width: '100%',
            aspectRatio: lesson.activity ? 'unset' : '16/9',
            flex: lesson.activity ? 1 : 'unset',
            backgroundColor: '#0a0a0a',
            position: 'relative',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {lesson.activity ? (() => {
                // Ensure questions array exists (handle legacy data)
                const activity = lesson.activity;
                const questions = activity.questions || ((activity as any).question ? [{
                    id: 'legacy',
                    question: (activity as any).question,
                    options: (activity as any).options,
                    correctOptionIndex: (activity as any).correctOptionIndex
                }] : []);

                return (
                    <div style={{
                        flex: 1,
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(135deg, #1e1e2f 0%, #0a0a0a 100%)',
                        overflowY: 'auto'
                    }}>
                        {!showActivitySummary ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ color: theme.colors.primary, fontWeight: 700, fontSize: '0.8rem' }}>QUESTÃO {currentQuestionIndex + 1} DE {questions.length}</span>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', flex: 1, margin: '0 1rem', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${((currentQuestionIndex + 1) / (questions.length || 1)) * 100}%`, height: '100%', background: theme.colors.primary, transition: 'width 0.3s' }} />
                                    </div>
                                </div>

                                {(() => {
                                    const q = questions[currentQuestionIndex];
                                    if (!q) return <div style={{ color: 'white', opacity: 0.5 }}>Pergunta não encontrada.</div>;
                                    const selectedIdx = userAnswers[q.id];
                                    const showResult = selectedIdx !== undefined;

                                    return (
                                        <>
                                            <h3 style={{
                                                fontSize: '1.1rem',
                                                color: 'white',
                                                marginBottom: '1.5rem',
                                                textAlign: 'left',
                                                lineHeight: '1.4'
                                            }}>
                                                {q.question}
                                            </h3>
                                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                {q.options.map((option, idx) => {
                                                    const isCorrect = idx === q.correctOptionIndex;
                                                    const isSelected = selectedIdx === idx;
                                                    let bgColor = 'rgba(255,255,255,0.05)';
                                                    let borderColor = 'rgba(255,255,255,0.1)';

                                                    if (showResult) {
                                                        if (isCorrect) {
                                                            bgColor = 'rgba(16, 185, 129, 0.2)';
                                                            borderColor = theme.colors.success;
                                                        } else if (isSelected) {
                                                            bgColor = 'rgba(239, 68, 68, 0.2)';
                                                            borderColor = '#ef4444';
                                                        }
                                                    } else if (isSelected) {
                                                        borderColor = theme.colors.primary;
                                                    }

                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleOptionSelect(q.id, idx)}
                                                            disabled={showResult}
                                                            style={{
                                                                padding: '0.75rem 1rem',
                                                                borderRadius: '8px',
                                                                background: bgColor,
                                                                border: `1px solid ${borderColor}`,
                                                                color: 'white',
                                                                textAlign: 'left',
                                                                cursor: showResult ? 'default' : 'pointer',
                                                                transition: 'all 0.2s',
                                                                position: 'relative',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                fontSize: '0.9rem'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '20px', height: '20px', borderRadius: '50%',
                                                                border: `2px solid ${isSelected ? (showResult ? (isCorrect ? theme.colors.success : '#ef4444') : theme.colors.primary) : 'rgba(255,255,255,0.3)'}`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                            }}>
                                                                {(isSelected || (showResult && isCorrect)) && (
                                                                    <div style={{
                                                                        width: '10px', height: '10px', borderRadius: '50%',
                                                                        backgroundColor: isCorrect ? theme.colors.success : (isSelected ? '#ef4444' : 'transparent')
                                                                    }} />
                                                                )}
                                                            </div>
                                                            {option}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {showResult && (
                                                <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s' }}>
                                                    <Button fullWidth onClick={handleNextQuestion} variant={selectedIdx === q.correctOptionIndex ? "success" : "secondary"}>
                                                        {currentQuestionIndex < questions.length - 1 ? 'Próxima Questão' : 'Ver Resultados'}
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', padding: '1rem' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                    <FaCheckCircle size={40} color={theme.colors.success} />
                                </div>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Atividade Concluída!</h2>
                                <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
                                    {(() => {
                                        const correctCount = questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length;
                                        const total = questions.length;
                                        const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
                                        if (percentage === 100) return "Excelente! Você acertou todas as questões.";
                                        if (percentage >= 70) return `Bom trabalho! Você acertou ${correctCount} de ${total} questões.`;
                                        return `Você acertou ${correctCount} de ${total} questões. Tente revisar os vídeos e fazer novamente!`;
                                    })()}
                                </p>
                                <Button fullWidth onClick={() => navigate(`/course/${courseId}`)}>Voltar ao Curso</Button>
                                {questions.some(q => userAnswers[q.id] !== q.correctOptionIndex) && (
                                    <Button variant="ghost" fullWidth style={{ marginTop: '0.5rem' }} onClick={() => { setShowActivitySummary(false); setCurrentQuestionIndex(0); setUserAnswers({}); }}>Tentar Novamente</Button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })() : (
                localVideoSrc ? (
                    <video
                        src={localVideoSrc}
                        style={{ width: '100%', height: '100%' }}
                        controls
                        title={lesson.title}
                        onTimeUpdate={handleVideoTimeUpdate}
                    />
                ) : (
                    iframeSrc ? (
                        <iframe
                            src={iframeSrc}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allow="autoplay; encrypted-media; fullscreen"
                            title={lesson.title}
                            allowFullScreen
                        />
                    ) : <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Erro Video</div>
                )
            )}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: theme.colors.pageBackground || theme.colors.background }}>

            {/* Modal */}
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel || (() => setModalConfig(prev => ({ ...prev, isOpen: false })))}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText || (modalConfig.confirmText ? "" : "Cancelar")}
                isDestructive={modalConfig.isDestructive}
            />

            {/* Header - Reduced Height */}
            <div style={{
                padding: '0.3rem 1rem', background: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 120, position: 'relative'
            }}>
                <button onClick={() => navigate(`/course/${courseId}`, { replace: true })} style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '25px', height: '25px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}><FaChevronLeft size={12} /></button>

                <h2 style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600, flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 1rem' }}>
                    {lessonTitle}
                </h2>

                <button onClick={toggleWatched} style={{ background: 'none', border: 'none', color: isWatched ? theme.colors.success : 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                    {isWatched ? <FaCheckCircle size={18} /> : <FaRegCircle size={18} />}
                </button>
            </div>

            {lesson.activity ? (
                /* FULL SCREEN ACTIVITY LAYOUT */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {MainContentArea}
                    {/* Bottom Nav for Activity */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.6rem 1rem', background: theme.colors.surface, borderTop: `1px solid ${theme.colors.border}`
                    }}>
                        <Button disabled={!prevLessonId} onClick={() => prevLessonId && navigate(`/course/${courseId}/lesson/${prevLessonId}`)} variant="secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}><FaStepBackward /> Ant</Button>
                        <Button disabled={!nextLessonId} onClick={() => nextLessonId && navigate(`/course/${courseId}/lesson/${nextLessonId}`)} variant="primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Prox <FaStepForward /></Button>
                    </div>
                </div>
            ) : (
                /* VIDEO + NOTES LAYOUT */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Sticky Video Here (If Enabled) */}
                    {isSticky && (
                        <div style={{
                            width: '100%',
                            maxWidth: '900px',
                            margin: '0 auto',
                            background: 'black',
                            position: 'relative',
                            aspectRatio: '16/9',
                            maxHeight: `${videoHeight}px`
                        }}>
                            {MainContentArea}
                            {/* Resize Handle */}
                            <div
                                onMouseDown={handleResizeStart}
                                onTouchStart={handleResizeStart}
                                onDoubleClick={() => {
                                    const maxH = Math.min(400, window.innerWidth * 9 / 16);
                                    setVideoHeight(maxH);
                                    localStorage.setItem('video_height', String(maxH));
                                }}
                                style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    height: '6px',
                                    background: 'rgba(99, 102, 241, 0.6)',
                                    cursor: 'ns-resize',
                                    zIndex: 300,
                                    touchAction: 'none'
                                }}
                                title="Arraste para redimensionar"
                            />
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>

                            {/* Non-Sticky Video Here (If Disabled) */}
                            {!isSticky && MainContentArea}

                            {/* Nav & Action Buttons */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.3rem', background: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}`,
                                position: 'relative', zIndex: 50
                            }}>
                                <Button disabled={!prevLessonId} onClick={() => prevLessonId && navigate(`/course/${courseId}/lesson/${prevLessonId}`)} variant="secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}><FaStepBackward /> Ant</Button>

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {/* Sticky Toggle */}
                                    <button
                                        onClick={toggleSticky}
                                        style={{
                                            background: 'none', border: 'none',
                                            color: isSticky ? theme.colors.primary : 'rgba(255,255,255,0.3)',
                                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
                                        }}
                                        title="Fixar Vídeo no Topo"
                                    >
                                        {isSticky ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />}
                                        <span style={{ fontSize: '0.55rem' }}>Fixar</span>
                                    </button>

                                    {/* Download/Delete Button */}
                                    <button
                                        onClick={localVideoSrc ? handleDeleteVideo : handleDownloadVideo}
                                        style={{
                                            background: isDownloading ? 'rgba(255, 165, 0, 0.2)' : (localVideoSrc ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)'),
                                            color: isDownloading ? 'orange' : (localVideoSrc ? '#fca5a5' : 'white'),
                                            border: 'none', borderRadius: '50%', width: '25px', height: '25px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                        }}
                                        title={isDownloading ? "Cancelar Download" : (localVideoSrc ? "Apagar Download" : "Baixar Aula")}
                                    >
                                        {isDownloading ? <FaSpinner className="spin" size={12} /> : (localVideoSrc ? <FaTrash size={12} /> : <FaArrowDown size={12} />)}
                                    </button>
                                </div>

                                <Button disabled={!nextLessonId} onClick={() => nextLessonId && navigate(`/course/${courseId}/lesson/${nextLessonId}`)} variant="primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Prox <FaStepForward /></Button>
                            </div>

                            {/* Notes Section Container */}
                            <div style={{ padding: '1rem', minHeight: '500px', position: 'relative' }}>
                                {/* Note Saved Toast */}
                                {showNoteToast && (
                                    <div style={{
                                        position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                                        background: 'rgba(16, 185, 129, 0.9)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem',
                                        animation: 'fadeInOut 2s forwards'
                                    }}>
                                        {localVideoSrc ? 'Anotações salvas!' : 'Nota copiada com sucesso!'}
                                    </div>
                                )}

                                {/* Header: Title + Community Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: theme.colors.text.primary }}>Minhas Anotações</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button title="Salvar Online" onClick={handleShareNote} disabled={isSharing} style={{ background: 'rgba(59, 130, 246, 0.2)', border: 'none', borderRadius: '6px', color: '#60a5fa', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaCloudUploadAlt size={16} />
                                        </button>
                                        <button title="Comunidade" onClick={handleOpenCommunity} style={{ background: theme.colors.surfaceHighlight, border: 'none', borderRadius: '6px', color: 'white', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaUsers size={16} />
                                        </button>
                                        {/* Toolbar Sticky Toggle */}
                                        <button
                                            onClick={toggleToolbarSticky}
                                            title="Fixar Controles"
                                            style={{
                                                background: isToolbarSticky ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                                border: 'none', borderRadius: '6px',
                                                color: isToolbarSticky ? theme.colors.primary : 'rgba(255,255,255,0.5)',
                                                padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            {isToolbarSticky ? <FaToggleOn size={16} /> : <FaToggleOff size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs Bar */}
                                <div style={{ display: 'flex', overflowX: 'auto', gap: '0.3rem', paddingBottom: '2px', borderBottom: `1px solid ${theme.colors.border}` }}>
                                    {tabs.map(tab => (
                                        <div key={tab.id}
                                            onClick={() => { setActiveTabId(tab.id); setShowCommunity(false); }}
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px 8px 0 0',
                                                background: activeTabId === tab.id && !showCommunity ? theme.colors.surfaceHighlight : 'rgba(255,255,255,0.05)',
                                                borderBottom: activeTabId === tab.id && !showCommunity ? `2px solid ${theme.colors.primary}` : 'none',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                color: 'white',
                                                opacity: activeTabId === tab.id && !showCommunity ? 1 : 0.6
                                            }}
                                        >
                                            {tab.id !== 'main' && <FaStickyNote size={10} />}
                                            {tab.title}
                                            {tab.id !== 'main' && (
                                                <span onClick={(e) => handleCloseTab(e, tab.id)} style={{ opacity: 0.5, marginLeft: '4px', fontSize: '10px' }}><FaTimes /></span>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={() => handleCreateTab()} style={{ background: 'none', border: 'none', color: theme.colors.primary, cursor: 'pointer', padding: '0.4rem' }}>
                                        <FaPlus />
                                    </button>
                                </div>

                                {/* Editor Area */}
                                <div style={{
                                    border: `1px solid ${theme.colors.border}`,
                                    borderTop: 'none',
                                    borderRadius: '0 0 8px 8px',
                                    background: 'rgba(0,0,0,0.2)',
                                    minHeight: '400px',
                                    position: 'relative'
                                }}>
                                    {showCommunity ? (
                                        <div style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Notas da Comunidade</h3>
                                                <button onClick={() => setShowCommunity(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FaTimes /></button>
                                            </div>

                                            {isLoadingCommunity ? (
                                                <p style={{ textAlign: 'center', opacity: 0.5 }}>Carregando...</p>
                                            ) : publicNotes.length === 0 ? (
                                                <p style={{ textAlign: 'center', opacity: 0.5 }}>Nenhuma nota pública.</p>
                                            ) : (
                                                <div style={{ display: 'grid', gap: '1rem' }}>
                                                    {publicNotes.map((note, idx) => (
                                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                                <strong style={{ color: theme.colors.secondary }}>{note.user}</strong>
                                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(note.timestamp).toLocaleDateString()}</span>
                                                                    {note.user === currentUser && (
                                                                        <button onClick={handleDeletePublicNote} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><FaTrash /></button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                maxHeight: '100px', overflow: 'hidden', fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.8rem',
                                                                maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                                                                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
                                                            }} dangerouslySetInnerHTML={{ __html: note.content }} />

                                                            <Button onClick={() => handleImportNote(note)} variant="secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem' }}>
                                                                <FaCopy /> Ler e Editar (Copiar)
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Toolbar - Conditional Sticky */}
                                            <div style={{
                                                display: 'flex', padding: '0.5rem',
                                                background: '#1a1a2e',
                                                borderBottom: `1px solid ${theme.colors.border}`,
                                                gap: '0.3rem', flexWrap: 'wrap',
                                                position: isToolbarSticky ? 'sticky' : 'relative',
                                                top: isToolbarSticky ? 0 : 'auto',
                                                zIndex: isToolbarSticky ? 10 : 1,
                                                borderRadius: '0 0 4px 4px'
                                            }}>
                                                <ToolbarBtn onClick={() => execCmd('bold')} icon={<FaBold />} />
                                                <ToolbarBtn onClick={() => execCmd('italic')} icon={<FaItalic />} />
                                                <ToolbarBtn onClick={() => execCmd('underline')} icon={<FaUnderline />} />
                                                <div style={{ width: 1, background: 'white', opacity: 0.2, margin: '0 4px' }} />
                                                <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} icon={<FaListUl />} />
                                                <ToolbarBtn onClick={() => execCmd('removeFormat')} icon={<FaEraser />} />
                                                <div style={{ flex: 1 }} />
                                                {/* AI Button - Icon Only */}
                                                <button
                                                    onClick={handleMagicOrganize}
                                                    disabled={isOrganizing}
                                                    title={isOrganizing ? "Organizando..." : "Organizar com IA"}
                                                    style={{
                                                        background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '0.4rem',
                                                        color: 'white',
                                                        cursor: isOrganizing ? 'wait' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: isOrganizing ? 0.6 : 1
                                                    }}
                                                >
                                                    <FaMagic size={14} />
                                                </button>
                                            </div>

                                            {/* Editor */}
                                            <div
                                                ref={editorRef}
                                                contentEditable
                                                onInput={(e) => saveCurrentTab(e.currentTarget.innerHTML)}
                                                style={{
                                                    padding: '1rem', minHeight: '400px', outline: 'none', lineHeight: '1.6', fontSize: '0.95rem'
                                                }}
                                            />

                                            {/* Saving Indicator */}
                                            <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: '0.7rem', opacity: 0.5 }}>
                                                {isSaving ? 'Salvando...' : 'Salvo'}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const ToolbarBtn: React.FC<{ onClick: () => void, icon: React.ReactNode }> = ({ onClick, icon }) => (
    <button onMouseDown={(e) => { e.preventDefault(); onClick(); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px' }}>
        {icon}
    </button>
);

export default LessonView;
