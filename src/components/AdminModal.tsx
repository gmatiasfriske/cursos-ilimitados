import React, { useState } from 'react';
import type { AppData } from '../services/dataService';
import type { Course, Lesson } from '../types';
import { theme } from '../theme';
import Modal from './UI/Modal';
import Button from './UI/Button';
import Input from './UI/Input';
import PasswordModal from './UI/PasswordModal';
import ConfirmModal from './UI/ConfirmModal';
import {
    FaTrash, FaArrowUp, FaArrowDown, FaPlus, FaChevronDown, FaChevronRight, FaTimes,
    FaFilePdf, FaBookOpen, FaMusic, FaLink
} from 'react-icons/fa';
import { MdQuiz } from 'react-icons/md';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AppData;
    onSave: (data: AppData) => void;
    setIsAdmin: (isAdmin: boolean) => void;
    navigate: (path: string) => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, data, onSave, setIsAdmin, navigate }) => {
    const isAdminMode = localStorage.getItem('is_admin') === 'true';
    const [isAuthenticated, setIsAuthenticated] = useState(isAdminMode);
    const [editData, setEditData] = useState<AppData>(JSON.parse(JSON.stringify(data)));
    const [showPasswordModal, setShowPasswordModal] = useState(!isAdminMode);

    // Collapsible states
    const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    const [confirmDelete, setConfirmDelete] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const toggleCourse = (id: string) => {
        setExpandedCourses(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleModule = (id: string) => {
        setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePasswordSubmit = (pass: string) => {
        if (pass === '..') {
            setIsAuthenticated(true);
            setIsAdmin(true);
            setShowPasswordModal(false);
        } else {
            alert('Senha incorreta');
        }
    };

    const handleSaveAndClose = () => {
        onSave(editData);
        onClose();
    };

    // --- CRUD Handlers ---
    const addCourse = () => {
        const newCourse: Course = {
            id: generateId(),
            title: 'Novo Curso',
            imageUrl: '',
            modules: []
        };
        setEditData({ ...editData, courses: [...editData.courses, newCourse] });
    };

    const deleteCourse = (id: string, title: string) => {
        setConfirmDelete({
            open: true,
            title: 'Excluir Curso',
            message: `Tem certeza que deseja excluir o curso "${title}"? Todos os módulos e aulas serão removidos permanentemente.`,
            onConfirm: () => {
                setEditData(prev => ({ ...prev, courses: prev.courses.filter(c => c.id !== id) }));
                setConfirmDelete(p => ({ ...p, open: false }));
            }
        });
    };

    const updateCourse = (id: string, field: keyof Course, value: any) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => c.id === id ? { ...c, [field]: value } : c)
        });
    };

    const addModule = (courseId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: [...c.modules, { id: generateId(), title: 'Novo Módulo', lessons: [] }]
                    };
                }
                return c;
            })
        });
    };

    const deleteModule = (courseId: string, moduleId: string, title: string) => {
        setConfirmDelete({
            open: true,
            title: 'Excluir Módulo',
            message: `Deseja excluir o módulo "${title}"? Todas as aulas deste módulo serão removidas.`,
            onConfirm: () => {
                setEditData(prev => ({
                    ...prev,
                    courses: prev.courses.map(c => {
                        if (c.id === courseId) {
                            return { ...c, modules: c.modules.filter(m => m.id !== moduleId) };
                        }
                        return c;
                    })
                }));
                setConfirmDelete(p => ({ ...p, open: false }));
            }
        });
    };

    const updateModule = (courseId: string, moduleId: string, title: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => m.id === moduleId ? { ...m, title } : m)
                    };
                }
                return c;
            })
        });
    };

    const addLesson = (courseId: string, moduleId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: [...m.lessons, { id: generateId(), title: 'Nova Aula', videoUrl: '' }]
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const addLibrary = (courseId: string, moduleId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: [...m.lessons, {
                                        id: generateId(),
                                        title: 'Biblioteca de Materiais',
                                        contents: [{ id: generateId(), type: 'pdf', title: 'Novo PDF', url: '' }]
                                    }]
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const addActivity = (courseId: string, moduleId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: [...m.lessons, {
                                        id: generateId(),
                                        title: 'Nova Atividade',
                                        activity: {
                                            questions: [{
                                                id: generateId(),
                                                question: '',
                                                options: ['', ''],
                                                correctOptionIndex: 0
                                            }]
                                        }
                                    }]
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const deleteLesson = (courseId: string, moduleId: string, lessonId: string, title: string) => {
        setConfirmDelete({
            open: true,
            title: 'Excluir Aula',
            message: `Deseja excluir a aula "${title}"?`,
            onConfirm: () => {
                setEditData(prev => ({
                    ...prev,
                    courses: prev.courses.map(c => {
                        if (c.id === courseId) {
                            return {
                                ...c,
                                modules: c.modules.map(m => {
                                    if (m.id === moduleId) {
                                        return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
                                    }
                                    return m;
                                })
                            };
                        }
                        return c;
                    })
                }));
                setConfirmDelete(p => ({ ...p, open: false }));
            }
        });
    };

    const updateLesson = (courseId: string, moduleId: string, lessonId: string, field: keyof Lesson, value: any) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: m.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l)
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const updateActivity = (courseId: string, moduleId: string, lessonId: string, questionId: string, field: string, value: any, optionIndex?: number) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: m.lessons.map(l => {
                                        if (l.id === lessonId && l.activity) {
                                            const currentQuestions = l.activity.questions || [];
                                            const newQuestions = currentQuestions.map(q => {
                                                if (q.id === questionId) {
                                                    const newQ = { ...q };
                                                    if (field === 'question') newQ.question = value;
                                                    if (field === 'correctOptionIndex') newQ.correctOptionIndex = value;
                                                    if (field === 'options' && optionIndex !== undefined) {
                                                        newQ.options = [...(newQ.options || [])];
                                                        newQ.options[optionIndex] = value;
                                                    }
                                                    if (field === 'addOption') {
                                                        newQ.options = [...(newQ.options || []), ''];
                                                    }
                                                    if (field === 'removeOption' && optionIndex !== undefined) {
                                                        newQ.options = (newQ.options || []).filter((_, i) => i !== optionIndex);
                                                    }
                                                    return newQ;
                                                }
                                                return q;
                                            });
                                            return { ...l, activity: { questions: newQuestions } };
                                        }
                                        return l;
                                    })
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const addQuestionToActivity = (courseId: string, moduleId: string, lessonId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: m.lessons.map(l => {
                                        if (l.id === lessonId && l.activity) {
                                            return {
                                                ...l,
                                                activity: {
                                                    questions: [...(l.activity.questions || []), {
                                                        id: generateId(),
                                                        question: '',
                                                        options: ['', ''],
                                                        correctOptionIndex: 0
                                                    }]
                                                }
                                            };
                                        }
                                        return l;
                                    })
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const removeQuestionFromActivity = (courseId: string, moduleId: string, lessonId: string, questionId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: m.lessons.map(l => {
                                        if (l.id === lessonId && l.activity) {
                                            return {
                                                ...l,
                                                activity: {
                                                    questions: (l.activity.questions || []).filter(q => q.id !== questionId)
                                                }
                                            };
                                        }
                                        return l;
                                    })
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const addContentToLesson = (courseId: string, moduleId: string, lessonId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: m.lessons.map(l => {
                                        if (l.id === lessonId) {
                                            return {
                                                ...l,
                                                contents: [...(l.contents || []), {
                                                    id: generateId(),
                                                    type: 'pdf',
                                                    title: '',
                                                    url: ''
                                                }]
                                            };
                                        }
                                        return l;
                                    })
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const updateContentInLesson = (courseId: string, moduleId: string, lessonId: string, contentId: string, field: string, value: any) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: m.lessons.map(l => {
                                        if (l.id === lessonId && l.contents) {
                                            return {
                                                ...l,
                                                contents: l.contents.map(cont => {
                                                    if (cont.id === contentId) {
                                                        return { ...cont, [field]: value };
                                                    }
                                                    return cont;
                                                })
                                            };
                                        }
                                        return l;
                                    })
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    const removeContentFromLesson = (courseId: string, moduleId: string, lessonId: string, contentId: string) => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                return {
                                    ...m,
                                    lessons: m.lessons.map(l => {
                                        if (l.id === lessonId && l.contents) {
                                            return {
                                                ...l,
                                                contents: l.contents.filter(cont => cont.id !== contentId)
                                            };
                                        }
                                        return l;
                                    })
                                };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    // --- Reordering Logic ---
    const moveLesson = (courseId: string, moduleId: string, index: number, direction: 'up' | 'down') => {
        setEditData({
            ...editData,
            courses: editData.courses.map(c => {
                if (c.id === courseId) {
                    return {
                        ...c,
                        modules: c.modules.map(m => {
                            if (m.id === moduleId) {
                                const newLessons = [...m.lessons];
                                if (direction === 'up' && index > 0) {
                                    [newLessons[index], newLessons[index - 1]] = [newLessons[index - 1], newLessons[index]];
                                } else if (direction === 'down' && index < newLessons.length - 1) {
                                    [newLessons[index], newLessons[index + 1]] = [newLessons[index + 1], newLessons[index]];
                                }
                                return { ...m, lessons: newLessons };
                            }
                            return m;
                        })
                    };
                }
                return c;
            })
        });
    };

    // Show password modal when opening admin if not authenticated
    React.useEffect(() => {
        if (isOpen && !isAuthenticated) {
            setShowPasswordModal(true);
        }
    }, [isOpen, isAuthenticated]);

    return (
        <>
            <PasswordModal
                isOpen={showPasswordModal}
                title="Painel Administrativo"
                message="Digite a senha de acesso para gerenciar cursos."
                onConfirm={handlePasswordSubmit}
                onCancel={() => {
                    setShowPasswordModal(false);
                    onClose();
                }}
            />

            <ConfirmModal
                isOpen={confirmDelete.open}
                title={confirmDelete.title}
                message={confirmDelete.message}
                onConfirm={confirmDelete.onConfirm}
                onCancel={() => setConfirmDelete(p => ({ ...p, open: false }))}
                variant="danger"
                confirmText="Excluir"
            />

            <Modal isOpen={isOpen && isAuthenticated} onClose={onClose} title="Painel Administrativo">
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                        <Button onClick={addCourse} variant="secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}><FaPlus /> Novo Curso</Button>
                    </div>

                    {/* Courses List */}
                    {editData.courses.map(course => {
                        const isCourseExpanded = !!expandedCourses[course.id];
                        return (
                            <div key={course.id} style={{
                                marginBottom: '0.8rem',
                                background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.8) 0%, rgba(20, 20, 30, 0.9) 100%)',
                                border: `1px solid ${theme.colors.border}`,
                                padding: '0.6rem',
                                borderRadius: theme.borderRadius.md,
                                boxShadow: theme.shadows.sm,
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.2s ease'
                            }}>
                                <div
                                    onClick={() => toggleCourse(course.id)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.4rem',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isCourseExpanded ? <FaChevronDown size={12} color={theme.colors.primary} /> : <FaChevronRight size={12} color={theme.colors.text.secondary} />}
                                        <h3 style={{ margin: 0, color: isCourseExpanded ? theme.colors.primary : 'white', fontSize: '1rem', fontWeight: 600 }}>
                                            {course.title || 'Sem título'}
                                        </h3>
                                    </div>
                                    <Button variant="danger" onClick={(e) => { e.stopPropagation(); deleteCourse(course.id, course.title); }} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
                                        <FaTrash />
                                    </Button>
                                </div>

                                {isCourseExpanded && (
                                    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                                        <div style={{
                                            display: 'grid',
                                            gap: '0.6rem',
                                            marginBottom: '1rem',
                                            background: 'rgba(0,0,0,0.2)',
                                            padding: '0.8rem',
                                            borderRadius: theme.borderRadius.sm,
                                            border: `1px solid ${theme.colors.border}`
                                        }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: theme.colors.text.secondary, marginBottom: '2px', display: 'block' }}>Nome do Curso</label>
                                                <Input
                                                    value={course.title}
                                                    placeholder="Ex: Treinamento Vai na Bíblia"
                                                    onChange={e => updateCourse(course.id, 'title', e.target.value)}
                                                    style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: theme.colors.text.secondary, marginBottom: '2px', display: 'block' }}>URL da Capa (Google Drive ID)</label>
                                                <Input
                                                    value={course.imageUrl}
                                                    placeholder="ID do arquivo no Drive"
                                                    onChange={e => updateCourse(course.id, 'imageUrl', e.target.value)}
                                                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', paddingTop: '0.5rem' }}>
                                                <label style={{ color: theme.colors.text.secondary, fontSize: theme.typography.sizes.small, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!course.isVip}
                                                        onChange={e => updateCourse(course.id, 'isVip', e.target.checked)}
                                                        style={{ width: '16px', height: '16px', accentColor: theme.colors.primary }}
                                                    />
                                                    Curso VIP
                                                </label>

                                                <label style={{ color: theme.colors.text.secondary, fontSize: theme.typography.sizes.small, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!course.examEnabled}
                                                        onChange={e => updateCourse(course.id, 'examEnabled', e.target.checked)}
                                                        style={{ width: '16px', height: '16px', accentColor: theme.colors.primary }}
                                                    />
                                                    Ativar Prova Especial
                                                </label>
                                            </div>

                                            {course.examEnabled && (
                                                <div style={{ marginTop: '0.8rem' }}>
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => {
                                                            // Close modal and navigate
                                                            onClose();
                                                            navigate(`/admin/exams/${course.id}`);
                                                        }}
                                                        style={{ fontSize: theme.typography.sizes.small, padding: '0.4rem 1rem' }}
                                                    >
                                                        <MdQuiz style={{ marginRight: '8px' }} /> Gerenciar Perguntas da Prova
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Modules */}
                                        <div style={{ paddingLeft: '0.5rem', borderLeft: `2px solid ${theme.colors.surfaceHighlight}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Módulos ({course.modules.length})</h4>
                                                <Button variant="secondary" onClick={() => addModule(course.id)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}><FaPlus /> Novo Módulo</Button>
                                            </div>

                                            {course.modules.length === 0 && <p style={{ fontSize: '0.8rem', color: theme.colors.text.muted, textAlign: 'center', padding: '1rem' }}>Este curso ainda não possui módulos.</p>}

                                            {course.modules.map(module => {
                                                const isModuleExpanded = !!expandedModules[module.id];
                                                return (
                                                    <div key={module.id} style={{
                                                        marginBottom: '0.5rem',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        borderRadius: theme.borderRadius.sm,
                                                        border: `1px solid ${isModuleExpanded ? theme.colors.primary : 'rgba(255,255,255,0.05)'}`,
                                                        overflow: 'hidden',
                                                        transition: 'border-color 0.2s'
                                                    }}>
                                                        <div
                                                            onClick={() => toggleModule(module.id)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                padding: '0.5rem',
                                                                cursor: 'pointer',
                                                                userSelect: 'none'
                                                            }}
                                                        >
                                                            {isModuleExpanded ? <FaChevronDown size={10} color={theme.colors.text.primary} /> : <FaChevronRight size={10} color={theme.colors.text.secondary} />}
                                                            <div style={{ flex: 1 }}>
                                                                <Input
                                                                    value={module.title}
                                                                    placeholder="Nome do Módulo"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={e => updateModule(course.id, module.id, e.target.value)}
                                                                    style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', border: 'none', background: 'rgba(255,255,255,0.05)' }}
                                                                />
                                                            </div>
                                                            <Button variant="danger" onClick={(e) => { e.stopPropagation(); deleteModule(course.id, module.id, module.title); }} style={{ padding: '0.3rem', borderRadius: '4px' }}><FaTrash size={10} /></Button>
                                                        </div>

                                                        {/* Lessons */}
                                                        {isModuleExpanded && (
                                                            <div style={{ padding: '0.5rem', borderTop: `1px solid ${theme.colors.surfaceHighlight}`, animation: 'fadeIn 0.2s' }}>
                                                                {module.lessons.map((lesson, index) => (
                                                                    <div key={lesson.id} style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '0.5rem',
                                                                        marginBottom: '0.4rem',
                                                                        background: lesson.activity ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.03)', // Subtle highlight for activities
                                                                        padding: '0.5rem',
                                                                        borderRadius: '6px',
                                                                        border: `1px solid ${lesson.activity ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                                                                        transition: 'background 0.2s'
                                                                    }}>
                                                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                <button onClick={() => moveLesson(course.id, module.id, index, 'up')} disabled={index === 0} style={{ border: 'none', background: 'none', color: index === 0 ? '#444' : theme.colors.text.secondary, cursor: index === 0 ? 'default' : 'pointer', padding: 2 }}><FaArrowUp size={10} /></button>
                                                                                <button onClick={() => moveLesson(course.id, module.id, index, 'down')} disabled={index === module.lessons.length - 1} style={{ border: 'none', background: 'none', color: index === module.lessons.length - 1 ? '#444' : theme.colors.text.secondary, cursor: index === module.lessons.length - 1 ? 'default' : 'pointer', padding: 2 }}><FaArrowDown size={10} /></button>
                                                                            </div>
                                                                            <div style={{ flex: 1 }}>
                                                                                <Input
                                                                                    value={lesson.title}
                                                                                    onChange={e => updateLesson(course.id, module.id, lesson.id, 'title', e.target.value)}
                                                                                    placeholder={lesson.activity ? "Título da Atividade" : "Título da Aula"}
                                                                                    style={{ padding: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}
                                                                                />
                                                                            </div>
                                                                            <Button variant="danger" onClick={() => deleteLesson(course.id, module.id, lesson.id, lesson.title)} style={{ padding: '0.3rem', borderRadius: '4px' }}><FaTrash size={10} /></Button>
                                                                        </div>

                                                                        {!lesson.activity ? (
                                                                            <div style={{ paddingLeft: '20px' }}>
                                                                                <Input
                                                                                    value={lesson.videoUrl || ''}
                                                                                    onChange={e => updateLesson(course.id, module.id, lesson.id, 'videoUrl', e.target.value)}
                                                                                    placeholder="URL ou ID do Vídeo (Google Drive)"
                                                                                    style={{ padding: '0.3rem', fontSize: '0.75rem' }}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ paddingLeft: '20px', display: 'grid', gap: '0.8rem' }}>
                                                                                {(() => {
                                                                                    const activity = lesson.activity;
                                                                                    const questions = activity.questions || ((activity as any).question ? [{
                                                                                        id: 'legacy',
                                                                                        question: (activity as any).question,
                                                                                        options: (activity as any).options,
                                                                                        correctOptionIndex: (activity as any).correctOptionIndex
                                                                                    }] : []);

                                                                                    return (
                                                                                        <>
                                                                                            {questions.map((q, qIdx) => (
                                                                                                <div key={q.id} style={{
                                                                                                    padding: '0.6rem',
                                                                                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                                                                                    borderRadius: '4px',
                                                                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                                                                    position: 'relative'
                                                                                                }}>
                                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                                                        <label style={{ fontSize: '0.7rem', color: theme.colors.primary, fontWeight: 700 }}>PERGUNTA {qIdx + 1}:</label>
                                                                                                        <button onClick={() => removeQuestionFromActivity(course.id, module.id, lesson.id, q.id)} style={{ background: 'none', border: 'none', color: '#ff4444', padding: '2px', cursor: 'pointer' }}><FaTrash size={10} /></button>
                                                                                                    </div>
                                                                                                    <Input
                                                                                                        value={q.question}
                                                                                                        onChange={e => updateActivity(course.id, module.id, lesson.id, q.id, 'question', e.target.value)}
                                                                                                        placeholder="Escreva a pergunta aqui..."
                                                                                                        style={{ padding: '0.3rem', fontSize: '0.8rem', marginBottom: '8px' }}
                                                                                                    />
                                                                                                    <label style={{ fontSize: '0.7rem', color: theme.colors.text.secondary, fontWeight: 700, marginBottom: '4px', display: 'block' }}>OPÇÕES:</label>
                                                                                                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                                                                                                        {(q.options || []).map((opt, oIdx) => (
                                                                                                            <div key={oIdx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                                                                <input
                                                                                                                    type="radio"
                                                                                                                    name={`correct-${q.id}`}
                                                                                                                    checked={q.correctOptionIndex === oIdx}
                                                                                                                    onChange={() => updateActivity(course.id, module.id, lesson.id, q.id, 'correctOptionIndex', oIdx)}
                                                                                                                />
                                                                                                                <Input
                                                                                                                    value={opt}
                                                                                                                    onChange={e => updateActivity(course.id, module.id, lesson.id, q.id, 'options', e.target.value, oIdx)}
                                                                                                                    placeholder={`Opção ${oIdx + 1}`}
                                                                                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', flex: 1 }}
                                                                                                                />
                                                                                                                <button
                                                                                                                    onClick={() => updateActivity(course.id, module.id, lesson.id, q.id, 'removeOption', null, oIdx)}
                                                                                                                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                                                                                                                    title="Remover Opção"
                                                                                                                >
                                                                                                                    <FaTimes size={10} />
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        <Button
                                                                                                            variant="ghost"
                                                                                                            onClick={() => updateActivity(course.id, module.id, lesson.id, q.id, 'addOption', null)}
                                                                                                            style={{ fontSize: '0.65rem', padding: '0.2rem', border: '1px dashed #444', marginTop: '4px' }}
                                                                                                        >
                                                                                                            + Opção
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                onClick={() => addQuestionToActivity(course.id, module.id, lesson.id)}
                                                                                                style={{ fontSize: '0.75rem', padding: '0.4rem', border: `1px dashed ${theme.colors.primary}`, color: theme.colors.primary }}
                                                                                            >
                                                                                                + Adicionar Pergunta (ID: {questions.length + 1})
                                                                                            </Button>
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        )}

                                                                        {/* Conteúdos (PDF, EPUB, MP3, etc) */}
                                                                        <div style={{ paddingLeft: '20px', marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                                                <label style={{ fontSize: '0.7rem', color: theme.colors.text.secondary, fontWeight: 700 }}>MATERIAIS DE APOIO:</label>
                                                                                <Button variant="ghost" onClick={() => addContentToLesson(course.id, module.id, lesson.id)} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>+ Adicionar</Button>
                                                                            </div>

                                                                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                                                                {(lesson.contents || []).map(content => (
                                                                                    <div key={content.id} style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr 1fr auto', gap: '0.4rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.3rem', borderRadius: '4px' }}>
                                                                                        <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                                                                                            {content.type === 'pdf' && <FaFilePdf size={12} color="#ff4444" />}
                                                                                            {content.type === 'epub' && <FaBookOpen size={12} color="#4ade80" />}
                                                                                            {content.type === 'mp3' && <FaMusic size={12} color="#60a5fa" />}
                                                                                            {content.type === 'link' && <FaLink size={12} color="#fbbf24" />}
                                                                                        </div>
                                                                                        <select
                                                                                            value={content.type}
                                                                                            onChange={e => updateContentInLesson(course.id, module.id, lesson.id, content.id, 'type', e.target.value)}
                                                                                            style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '2px', fontSize: '0.7rem', padding: '0.1rem' }}
                                                                                        >
                                                                                            <option value="pdf">PDF</option>
                                                                                            <option value="epub">EPUB</option>
                                                                                            <option value="mp3">MP3</option>
                                                                                            <option value="link">Link</option>
                                                                                        </select>
                                                                                        <Input
                                                                                            value={content.title}
                                                                                            placeholder="Título do material"
                                                                                            onChange={e => updateContentInLesson(course.id, module.id, lesson.id, content.id, 'title', e.target.value)}
                                                                                            style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem' }}
                                                                                        />
                                                                                        <Input
                                                                                            value={content.url}
                                                                                            placeholder="URL ou ID Drive"
                                                                                            onChange={e => updateContentInLesson(course.id, module.id, lesson.id, content.id, 'url', e.target.value)}
                                                                                            style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem' }}
                                                                                        />
                                                                                        <button onClick={() => removeContentFromLesson(course.id, module.id, lesson.id, content.id)} style={{ background: 'none', border: 'none', color: '#ff4444', padding: '2px', cursor: 'pointer' }}><FaTrash size={10} /></button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => addLesson(course.id, module.id)}
                                                                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', border: `1px dashed ${theme.colors.border}`, borderRadius: '4px' }}
                                                                    >
                                                                        + Ad Aula
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => addActivity(course.id, module.id)}
                                                                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', border: `1px dashed ${theme.colors.primary}`, color: theme.colors.primary, borderRadius: '4px' }}
                                                                    >
                                                                        + Atividade
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => addLibrary(course.id, module.id)}
                                                                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', border: `1px dashed ${theme.colors.secondary}`, color: theme.colors.secondary, borderRadius: '4px' }}
                                                                    >
                                                                        + Materiais
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div style={{
                        position: 'sticky', bottom: '-1.5rem', margin: '0 -1.5rem -1.5rem -1.5rem', padding: '1rem',
                        background: 'rgba(15, 15, 20, 0.95)',
                        borderTop: `1px solid ${theme.colors.border}`,
                        textAlign: 'right',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 -4px 10px rgba(0,0,0,0.3)'
                    }}>
                        <Button
                            onClick={handleSaveAndClose}
                            variant="success"
                            fullWidth
                        >
                            Salvar Todas as Alterações
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default AdminModal;
