import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Course, Question } from '../types';
import { theme } from '../theme';
import { getData, saveData } from '../services/dataService';
import type { AppData } from '../services/dataService';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Card from '../components/UI/Card';
import { FaChevronLeft, FaPlus, FaSave, FaChevronDown, FaChevronUp, FaTimes, FaCheckCircle, FaTrashAlt } from 'react-icons/fa';

const ExamManager: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<AppData | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [examPool, setExamPool] = useState<Question[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [status, setStatus] = useState<'idle' | 'saved' | 'deleted'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const questionsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [courseId]);

    const loadData = async () => {
        const d = await getData();
        setData(d);
        const c = d.courses.find(c => c.id === courseId);
        if (c) {
            setCourse(c);
            const pool = c.examPool || [];
            setExamPool(pool);
            if (pool.length > 0) setExpandedId(pool[pool.length - 1].id);
        }
    };

    const validateQuestions = () => {
        for (const q of examPool) {
            if (!q.question.trim()) return `A pergunta "${q.id.substr(0, 4)}" está vazia.`;
            if (q.options.some(opt => !opt.trim())) return `Uma das opções da pergunta "${q.question.substr(0, 20)}..." está vazia.`;
        }
        return null;
    };

    const handleSave = async () => {
        if (!data || !course) return;

        const err = validateQuestions();
        if (err) {
            setErrorMsg(err);
            setTimeout(() => setErrorMsg(null), 5000);
            return;
        }

        setIsSaving(true);
        setErrorMsg(null);
        setStatus('idle');
        try {
            const updatedCourses = data.courses.map(c =>
                c.id === courseId ? { ...c, examPool } : c
            );
            const newData = { ...data, courses: updatedCourses };
            await saveData(newData);
            setData(newData);
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            setStatus('idle');
        } finally {
            setIsSaving(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: Math.random().toString(36).substr(2, 9),
            question: '',
            options: ['', '', '', ''],
            correctOptionIndex: 0
        };
        const newPool = [...examPool, newQuestion];
        setExamPool(newPool);
        setExpandedId(newQuestion.id);

        setTimeout(() => {
            questionsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };



    const removeQuestion = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExamPool(prev => prev.filter(q => q.id !== id));
        if (expandedId === id) setExpandedId(null);
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        showStatus('deleted');
    };

    const deleteSelected = () => {
        if (selectedIds.size === 0) return;
        setExamPool(prev => prev.filter(q => !selectedIds.has(q.id)));
        if (expandedId && selectedIds.has(expandedId)) setExpandedId(null);
        setSelectedIds(new Set());
        showStatus('deleted');
    };

    const showStatus = (type: 'saved' | 'deleted') => {
        setStatus(type);
        setTimeout(() => setStatus('idle'), 2000);
    };

    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const updateQuestion = (id: string, field: keyof Question, value: any) => {
        setExamPool(examPool.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId: string, optIdx: number, value: string) => {
        setExamPool(examPool.map(q => {
            if (q.id === qId) {
                const newOptions = [...q.options];
                newOptions[optIdx] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const scrollToQuestion = (id: string) => {
        setExpandedId(id);
        const el = document.getElementById(`q-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (!course) {
        return <div style={{ padding: '1rem', textAlign: 'center', color: theme.colors.text.secondary }}>Curso não encontrado.</div>;
    }

    const reversedPool = [...examPool].reverse();

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            color: theme.colors.text.primary,
            fontFamily: theme.typography.fontFamily,
            background: theme.colors.background,
            overflow: 'hidden',
            position: 'relative'
        }}>
            {errorMsg && (
                <div style={{
                    position: 'absolute',
                    top: '4rem',
                    left: 0,
                    right: 0,
                    zIndex: 200,
                    background: '#ef4444',
                    color: 'white',
                    padding: '0.8rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {errorMsg}
                </div>
            )}
            {/* Status Toast */}
            {status !== 'idle' && (
                <div style={{
                    position: 'fixed',
                    top: '6rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: status === 'deleted' ? theme.colors.danger : theme.colors.success,
                    color: 'white',
                    padding: '0.6rem 1.5rem',
                    borderRadius: theme.borderRadius.full,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)',
                    animation: 'slideDown 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }}>
                    {status === 'deleted' ? <FaTrashAlt /> : <FaCheckCircle />}
                    {status === 'deleted' ? 'Questões removidas!' : 'Alterações salvas!'}
                </div>
            )}

            {/* Header Compact - Fixed */}
            <header style={{
                padding: '0.6rem 0.8rem',
                borderBottom: `1px solid ${theme.colors.border}`,
                background: theme.colors.surface,
                backdropFilter: theme.backdropFilter,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 100,
                boxShadow: theme.shadows.sm
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Button variant="ghost" onClick={() => navigate(`/course/${courseId}`)} style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }}>
                        <FaChevronLeft size={14} />
                    </Button>
                    <div>
                        <h1 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Gerenciador</h1>
                        <p style={{ margin: 0, fontSize: '0.6rem', color: theme.colors.text.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{course.title}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            padding: '0.2rem 0.8rem',
                            fontSize: '0.7rem',
                            height: '24px',
                            minWidth: '90px',
                            boxShadow: theme.shadows.glow
                        }}
                    >
                        {isSaving ? 'Fio...' : <><FaSave size={10} style={{ marginRight: '4px' }} /> Salvar</>}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(-1)} style={{ padding: '0.2rem 0.8rem', fontSize: '0.65rem', height: '22px', color: theme.colors.text.secondary }}>
                        Cancelar
                    </Button>
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar Navigation - Thinner */}
                <nav style={{
                    width: '45px',
                    borderRight: `1px solid ${theme.colors.border}`,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0.8rem 0',
                    gap: '4px'
                }}>
                    {reversedPool.map((q) => {
                        const originalIndex = examPool.findIndex(p => p.id === q.id) + 1;
                        const isExpanded = expandedId === q.id;
                        const isSelected = selectedIds.has(q.id);
                        return (
                            <button
                                key={q.id}
                                onClick={() => scrollToQuestion(q.id)}
                                style={{
                                    width: isExpanded ? '34px' : '26px',
                                    height: isExpanded ? '34px' : '26px',
                                    borderRadius: '50%',
                                    background: isSelected ? theme.colors.danger : (isExpanded ? theme.colors.primary : 'rgba(255,255,255,0.03)'),
                                    border: `1px solid ${isSelected ? theme.colors.danger : (isExpanded ? 'transparent' : theme.colors.border)}`,
                                    color: (isExpanded || isSelected) ? 'white' : theme.colors.text.muted,
                                    fontSize: isExpanded ? '0.75rem' : '0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    fontWeight: 700,
                                    flexShrink: 0
                                }}
                            >
                                {originalIndex}
                            </button>
                        );
                    })}
                </nav>

                {/* Main Content Area */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}>
                    {/* Toolbar - Compact */}
                    <div style={{
                        padding: '0.6rem 0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.01)',
                        borderBottom: `1px solid ${theme.colors.border}`
                    }}>
                        <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: theme.colors.text.secondary }}><b>{examPool.length}</b> Questões</span>
                            {selectedIds.size > 0 && (
                                <Button
                                    variant="danger"
                                    onClick={deleteSelected}
                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem', borderRadius: theme.borderRadius.full }}
                                >
                                    <FaTrashAlt size={9} style={{ marginRight: '4px' }} /> {selectedIds.size}
                                </Button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>

                            <Button onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', padding: '0.3rem 0.8rem', borderRadius: theme.borderRadius.md }}>
                                <FaPlus size={8} /> Adicionar
                            </Button>
                        </div>
                    </div>

                    {/* Scroll List - Reduced Padding */}
                    <div
                        ref={questionsContainerRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '0.6rem',
                            scrollBehavior: 'smooth'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '850px', margin: '0 auto' }}>
                            {reversedPool.map((q) => {
                                const originalIndex = examPool.findIndex(p => p.id === q.id) + 1;
                                const isExpanded = expandedId === q.id;
                                const isSelected = selectedIds.has(q.id);

                                return (
                                    <div
                                        key={q.id}
                                        id={`q-${q.id}`}
                                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                                        style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                                    >
                                        <Card style={{
                                            padding: isExpanded ? '0.8rem' : '0.4rem 0.6rem',
                                            background: isSelected ? `${theme.colors.danger}08` : (isExpanded ? theme.colors.surfaceHighlight : 'rgba(255,255,255,0.02)'),
                                            border: `1px solid ${isSelected ? theme.colors.danger : (isExpanded ? theme.colors.primary : theme.colors.border)}`,
                                            borderRadius: theme.borderRadius.md,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: isExpanded ? '0.8rem' : '0',
                                            boxShadow: isExpanded ? '0 5px 15px rgba(0,0,0,0.3)' : 'none',
                                            transition: 'all 0.2s ease',
                                            margin: 0,
                                            boxSizing: 'border-box'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                    <div
                                                        onClick={(e) => toggleSelect(e, q.id)}
                                                        style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            borderRadius: '4px',
                                                            border: `2px solid ${isSelected ? theme.colors.danger : theme.colors.border}`,
                                                            background: isSelected ? theme.colors.danger : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        {isSelected && <FaTimes size={10} color="white" />}
                                                    </div>

                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        color: isSelected ? theme.colors.danger : (isExpanded ? theme.colors.primary : theme.colors.text.muted),
                                                        fontWeight: 800,
                                                        width: '24px',
                                                        flexShrink: 0
                                                    }}>
                                                        #{originalIndex}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.8rem',
                                                        fontWeight: isExpanded ? 600 : 400,
                                                        color: isExpanded ? 'white' : theme.colors.text.primary,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        flex: 1,
                                                        opacity: isExpanded ? 1 : 0.8
                                                    }}>
                                                        {q.question || <i style={{ opacity: 0.4 }}>Vazio...</i>}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px', flexShrink: 0 }}>
                                                    <Button variant="ghost" onClick={(e) => removeQuestion(e, q.id)} style={{ padding: '0', borderRadius: '4px', width: '24px', height: '24px', color: theme.colors.text.muted }}>
                                                        <FaTrashAlt size={11} />
                                                    </Button>
                                                    <div style={{ color: isExpanded ? theme.colors.primary : theme.colors.text.muted, opacity: 0.4, display: 'flex' }}>
                                                        {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', animation: 'fadeIn 0.2s' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <textarea
                                                            value={q.question}
                                                            onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                            placeholder="Enunciado da questão..."
                                                            autoFocus
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(0,0,0,0.25)',
                                                                border: `1px solid ${theme.colors.border}`,
                                                                borderRadius: theme.borderRadius.sm,
                                                                padding: '0.6rem 0.8rem',
                                                                color: theme.colors.text.primary,
                                                                fontSize: '0.9rem',
                                                                minHeight: '80px',
                                                                outline: 'none',
                                                                boxSizing: 'border-box',
                                                                fontFamily: 'inherit',
                                                                resize: 'none',
                                                                transition: 'border-color 0.2s'
                                                            }}
                                                            onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                                                            onBlur={(e) => e.target.style.borderColor = theme.colors.border}
                                                        />
                                                    </div>

                                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                        {q.options.map((opt, optIdx) => (
                                                            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div
                                                                    onClick={() => updateQuestion(q.id, 'correctOptionIndex', optIdx)}
                                                                    style={{
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        borderRadius: '50%',
                                                                        border: `2px solid ${q.correctOptionIndex === optIdx ? theme.colors.primary : theme.colors.border}`,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        flexShrink: 0,
                                                                        background: q.correctOptionIndex === optIdx ? theme.colors.primary : 'transparent',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    {q.correctOptionIndex === optIdx && <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />}
                                                                </div>
                                                                <Input
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                                                                    placeholder={`Opção ${optIdx + 1}`}
                                                                    style={{
                                                                        padding: '0.4rem 0.6rem',
                                                                        fontSize: '0.8rem',
                                                                        height: '34px',
                                                                        background: q.correctOptionIndex === optIdx ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0,0,0,0.15)',
                                                                        borderColor: q.correctOptionIndex === optIdx ? theme.colors.primary : theme.colors.border,
                                                                        color: q.correctOptionIndex === optIdx ? 'white' : theme.colors.text.secondary
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { transform: translate(-50%, -15px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-3px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                *::-webkit-scrollbar {
                    width: 3px;
                }
                *::-webkit-scrollbar-track {
                    background: transparent;
                }
                *::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.05);
                    borderRadius: 10px;
                }
            `}</style>
        </div>
    );
};

export default ExamManager;
