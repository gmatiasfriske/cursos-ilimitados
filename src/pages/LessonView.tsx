import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { Course, Lesson } from '../types';
import { theme } from '../theme';
import { convertToDirectLink, convertToDownloadLink } from '../services/driveUtils';
import { correctAndOrganizeNotes } from '../services/aiService';
import { savePublicNote, getPublicNotes, type PublicNote, deletePublicNote } from '../services/dataService';
import { deleteVideo, getLocalVideoUrl, isPlatformNative } from '../services/videoService';
import { getLocalMaterialUrl, downloadMaterial, deleteMaterial } from '../services/materialService';

import Button from '../components/UI/Button';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import {
    FaTrash, FaChevronLeft, FaPlay, FaTimes, FaDownload, FaTrophy, FaCopy,
    FaMagic, FaUsers, FaCloudUploadAlt, FaToggleOn, FaToggleOff, FaBold, FaItalic, FaUnderline, FaListUl, FaHighlighter, FaEraser, FaSpinner, FaCheckCircle,
    FaRegCircle, FaStepBackward, FaStepForward, FaFilePdf, FaBookOpen, FaMusic, FaLink, FaStickyNote, FaArrowUp, FaPlus, FaArrowDown
} from 'react-icons/fa';
import { MdScreenRotation } from 'react-icons/md';




// PDF Viewer
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// EPUB Viewer
import { ReactReader } from 'react-reader';

interface LessonViewProps {
    courses: Course[];
    isAdmin?: boolean;
}

interface NoteTab {
    id: string;
    title: string;
    content: string;
}

const ToolbarBtn: React.FC<{ onClick: () => void, icon: React.ReactNode }> = ({ onClick, icon }) => (
    <button onMouseDown={(e) => { e.preventDefault(); onClick(); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px' }}>
        {icon}
    </button>
);

const LessonView: React.FC<LessonViewProps> = ({ courses, isAdmin }) => {
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
    const [isSticky, setIsSticky] = useState(() => localStorage.getItem('video_sticky') !== 'false');
    const [videoHeight, setVideoHeight] = useState(() => {
        const saved = localStorage.getItem('video_height');
        return saved ? Number(saved) : (window.innerWidth * 9 / 16); // Default to 16:9
    });
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playbackRate, setPlaybackRate] = useState(1);
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
    const [userAnswers, setUserAnswers] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem(`quiz_answers_${courseId}_${lessonId}`);
        return saved ? JSON.parse(saved) : {};
    });
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showActivitySummary, setShowActivitySummary] = useState(() => {
        return localStorage.getItem(`quiz_finished_${courseId}_${lessonId}`) === 'true';
    });
    const [viewingContent, setViewingContent] = useState<{ url: string, type: string, title: string, content?: string } | null>(null);
    const [showAiToast, setShowAiToast] = useState(false);
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [renamingTab, setRenamingTab] = useState<{ id: string, title: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const lastClickRef = useRef<{ id: string, time: number }>({ id: '', time: 0 });
    const dragTimeoutRef = useRef<any>(null);
    const [isDragMoving, setIsDragMoving] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const dragCurrentX = useRef(0);
    const [epubLocation, setEpubLocation] = useState<string | number>(0);
    const [localMaterialUrls, setLocalMaterialUrls] = useState<Record<string, string>>({});
    const [downloadingMaterials, setDownloadingMaterials] = useState<Record<string, boolean>>({});
    const [isPreparingId, setIsPreparingId] = useState<string | null>(null);
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const pageTimeRef = useRef(0); // Time spent on page in seconds
    // Determine library mode: No video URL OR we are forcing library view (if we had a flag)
    // But currently isLibrary means "No Video URL AND has contents". 
    // If we have videoUrl, isLibrary is false.
    const isLibrary = (!lesson?.videoUrl || lesson?.videoUrl.trim() === "") && lesson?.contents && lesson?.contents.length > 0 && !lesson?.activity;

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isForcedLandscape, setIsForcedLandscape] = useState(false);
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
    const lastSavedContent = useRef('');
    const [consolidationActiveTabs, setConsolidationActiveTabs] = useState<Record<string, string>>({});
    const [pendingJumpLesson, setPendingJumpLesson] = useState<{ id: string, title: string } | null>(null);

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
    }, [lessonId, lesson]);

    // Handle Orientation on Fullscreen
    useEffect(() => {
        const handleFullscreenChange = () => {
            const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement;
            const isFs = !!fsElement;
            setIsFullscreen(isFs);

            if (isFs) {
                if (window.screen.orientation && (window.screen.orientation as any).lock) {
                    (window.screen.orientation as any).lock('landscape').catch(() => { });
                }
            } else {
                if (window.screen.orientation && window.screen.orientation.unlock) {
                    window.screen.orientation.unlock();
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Handle Android Back Button
    useEffect(() => {
        const setupListener = async () => {
            const listener = await App.addListener('backButton', () => {
                // FORCE SAVE before navigating back
                if (editorRef.current) {
                    const currentContent = editorRef.current.innerHTML;
                    setTabs(prev => {
                        const newTabs = prev.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
                        localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
                        return newTabs;
                    });
                }
                navigate(`/course/${courseId}`, { replace: true });
            });
            return listener;
        };

        const listenerPromise = setupListener();
        return () => {
            listenerPromise.then(l => l.remove());
        };
    }, [navigate, courseId, activeTabId, TABS_KEY]);

    // Check Local Video
    useEffect(() => {
        setLocalVideoSrc(null);
        if (lessonId && isPlatformNative()) {
            getLocalVideoUrl(lessonId).then(src => {
                if (src) setLocalVideoSrc(src);
            });
        }
    }, [lessonId]);

    const loadLocalMaterials = async () => {
        if (!lesson?.contents) return;
        const urls: Record<string, string> = {};
        for (const content of lesson.contents) {
            const local = await getLocalMaterialUrl(content.id, content.type);
            if (local) urls[content.id] = local;
        }
        setLocalMaterialUrls(urls);
    };

    useEffect(() => {
        loadLocalMaterials();
    }, [lesson]);

    const handleDownloadMaterial = async (content: any) => {
        if (!isPlatformNative()) {
            window.open(convertToDirectLink(content.url), '_blank');
            return;
        }
        setDownloadingMaterials(prev => ({ ...prev, [content.id]: true }));
        try {
            await downloadMaterial(content.id, content.url, content.type);
            await loadLocalMaterials();
            // Removed modal confirmation, showing a small toast-like effect could be added if needed,
            // but for now, just following the request to remove the confirmation modal.
        } catch (e) {
            setModalConfig({
                isOpen: true,
                title: "Erro",
                message: "Falha ao baixar material.",
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setDownloadingMaterials(prev => ({ ...prev, [content.id]: false }));
        }
    };

    const handleDeleteMaterial = async (content: any) => {
        setModalConfig({
            isOpen: true,
            title: "Excluir Download",
            message: `Tem certeza que deseja excluir o arquivo local de "${content.title}"?`,
            confirmText: "Excluir",
            isDestructive: true,
            onConfirm: async () => {
                await deleteMaterial(content.id, content.type);
                await loadLocalMaterials();
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

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
            lastSavedContent.current = initialTabs[0].content;
            if (editorRef.current) editorRef.current.innerHTML = initialTabs[0].content;
        }
    }, [courseId, lessonId, TABS_KEY]);

    // Load Watched
    useEffect(() => {
        const watchedList = JSON.parse(localStorage.getItem('watched_lessons') || '[]');
        if (lessonId && watchedList.includes(lessonId)) setIsWatched(true);
    }, [lessonId]);

    // Update Editor content when Tab switches or content changes externally
    useEffect(() => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab && editorRef.current) {
            // Only update DOM if the content in state is different from what we last saved
            // This prevents focus loss during typing (React re-render vs DOM innerHTML)
            if (tab.content !== lastSavedContent.current) {
                editorRef.current.innerHTML = tab.content;
                lastSavedContent.current = tab.content;
            }
        }
    }, [activeTabId, tabs]);

    // ---------------- Handlers ----------------

    const saveCurrentTab = (newContent: string) => {
        lastSavedContent.current = newContent;
        setTabs(prev => {
            const newTabs = prev.map(t => t.id === activeTabId ? { ...t, content: newContent } : t);
            localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
            return newTabs;
        });
        setIsSaving(true);
        // Clear indicator after a delay
        setTimeout(() => setIsSaving(false), 2000);
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

    const handleMakeMainTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        const tabToMove = tabs.find(t => t.id === tabId);
        if (!tabToMove) return;

        const otherTabs = tabs.filter(t => t.id !== tabId);
        const newTabs = [tabToMove, ...otherTabs];

        setTabs(newTabs);
        localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
        setActiveTabId(tabId);
    };

    const handleTabRenameStart = (tab: NoteTab) => {
        setRenamingTab(tab);
        setRenameValue(tab.title);
    };

    const handleTabClick = (tabId: string) => {
        if (isDragMoving) return;
        const now = Date.now();
        // Custom 600ms window for "double click"
        if (lastClickRef.current.id === tabId && (now - lastClickRef.current.time) < 600) {
            const tab = tabs.find(t => t.id === tabId);
            if (tab) handleTabRenameStart(tab);
            lastClickRef.current = { id: '', time: 0 };
            return;
        }
        lastClickRef.current = { id: tabId, time: now };

        setActiveTabId(tabId);
        setShowCommunity(false);
    };

    const handleTabPressStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        const pos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        dragStartPos.current = pos;
        dragCurrentX.current = pos.x;

        dragTimeoutRef.current = setTimeout(() => {
            setDraggedTabId(id);
            setIsDragMoving(true);
            if (navigator.vibrate) navigator.vibrate(30);
        }, 300); // 0.3s hold to start moving
    };

    const handleTabPressMove = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

        if (!draggedTabId) {
            const dx = pos.x - dragStartPos.current.x;
            const dy = pos.y - dragStartPos.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) clearTimeout(dragTimeoutRef.current);
            return;
        }

        e.preventDefault();
        dragCurrentX.current = pos.x;

        // Find target tab to swap
        const element = document.elementFromPoint(pos.x, dragStartPos.current.y);
        const targetTab = element?.closest('[data-tab-id]') as HTMLElement;
        const targetId = targetTab?.getAttribute('data-tab-id');

        if (targetId && targetId !== draggedTabId) {
            handleTabDragEnterForced(targetId);
        }
    };

    const handleTabPressEnd = () => {
        clearTimeout(dragTimeoutRef.current);
        setDraggedTabId(null);
        setTimeout(() => setIsDragMoving(false), 50);
    };

    const handleTabDragEnterForced = (targetId: string) => {
        if (!draggedTabId || draggedTabId === targetId) return;
        setTabs(prev => {
            const fromIdx = prev.findIndex(t => t.id === draggedTabId);
            const toIdx = prev.findIndex(t => t.id === targetId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const newTabs = [...prev];
            const [moved] = newTabs.splice(fromIdx, 1);
            newTabs.splice(toIdx, 0, moved);
            localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
            return newTabs;
        });
    };

    const confirmRename = () => {
        if (renamingTab && renameValue.trim()) {
            setTabs(prev => {
                const updated = prev.map(t => t.id === renamingTab.id ? { ...t, title: renameValue.trim() } : t);
                localStorage.setItem(TABS_KEY, JSON.stringify(updated));
                return updated;
            });
            setRenamingTab(null);
        }
    };

    const handleDownloadVideo = async () => {
        setIsDownloading(false);
    };

    const handleMagicOrganize = async () => {
        if (!lastSavedContent.current.trim()) return;

        // Get selected text
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || '';

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
        setShowAiToast(true);
        setTimeout(() => setShowAiToast(false), 3000);
    };

    const handleDeleteVideo = async () => {
        setModalConfig({
            isOpen: true,
            title: 'Excluir Download',
            message: 'Tem certeza que deseja remover este Vídeo do seu dispositivo?',
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

        // Disable body scroll while resizing
        document.body.style.overflow = 'hidden';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            // Prevent scrolling on mobile
            if (e.cancelable) e.preventDefault();

            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const delta = clientY - resizeStartY.current;

            // Limit height: min 120px, max is EXACTLY 16:9 of the screen width
            const maxWidth169 = window.innerWidth * 9 / 16;
            const newHeight = Math.max(120, Math.min(maxWidth169, resizeStartHeight.current + delta));
            setVideoHeight(newHeight);
        };

        const handleEnd = () => {
            setIsResizing(false);
            document.body.style.overflow = '';
            document.body.style.userSelect = '';
        };

        // Important: use { passive: false } for touchmove to allow e.preventDefault()
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isResizing]);

    // Save height when it changes (debounced or on end)
    useEffect(() => {
        if (!isResizing && videoHeight > 0) {
            // Ensure we don't save a height larger than current screen allows
            const maxH = window.innerWidth * 9 / 16;
            localStorage.setItem('video_height', String(Math.min(videoHeight, maxH)));
        }
    }, [videoHeight, isResizing]);

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
                message: 'Defina um nome na Home para poder compartilhar Anotações e interagir com a comunidade.',
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
            await savePublicNote(lessonId || '', currentUser, lastSavedContent.current);
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

    const handleDeletePublicNote = async (targetUser?: string) => {
        // Direct delete, no confirm
        const userToDelete = targetUser || currentUser || '';
        try {
            await deletePublicNote(lessonId || '', userToDelete);
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
        // Direct import
        handleCreateTab(`Nota de ${note.user}`, note.content);
        setShowNoteToast(true);
        setTimeout(() => setShowNoteToast(false), 2000);
    };



    // --- Editor Commands ---
    const execCmd = (command: string, value?: string) => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && selection.toString().trim() === "" && editorRef.current?.contains(selection.anchorNode)) {
            // No selection: try to select the word at cursor
            const range = selection.getRangeAt(0);
            const node = range.startContainer;
            const offset = range.startOffset;

            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || "";
                let start = offset;
                let end = offset;

                // Find word boundaries
                while (start > 0 && /\S/.test(text[start - 1])) start--;
                while (end < text.length && /\S/.test(text[end])) end++;

                if (start !== end) {
                    const newRange = document.createRange();
                    newRange.setStart(node, start);
                    newRange.setEnd(node, end);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
        }

        document.execCommand(command, false, value);
        if (editorRef.current) {
            saveCurrentTab(editorRef.current.innerHTML);
            editorRef.current.focus();
        }
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

    // Persistence Effect for Quiz
    useEffect(() => {
        if (Object.keys(userAnswers).length > 0) {
            localStorage.setItem(`quiz_answers_${courseId}_${lessonId}`, JSON.stringify(userAnswers));
        }
    }, [userAnswers, courseId, lessonId]);

    useEffect(() => {
        localStorage.setItem(`quiz_finished_${courseId}_${lessonId}`, showActivitySummary ? 'true' : 'false');
    }, [showActivitySummary, courseId, lessonId]);

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
    };

    // --- Module Notes Aggregation ---
    const currentModule = courses.find(c => c.id === courseId)?.modules.find(m => m.lessons.some(l => l.id === lessonId));
    const allModuleGroups = React.useMemo(() => {
        if (!currentModule) return [];
        return currentModule.lessons
            .map(l => {
                const saved = localStorage.getItem(`note_tabs_${courseId}_${l.id}`);
                if (!saved) return null;
                try {
                    const tabs = JSON.parse(saved);
                    if (!tabs || tabs.length === 0) return null;
                    // Check if any tab has content
                    const hasContent = tabs.some((t: any) => t.content && t.content.trim() !== '');
                    if (!hasContent) return null;
                    return { lessonId: l.id, lessonTitle: l.title, tabs };
                } catch (e) { return null; }
            }).filter(Boolean) as { lessonId: string, lessonTitle: string, tabs: NoteTab[] }[];
    }, [currentModule, courseId]);

    // Initialize/Sync active tabs for consolidated view
    useEffect(() => {
        setConsolidationActiveTabs(prev => {
            const next = { ...prev };
            let changed = false;
            allModuleGroups.forEach(group => {
                if (!next[group.lessonId] || !group.tabs.some(t => t.id === next[group.lessonId])) {
                    next[group.lessonId] = group.tabs[0].id;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [allModuleGroups]);

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


    // Reusable Content Area (Video or Activity)
    const MainContentArea = isLibrary ? null : (
        <div
            id="player-container"
            className={(isForcedLandscape || (isFullscreen && window.innerHeight > window.innerWidth)) ? 'force-landscape-rotate' : ''}
            style={{
                width: '100%',
                // When sticky, height is dynamic. When not, it's 16/9.
                aspectRatio: lesson.activity ? 'unset' : (isSticky ? 'unset' : '16/9'),
                height: lesson.activity ? '100%' : (isSticky ? `${videoHeight}px` : 'auto'),
                backgroundColor: '#000',
                position: 'relative', // Essential for absolute positioning of children
                zIndex: isForcedLandscape ? 1000000 : 100,
                overflow: 'hidden',
                display: lesson.activity ? 'flex' : 'block'
            }}>
            {/* Manual Rotation Button */}
            {!lesson.activity && !isLibrary && (
                <button
                    onClick={() => setIsForcedLandscape(!isForcedLandscape)}
                    title="Rotacionar Vídeo"
                    style={{
                        position: 'absolute',
                        bottom: '40px',
                        right: '10px',
                        zIndex: 1000,
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: isForcedLandscape ? theme.colors.primary : 'white',
                        padding: '6px', // Reduced padding
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(5px)',
                        transition: 'all 0.3s'
                    }}
                >
                    <MdScreenRotation size={16} /> {/* Reduced size from 20 to 16 (-20%) */}
                </button>
            )}
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
                                                            onClick={() => {
                                                                handleOptionSelect(q.id, idx);
                                                                // Auto-scroll logic
                                                                setTimeout(() => {
                                                                    const btn = document.getElementById(`next-btn-area`);
                                                                    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                                }, 200);
                                                            }}
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
                                            </div >

                                            <div id="next-btn-area" style={{ height: '10px' }} />

                                            {showResult && (
                                                <div style={{ marginTop: '1rem', animation: 'fadeIn 0.3s' }}>
                                                    <Button fullWidth onClick={() => {
                                                        if (currentQuestionIndex < questions.length - 1) {
                                                            handleNextQuestion();
                                                            // Scroll back up to question start
                                                            setTimeout(() => {
                                                                const top = document.getElementById('lesson-header-anchor');
                                                                if (top) top.scrollIntoView({ behavior: 'smooth' });
                                                            }, 100);
                                                        } else {
                                                            const correctCount = questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length;
                                                            const total = questions.length;
                                                            const savedScores = JSON.parse(localStorage.getItem('activity_scores') || '{}');
                                                            savedScores[lessonId!] = { score: correctCount, total };
                                                            localStorage.setItem('activity_scores', JSON.stringify(savedScores));
                                                            setShowActivitySummary(true);
                                                        }
                                                    }} variant={selectedIdx === q.correctOptionIndex ? "success" : "secondary"}>
                                                        {currentQuestionIndex < questions.length - 1 ? 'Próxima questão' : 'Ver resultados'}
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </>
                        ) : (
                            <div style={{ animation: 'fadeIn 0.5s ease-out', padding: '1rem' }}>
                                {/* Detailed Report Section - Matching Special Exam Style */}
                                <div style={{
                                    textAlign: 'center',
                                    padding: '1.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    border: `1px solid ${theme.colors.border}`,
                                    marginBottom: '1.5rem'
                                }}>
                                    <FaTrophy size={40} color={questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length > questions.length / 2 ? '#fbbf24' : 'rgba(255,255,255,0.2)'} style={{ marginBottom: '1rem' }} />
                                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.5rem 0' }}>
                                        {(() => {
                                            const correctCount = questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length;
                                            const total = questions.length;
                                            return total > 0 ? Math.round((correctCount / total) * 100) : 0;
                                        })()}%
                                    </h2>
                                    <p style={{ color: theme.colors.text.secondary, fontSize: '0.9rem' }}>
                                        {(() => {
                                            const correctCount = questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length;
                                            const total = questions.length;
                                            return `Você acertou ${correctCount} de ${total} questões.`;
                                        })()}
                                    </p>

                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
                                        <div>
                                            <div style={{ color: theme.colors.success, fontSize: '1.2rem', fontWeight: 800 }}>
                                                {questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Acertos</div>
                                        </div>
                                        <div>
                                            <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 800 }}>
                                                {questions.length - questions.filter(q => userAnswers[q.id] === q.correctOptionIndex).length}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Erros</div>
                                        </div>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>RelatÃ³rio Detalhado</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                                    {questions.map((q, idx) => {
                                        const uAnsIndex = userAnswers[q.id];
                                        const isCorrect = uAnsIndex === q.correctOptionIndex;

                                        return (
                                            <div key={q.id} style={{
                                                padding: '1rem',
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: '8px',
                                                borderLeft: `4px solid ${isCorrect ? theme.colors.success : '#ef4444'}`
                                            }}>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem', opacity: 0.9 }}>
                                                    {idx + 1}. {q.question}
                                                </p>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <div style={{ fontSize: '0.75rem', display: 'flex', gap: '8px' }}>
                                                        <FaCheckCircle color={theme.colors.success} size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                        <span>Resposta Correta: <b style={{ color: theme.colors.success }}>{q.options[q.correctOptionIndex]}</b></span>
                                                    </div>

                                                    {!isCorrect && (
                                                        <div style={{ fontSize: '0.75rem', display: 'flex', gap: '8px' }}>
                                                            <FaTimes color="#ef4444" size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                            <span>Sua Escolha: <b style={{ color: '#ef4444' }}>{q.options[uAnsIndex] || 'Pulada'}</b></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Button fullWidth onClick={() => navigate(`/course/${courseId}`)}>Voltar ao Curso</Button>
                                <Button variant="ghost" fullWidth style={{ marginTop: '0.5rem' }} onClick={() => { setShowActivitySummary(false); setCurrentQuestionIndex(0); setUserAnswers({}); }}>Tentar Novamente</Button>
                            </div>
                        )
                        }
                    </div>
                );
            })() : (
                localVideoSrc ? (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#000' }}>
                        <video
                            ref={videoRef}
                            src={localVideoSrc}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            controls
                            playsInline
                            onTimeUpdate={handleVideoTimeUpdate}
                            title={lesson.title}
                        />
                        {/* Speed Controller Overlay */}
                        <div style={{
                            position: 'absolute', top: '10px', right: '10px', zIndex: 10,
                            display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.6)',
                            padding: '4px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {[1, 1.25, 1.5, 1.75, 2].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => {
                                        if (videoRef.current) {
                                            videoRef.current.playbackRate = speed;
                                            setPlaybackRate(speed);
                                        }
                                    }}
                                    style={{
                                        border: 'none', background: playbackRate === speed ? theme.colors.primary : 'transparent',
                                        color: 'white', borderRadius: '15px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer'
                                    }}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    lesson.videoUrl ? (
                        <div id="lesson-header-anchor" style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden',
                            backgroundColor: '#000'
                        }}>
                            {/* Container para escala dinÃ¢mica - controles ficaram maiores agora */}
                            {(() => {
                                const minHeight = 120;
                                const maxHeight = 300;
                                // Ajustado para controles maiores e escala interna alta para evitar empilhamento
                                const minScale = 4.0;
                                const maxScale = 2.2;

                                const clampedHeight = Math.max(minHeight, Math.min(maxHeight, videoHeight));
                                const ratio = (clampedHeight - minHeight) / (maxHeight - minHeight);
                                const scaleFactor = minScale - (ratio * (minScale - maxScale));
                                const scaleValue = 1 / scaleFactor;

                                return (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        width: `${scaleFactor * 100}%`,
                                        height: `${scaleFactor * 100}%`,
                                        transform: `translate(-50%, -50%) scale(${scaleValue})`,
                                        transformOrigin: 'center center'
                                    }}>
                                        <iframe
                                            src={convertToDirectLink(lesson.videoUrl)}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                border: 'none'
                                            }}
                                            allow="autoplay; encrypted-media; fullscreen"
                                            title={lesson.title}
                                            allowFullScreen
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    ) : null
                )
            )}
        </div >
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

                {!isLibrary && (
                    <button onClick={toggleWatched} style={{ background: 'none', border: 'none', color: isWatched ? theme.colors.success : 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                        {isWatched ? <FaCheckCircle size={18} /> : <FaRegCircle size={18} />}
                    </button>
                )}
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
                    {isSticky && !isLibrary && (
                        <div style={{
                            width: '100%',
                            maxWidth: '900px',
                            margin: '0 auto',
                            background: 'black',
                            position: 'relative'
                        }}>
                            {MainContentArea}
                            {/* Novo Controlador de Redimensionamento: Aba Azul Pequena */}
                            <div
                                onMouseDown={handleResizeStart}
                                onTouchStart={handleResizeStart}
                                style={{
                                    position: 'absolute', bottom: -21, right: '21%',
                                    width: '45px',
                                    height: '20px',
                                    cursor: 'ns-resize',
                                    zIndex: 300,
                                    touchAction: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: theme.colors.primary,
                                    borderRadius: '0 0 8px 8px',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    borderTop: 'none'
                                }}
                                title="Arraste para redimensionar"
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                    <div style={{ width: '15px', height: '2px', background: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
                                    <div style={{ width: '15px', height: '2px', background: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>

                            {/* Non-Sticky Video Here (If Disabled) */}
                            {!isSticky && !isLibrary && MainContentArea}

                            {/* Nav & Action Buttons */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.3rem', background: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}`,
                                position: 'relative', zIndex: 50
                            }}>
                                <Button disabled={!prevLessonId} onClick={() => {
                                    if (prevLessonId) {
                                        // FORCE SAVE before navigating
                                        if (editorRef.current) {
                                            const currentContent = editorRef.current.innerHTML;
                                            setTabs(prev => {
                                                const newTabs = prev.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
                                                localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
                                                return newTabs;
                                            });
                                        }
                                        navigate(`/course/${courseId}/lesson/${prevLessonId}`);
                                    }
                                }} variant="secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}><FaStepBackward /> Ant</Button>

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

                                <Button disabled={!nextLessonId} onClick={() => {
                                    if (nextLessonId) {
                                        // FORCE SAVE before navigating
                                        if (editorRef.current) {
                                            const currentContent = editorRef.current.innerHTML;
                                            setTabs(prev => {
                                                const newTabs = prev.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
                                                localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
                                                return newTabs;
                                            });
                                        }
                                        navigate(`/course/${courseId}/lesson/${nextLessonId}`);
                                    }
                                }} variant="primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Prox <FaStepForward /></Button>
                            </div>

                            {/* Lesson Materials Section */}
                            {lesson.contents && lesson.contents.length > 0 && (
                                <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.text.secondary, fontWeight: 700, letterSpacing: '0.05rem', textTransform: 'uppercase' }}>Conteúdos Disponíveis</h4>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: isLibrary ? 'column' : 'row',
                                        flexWrap: 'wrap',
                                        gap: '0.5rem'
                                    }}>
                                        {lesson.contents.map(content => {
                                            const isLocal = !!localMaterialUrls[content.id];
                                            const isDownloadingMat = !!downloadingMaterials[content.id];

                                            return (
                                                <div key={content.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: isLibrary ? '8px' : '6px',
                                                    border: `1px solid ${isLocal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                                                    overflow: 'hidden'
                                                }}>
                                                    <button
                                                        onClick={async () => {
                                                            const isLocal = !!localMaterialUrls[content.id];
                                                            const url = localMaterialUrls[content.id] || convertToDirectLink(content.url);
                                                            const isDriveUrl = content.url.includes('drive.google.com');

                                                            if ((content.type === 'epub' || content.type === 'pdf') && !isLocal && isDriveUrl) {
                                                                try {
                                                                    setIsPreparingId(content.id);
                                                                    const downloadLink = convertToDownloadLink(content.url);
                                                                    const response = await fetch(downloadLink);
                                                                    if (!response.ok) throw new Error('Fetch direct failed');
                                                                    const blob = await response.blob();
                                                                    const blobUrl = URL.createObjectURL(blob);

                                                                    // ForÃ§ar extensÃ£o no blob URL para o browser reconhecer
                                                                    const finalUrl = content.type === 'epub' ? `${blobUrl}#.epub` : `${blobUrl}#.pdf`;
                                                                    setViewingContent({ ...content, url: finalUrl });
                                                                } catch (e) {
                                                                    console.warn("Direct fetch fail, using proxy...");
                                                                    try {
                                                                        const downloadLink = convertToDownloadLink(content.url);
                                                                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(downloadLink)}`;
                                                                        const response = await fetch(proxyUrl);
                                                                        if (!response.ok) throw new Error('Proxy error');
                                                                        const blob = await response.blob();
                                                                        const blobUrl = URL.createObjectURL(blob);
                                                                        const finalUrl = content.type === 'epub' ? `${blobUrl}#.epub` : `${blobUrl}#.pdf`;
                                                                        setViewingContent({ ...content, url: finalUrl });
                                                                    } catch (proxyError) {
                                                                        console.error("All fetch methods failed:", proxyError);
                                                                        setViewingContent({ ...content, url });
                                                                    }
                                                                } finally {
                                                                    setIsPreparingId(null);
                                                                }
                                                            } else if (content.type === 'pdf' || content.type === 'epub' || content.type === 'mp3') {
                                                                setViewingContent({ ...content, url });
                                                            } else {
                                                                window.open(url, '_blank');
                                                            }
                                                        }}
                                                        disabled={isPreparingId === content.id}
                                                        style={{
                                                            background: 'none', border: 'none',
                                                            padding: isLibrary ? '0.6rem 0.8rem' : '0.4rem 0.6rem',
                                                            color: isLocal ? '#4ade80' : 'white',
                                                            display: 'flex', alignItems: 'center',
                                                            gap: isLibrary ? '0.8rem' : '0.5rem',
                                                            cursor: 'pointer',
                                                            fontSize: isLibrary ? '0.85rem' : '0.8rem',
                                                            flex: isLibrary ? 1 : 'unset',
                                                            textAlign: 'left',
                                                            opacity: isPreparingId === content.id ? 0.6 : 1
                                                        }}
                                                    >
                                                        <div style={{ width: isLibrary ? '28px' : '22px', height: isLibrary ? '28px' : '22px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isPreparingId === content.id ? <FaSpinner className="spin" size={14} /> : (
                                                                <>
                                                                    {content.type === 'pdf' && <FaFilePdf color="#ff4444" size={14} />}
                                                                    {content.type === 'epub' && <FaBookOpen color="#4ade80" size={14} />}
                                                                    {content.type === 'mp3' && <FaPlay color="#60a5fa" size={14} />}
                                                                    {content.type === 'link' && <FaLink color="#fbbf24" size={14} />}
                                                                </>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 600 }}>{content.title}</span>
                                                        </div>
                                                        {isLocal && <FaCheckCircle size={10} style={{ marginLeft: 'auto' }} color="#10b981" />}
                                                    </button>
                                                    <button
                                                        onClick={() => isLocal ? handleDeleteMaterial(content) : handleDownloadMaterial(content)}
                                                        style={{
                                                            padding: isLibrary ? '0.5rem 0.8rem' : '0.1rem 0.5rem',
                                                            display: 'flex', alignItems: 'center',
                                                            color: isLocal ? '#fca5a5' : theme.colors.text.secondary,
                                                            background: 'none', border: 'none',
                                                            borderLeft: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                                                        }}
                                                        title={isLocal ? "Excluir Download" : "Baixar"}
                                                    >
                                                        {isDownloadingMat ? <FaSpinner className="spin" size={12} /> : (isLocal ? <FaTrash size={12} /> : <FaDownload size={12} />)}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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

                                {/* AI Correction Toast */}
                                {showAiToast && (
                                    <div style={{
                                        position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', zIndex: 30,
                                        background: 'rgba(99, 102, 241, 0.9)', color: 'white', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.85rem',
                                        fontWeight: 600, boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                        animation: 'fadeInOut 3s forwards'
                                    }}>
                                        ✨ Correção concluída!
                                    </div>
                                )}

                                {/* Header: Title + Community Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: theme.colors.text.primary }}>
                                        {isLibrary ? `Anotações do Módulo: ${currentModule?.title || ''}` : 'Minhas Anotações'}
                                    </h3>
                                    {!isLibrary && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button title="Salvar Online" onClick={handleShareNote} disabled={isSharing} style={{ background: 'rgba(59, 130, 246, 0.2)', border: 'none', borderRadius: '6px', color: '#60a5fa', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FaCloudUploadAlt size={16} />
                                            </button>
                                            <button title="Comunidade" onClick={handleOpenCommunity} style={{ background: theme.colors.surfaceHighlight, border: 'none', borderRadius: '6px', color: 'white', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FaUsers size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Tabs Bar - Only for non-library lessons */}
                                {!isLibrary && (
                                    <div style={{ display: 'flex', overflowX: 'auto', gap: '0.3rem', paddingBottom: '2px', borderBottom: `1px solid ${theme.colors.border}` }}>
                                        {tabs.map(tab => (
                                            <div key={tab.id}
                                                data-tab-id={tab.id}
                                                onMouseDown={(e) => handleTabPressStart(e, tab.id)}
                                                onMouseMove={handleTabPressMove}
                                                onMouseUp={handleTabPressEnd}
                                                onMouseLeave={handleTabPressEnd}
                                                onTouchStart={(e) => handleTabPressStart(e, tab.id)}
                                                onTouchMove={handleTabPressMove}
                                                onTouchEnd={handleTabPressEnd}
                                                onClick={() => handleTabClick(tab.id)}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '8px 8px 0 0',
                                                    background: activeTabId === tab.id && !showCommunity ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                                                    borderBottom: activeTabId === tab.id && !showCommunity ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
                                                    fontSize: '0.8rem',
                                                    cursor: draggedTabId === tab.id ? 'grabbing' : 'grab',
                                                    whiteSpace: 'nowrap',
                                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                    color: activeTabId === tab.id && !showCommunity ? theme.colors.primary : 'rgba(255,255,255,0.6)',
                                                    transition: draggedTabId ? 'none' : 'all 0.2s ease',
                                                    fontWeight: activeTabId === tab.id ? 600 : 400,
                                                    opacity: draggedTabId === tab.id ? 0.5 : 1,
                                                    transform: draggedTabId === tab.id ? `translateX(${dragCurrentX.current - dragStartPos.current.x}px)` : 'none',
                                                    zIndex: draggedTabId === tab.id ? 100 : 1,
                                                    position: 'relative',
                                                    userSelect: 'none',
                                                    touchAction: 'none'
                                                }}
                                            >
                                                {tab.id !== 'main' && <FaStickyNote size={10} />}
                                                {tab.title}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                                                    {tab.id !== tabs[0].id && (
                                                        <span onClick={(e) => handleMakeMainTab(e, tab.id)} title="Tornar Principal" style={{ opacity: 0.5, fontSize: '10px' }}><FaArrowUp /></span>
                                                    )}
                                                    {tab.id !== 'main' && tabs.length > 1 && (
                                                        <span onClick={(e) => handleCloseTab(e, tab.id)} style={{ opacity: 0.5, fontSize: '10px' }}><FaTimes /></span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => handleCreateTab()} style={{ background: 'none', border: 'none', color: theme.colors.primary, cursor: 'pointer', padding: '0.4rem' }}>
                                            <FaPlus />
                                        </button>
                                    </div>
                                )}

                                {/* Editor Area */}
                                <div style={{
                                    border: isLibrary ? 'none' : `1px solid ${theme.colors.border}`,
                                    borderTop: 'none',
                                    borderRadius: isLibrary ? '0' : '0 0 8px 8px',
                                    background: isLibrary ? 'transparent' : 'rgba(20, 20, 30, 0.4)',
                                    backdropFilter: isLibrary ? 'none' : 'blur(5px)',
                                    minHeight: isLibrary ? 'none' : '400px',
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
                                                        <div key={idx} style={{
                                                            background: 'rgba(255,255,255,0.03)',
                                                            padding: '1rem',
                                                            borderRadius: '8px',
                                                            border: `1px solid ${theme.colors.border}`,
                                                            backdropFilter: 'blur(5px)'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                                <strong style={{ color: theme.colors.secondary }}>{note.user}</strong>
                                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(note.timestamp).toLocaleDateString()}</span>
                                                                    <button
                                                                        onClick={() => handleImportNote(note)}
                                                                        title="Importar para minhas notas"
                                                                        style={{
                                                                            background: 'rgba(99, 102, 241, 0.2)',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            color: theme.colors.primary,
                                                                            padding: '0.2rem 0.5rem',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.7rem',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}
                                                                    >
                                                                        <FaCopy size={10} /> Importar
                                                                    </button>
                                                                    {(note.user === currentUser || isAdmin) && (
                                                                        <button onClick={() => handleDeletePublicNote(note.user)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><FaTrash size={12} /></button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.85rem', lineHeight: '1.4', opacity: 0.9, color: 'white'
                                                            }} dangerouslySetInnerHTML={{ __html: note.content }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : isLibrary ? (
                                        /* Unified Module Notes View for Library Lessons */
                                        /* Unified Module Notes View (Revision Mode) */
                                        <div style={{ padding: '0.4rem 0 1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingBottom: '2rem' }}>
                                                {/* Module Revision List */}
                                                {allModuleGroups.length > 0 ? allModuleGroups.map((group) => {
                                                    const activeId = consolidationActiveTabs[group.lessonId] || group.tabs[0].id;
                                                    const activeTab = group.tabs.find(t => t.id === activeId) || group.tabs[0];
                                                    const isCurrentLessonCard = group.lessonId === lessonId;

                                                    return (
                                                        <div key={group.lessonId} style={{
                                                            background: isCurrentLessonCard ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                                            borderRadius: '12px',
                                                            border: isCurrentLessonCard ? `1px solid ${theme.colors.primary}60` : `1px solid rgba(255, 255, 255, 0.1)`,
                                                            overflow: 'hidden',
                                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                                                        }}>
                                                            <div style={{
                                                                padding: '0.7rem 0.9rem',
                                                                background: isCurrentLessonCard ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                                                borderBottom: isCurrentLessonCard ? `1px solid ${theme.colors.primary}30` : '1px solid rgba(255, 255, 255, 0.05)',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                flexWrap: 'wrap',
                                                                gap: '0.5rem'
                                                            }}>
                                                                <div
                                                                    onClick={() => !isCurrentLessonCard && setPendingJumpLesson({ id: group.lessonId, title: group.lessonTitle })}
                                                                    style={{
                                                                        color: isCurrentLessonCard ? '#818cf8' : 'rgba(255, 255, 255, 0.6)',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 800,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.5px',
                                                                        cursor: isCurrentLessonCard ? 'default' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}
                                                                >
                                                                    {group.lessonTitle} {isCurrentLessonCard && '(Atual)'}
                                                                    {!isCurrentLessonCard && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.4, fontSize: '0.6rem' }}>
                                                                            <FaStepForward size={8} /> Ir para aula
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {group.tabs.length > 1 && (
                                                                    <div style={{ display: 'flex', gap: '3px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px', borderRadius: '6px' }}>
                                                                        {group.tabs.map(tab => (
                                                                            <button
                                                                                key={tab.id}
                                                                                onClick={() => setConsolidationActiveTabs(prev => ({ ...prev, [group.lessonId]: tab.id }))}
                                                                                style={{
                                                                                    padding: '3px 9px',
                                                                                    fontSize: '0.65rem',
                                                                                    borderRadius: '4px',
                                                                                    border: 'none',
                                                                                    cursor: 'pointer',
                                                                                    background: activeId === tab.id ? (isCurrentLessonCard ? theme.colors.primary : 'rgba(255, 255, 255, 0.2)') : 'transparent',
                                                                                    color: activeId === tab.id ? 'white' : 'rgba(255, 255, 255, 0.4)',
                                                                                    fontWeight: 700,
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                {tab.title}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div style={{ padding: '0.9rem 1.1rem' }}>
                                                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: isCurrentLessonCard ? 'white' : 'rgba(255, 255, 255, 0.9)', fontWeight: 700 }}>
                                                                    {activeTab.title}
                                                                </h3>
                                                                <div style={{
                                                                    fontSize: '0.9rem',
                                                                    lineHeight: '1.6',
                                                                    color: isCurrentLessonCard ? 'white' : 'rgba(255, 255, 255, 0.85)',
                                                                }} dangerouslySetInnerHTML={{ __html: activeTab.content }} />
                                                            </div>
                                                        </div>
                                                    );
                                                }) : (
                                                    <p style={{ textAlign: 'center', opacity: 0.3, marginTop: '2rem', fontSize: '0.8rem' }}>Nenhuma outra anotação neste módulo.</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Toolbar - Sticky/Fixed at the Top */}
                                            <div style={{
                                                display: 'flex', padding: '0.5rem',
                                                background: 'rgba(30, 30, 40, 0.98)',
                                                borderBottom: `1px solid ${theme.colors.border}`,
                                                gap: '0.3rem', flexWrap: 'wrap',
                                                position: isToolbarSticky ? 'fixed' : 'sticky',
                                                top: 0,
                                                left: isToolbarSticky ? 0 : 'auto',
                                                right: isToolbarSticky ? 0 : 'auto',
                                                zIndex: isToolbarSticky ? 9999999 : 100,
                                                borderRadius: isToolbarSticky ? 0 : '0 0 4px 4px',
                                                justifyContent: 'space-between',
                                                backdropFilter: 'blur(15px)',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                                                    <ToolbarBtn onClick={() => execCmd('bold')} icon={<FaBold />} />
                                                    <ToolbarBtn onClick={() => execCmd('italic')} icon={<FaItalic />} />
                                                    <ToolbarBtn onClick={() => execCmd('underline')} icon={<FaUnderline />} />
                                                    <div style={{ width: 1, height: '15px', background: 'white', opacity: 0.2, margin: '0 4px' }} />
                                                    <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} icon={<FaListUl />} />
                                                    <ToolbarBtn onClick={() => execCmd('hiliteColor', 'rgba(255, 255, 0, 0.3)')} icon={<FaHighlighter />} />
                                                    <ToolbarBtn onClick={() => execCmd('removeFormat')} icon={<FaEraser />} />
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {/* Toolbar Priority Toggle */}
                                                    <button
                                                        onClick={toggleToolbarSticky}
                                                        title={isToolbarSticky ? "Modo Prioridade Ativado (Acima de Tudo)" : "Modo Prioridade Desativado"}
                                                        style={{
                                                            background: isToolbarSticky ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.05)',
                                                            border: isToolbarSticky ? `1px solid ${theme.colors.primary}` : '1px solid transparent',
                                                            borderRadius: '6px',
                                                            color: isToolbarSticky ? theme.colors.primary : 'rgba(255,255,255,0.4)',
                                                            padding: '0.35rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                                            fontSize: '0.7rem', fontWeight: 600
                                                        }}
                                                    >
                                                        {isToolbarSticky ? <FaToggleOn size={14} /> : <FaToggleOff size={14} />}
                                                        {window.innerWidth > 480 && (isToolbarSticky ? 'SOBREPOSIÇÃO ON' : 'SOBREPOSIÇÃO OFF')}
                                                    </button>

                                                    <div style={{ width: 1, height: '15px', background: 'white', opacity: 0.1 }} />

                                                    {/* AI Button */}
                                                    <button
                                                        onClick={handleMagicOrganize}
                                                        disabled={isOrganizing}
                                                        title={isOrganizing ? "Organizando..." : "Organizar com IA"}
                                                        style={{
                                                            background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '0.4rem 0.8rem',
                                                            color: 'white',
                                                            cursor: isOrganizing ? 'wait' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: isOrganizing ? 0.6 : 1,
                                                            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)'
                                                        }}
                                                    >
                                                        <FaMagic size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Editor */}
                                            <div
                                                onClick={() => editorRef.current?.focus()}
                                                style={{ padding: '1.2rem', minHeight: '450px', cursor: 'text', position: 'relative' }}
                                            >
                                                {/* Spacer for Fixed Toolbar on Mobile */}
                                                {isToolbarSticky && <div style={{ height: '40px' }} />}

                                                <div
                                                    ref={editorRef}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    onInput={(e) => saveCurrentTab(e.currentTarget.innerHTML)}
                                                    style={{
                                                        minHeight: '400px', outline: 'none', lineHeight: '1.6', fontSize: '0.95rem',
                                                        color: 'rgba(255,255,255,0.9)',
                                                        width: '100%',
                                                        WebkitUserSelect: 'text',
                                                        userSelect: 'text'
                                                    }}
                                                />
                                            </div>

                                            {/* Saving Indicator */}
                                            <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: '0.7rem', opacity: 0.4 }}>
                                                {isSaving ? 'Salvando alterações...' : 'Alterações salvas'}
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
                .force-landscape-rotate {
                    width: 100vh !important;
                    height: 100vw !important;
                    transform: translate(-50%, -50%) rotate(90deg) !important;
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform-origin: center !important;
                    object-fit: contain !important;
                    background: black !important;
                    z-index: 999999 !important;
                    aspect-ratio: auto !important;
                    margin: 0 !important;
                    display: block !important;
                }
                
                .force-landscape-rotate iframe, .force-landscape-rotate video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: contain !important;
                }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
            {/* Content Viewing Modal (PDF / EPUB / MP3) */}
            {viewingContent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            {viewingContent.type === 'pdf' && <FaFilePdf color="#ff4444" />}
                            {viewingContent.type === 'epub' && <FaBookOpen color="#4ade80" />}
                            {viewingContent.type === 'mp3' && <FaMusic color="#60a5fa" />}
                            <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 600 }}>{viewingContent.title}</h3>
                        </div>
                        <button onClick={() => setViewingContent(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}><FaTimes size={18} /></button>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', background: '#121212', position: 'relative' }}>
                        {(() => {
                            const isLocal = viewingContent.url.startsWith('blob:') || viewingContent.url.startsWith('http://localhost') || viewingContent.url.startsWith('cdvfile:');
                            const isDriveUrl = viewingContent.url.includes('drive.google.com');

                            if (viewingContent.type === 'pdf') {
                                // On web, use iframe for Drive PDFs to avoid CORS. In native or for local files, use the PDF viewer.
                                if (isDriveUrl && !isLocal && !isPlatformNative()) {
                                    return (
                                        <iframe
                                            src={convertToDirectLink(viewingContent.url)}
                                            style={{ width: '100%', height: '100%', border: 'none' }}
                                            title={viewingContent.title}
                                        />
                                    );
                                }
                                return (
                                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                                        <Viewer
                                            fileUrl={viewingContent.url}
                                            plugins={[defaultLayoutPluginInstance]}
                                            theme="dark"
                                        />
                                    </Worker>
                                );
                            }

                            if (viewingContent.type === 'epub') {
                                return (
                                    <ReactReader
                                        url={viewingContent.url}
                                        location={epubLocation}
                                        locationChanged={(loc: string | number) => setEpubLocation(loc)}
                                        swipeable={true}
                                        epubInitOptions={{
                                            openAs: 'epub'
                                        }}
                                        epubOptions={{
                                            allowPopups: true,
                                            allowScriptedContent: true
                                        }}
                                    />
                                );
                            }

                            if (viewingContent.type === 'mp3') {
                                return (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem' }}>
                                        <div style={{
                                            width: '120px', height: '120px', borderRadius: '50%',
                                            background: 'rgba(99, 102, 241, 0.1)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <FaMusic size={50} color={theme.colors.primary} />
                                        </div>
                                        <audio controls autoPlay src={viewingContent.url} style={{ width: '100%', maxWidth: '400px' }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ color: 'white', margin: '0 0 0.5rem 0', fontWeight: 500 }}>{viewingContent.title}</p>
                                            <p style={{ color: theme.colors.text.secondary, margin: 0, fontSize: '0.85rem' }}>Reproduzindo material de áudio</p>
                                        </div>
                                    </div>
                                );
                            }

                            return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Formato não suportado para visualização direta.</div>;
                        })()}
                    </div>
                </div>
            )}

            {/* Rename Tab Modal - VIP Style */}
            {renamingTab && (
                <div
                    onClick={() => setRenamingTab(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, backdropFilter: 'blur(8px)',
                        padding: '1rem'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: theme.colors.surface,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.borderRadius.lg,
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '400px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                    >
                        <h2 style={{
                            margin: 0,
                            marginBottom: '0.5rem',
                            fontSize: '1.25rem',
                            color: theme.colors.text.primary,
                            fontWeight: 600
                        }}>
                            Renomear Aba
                        </h2>

                        <p style={{
                            margin: '0 0 1rem 0',
                            color: theme.colors.text.secondary,
                            fontSize: '0.9rem',
                            lineHeight: '1.5'
                        }}>
                            Digite o novo nome para identificar esta anotação.
                        </p>

                        <form onSubmit={(e) => { e.preventDefault(); confirmRename(); }}>
                            <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                placeholder="Novo nome da aba..."
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

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setRenamingTab(null)}
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
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!renameValue.trim()}
                                    style={{
                                        padding: '0.6rem 1.5rem',
                                        borderRadius: theme.borderRadius.md,
                                        border: 'none',
                                        background: renameValue.trim() ? theme.colors.primary : 'rgba(99, 102, 241, 0.3)',
                                        color: 'white',
                                        cursor: renameValue.trim() ? 'pointer' : 'not-allowed',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Jump Confirmation Modal - VIP/Admin Style */}
            {pendingJumpLesson && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1rem'
                }} onClick={() => setPendingJumpLesson(null)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: theme.colors.surface,
                            borderRadius: theme.borderRadius.lg,
                            padding: '1.5rem',
                            maxWidth: '400px',
                            width: '100%',
                            border: `1px solid ${theme.colors.border}`,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            animation: 'modalFadeIn 0.3s ease-out'
                        }}
                    >
                        <h2 style={{
                            margin: 0,
                            marginBottom: '0.5rem',
                            fontSize: '1.25rem',
                            color: theme.colors.text.primary,
                            fontWeight: 600
                        }}>
                            Ir para esta aula?
                        </h2>

                        <p style={{
                            margin: '0 0 1.5rem 0',
                            color: theme.colors.text.secondary,
                            fontSize: '0.9rem',
                            lineHeight: '1.5'
                        }}>
                            Você está prestes a sair desta página para assistir à aula:<br />
                            <strong style={{ color: 'white', display: 'block', marginTop: '0.5rem' }}>
                                {pendingJumpLesson.title}
                            </strong>
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: '0.75rem',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setPendingJumpLesson(null)}
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
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    // FORCE SAVE before navigating to prevent data loss
                                    if (editorRef.current) {
                                        const currentContent = editorRef.current.innerHTML;
                                        setTabs(prev => {
                                            const newTabs = prev.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
                                            localStorage.setItem(TABS_KEY, JSON.stringify(newTabs));
                                            return newTabs;
                                        });
                                    }
                                    navigate(`/course/${courseId}/lesson/${pendingJumpLesson.id}`);
                                    setPendingJumpLesson(null);
                                }}
                                style={{
                                    padding: '0.6rem 1.5rem',
                                    borderRadius: theme.borderRadius.md,
                                    border: 'none',
                                    background: theme.colors.primary,
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                Sim, vamos!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalFadeIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default LessonView;
