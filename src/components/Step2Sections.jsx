import { useState } from 'react';
import { showToast } from '../utils/toast';
import AIGeneratorModal from './AIGeneratorModal';
import QuestionBankModal from './QuestionBankModal';
import { generateQuestionsWithAI, generateQuestionsFromText, getApiKey } from '../utils/aiGenerator';
import { inferFormatFromTitle, getQuestionFormat } from '../utils/questionUtils';
import AnimatedNumber from './AnimatedNumber';
import NotificationBanner from './NotificationBanner';
import { useCountUp } from '../utils/useCountUp';

const QUESTION_TYPES = [
  { 
    id: 'MCQ', 
    label: 'Multiple choice', 
    desc: 'Options with one correct answer', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    )
  },
  { 
    id: 'FIB', 
    label: 'Fill in the blanks', 
    desc: 'Complete the sentence', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="6" rx="1"/>
      </svg>
    )
  },
  { 
    id: 'TF', 
    label: 'True or false', 
    desc: 'Statement verification', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    )
  },
  { 
    id: 'SA', 
    label: 'Short answer', 
    desc: '2-3 sentence responses', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>
      </svg>
    )
  },
  { 
    id: 'LA', 
    label: 'Long answer', 
    desc: 'Detailed explanations', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/>
      </svg>
    )
  },
  { 
    id: 'MATCH', 
    label: 'Match the columns', 
    desc: 'Pair items from two lists', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
      </svg>
    )
  },
  { 
    id: 'DRAW', 
    label: 'Draw and label', 
    desc: 'Diagrams with annotations', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    )
  },
  { 
    id: 'SOLVE', 
    label: 'Solve / Calculate', 
    desc: 'Step-by-step working', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v2.172L12 14l8 7.828V20H4v-2h10l-6-6 6-6H4V4z"/>
      </svg>
    )
  },
  { 
    id: 'CUSTOM', 
    label: 'Custom Section', 
    desc: 'Create a custom labeled section', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    )
  }
];

const SECTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const createDefaultQuestion = (type, index) => {
  const base = {
    id: `q-${Date.now()}-${index}-${Math.random()}`,
    text: '',
    answer: ''
  };
  if (type === 'MCQ') {
    base.options = ['', '', '', ''];
  } else if (type === 'MATCH') {
    base.columnA = '';
    base.columnB = '';
  }
  return base;
};

const createNewSection = (qtype, numExistingSections) => {
  const isCustom = qtype.id === 'CUSTOM';
  const questionFormat = isCustom ? 'SA' : qtype.id;
  const defaultQuestions = Array.from({ length: 5 }, (_, idx) =>
    createDefaultQuestion(questionFormat, idx + 1)
  );
  return {
    id: `sec-${Date.now()}-${numExistingSections}-${Math.random()}`,
    type: qtype.id,
    ...(isCustom && { questionFormat: 'SA' }),
    title: isCustom ? 'Custom Section' : qtype.label,
    numQuestions: 5,
    marksPerQuestion: 1,
    questions: defaultQuestions
  };
};

function Step2Sections({ sections, onSectionsChange, totalMarks, syllabusData, activeGrade, activeSubject }) {
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [activeSectionId, setActiveSectionId] = useState(sections.length > 0 ? sections[0].id : null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeAISection, setActiveAISection] = useState(null);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);
  const [activeQBSection, setActiveQBSection] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [fillAllModal, setFillAllModal] = useState(false);
  const [fillAllText, setFillAllText] = useState('');
  const [fillAllDifficulty, setFillAllDifficulty] = useState('Medium');
  const [fillAllStatus, setFillAllStatus] = useState('');
  const [message, setMessage] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const [removingSectionIds, setRemovingSectionIds] = useState(new Set());
  const [removingQuestionIds, setRemovingQuestionIds] = useState(new Set());
  const REMOVE_ANIM_MS = 300;

  // Drag-and-drop reordering state
  const [draggedSectionIndex, setDraggedSectionIndex] = useState(null);
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState(null);
  const [draggedQuestionSectionId, setDraggedQuestionSectionId] = useState(null);

  const handleSectionDragStart = (e, idx) => {
    setDraggedSectionIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e, idx) => {
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === idx) return;
    const newSections = [...sections];
    const item = newSections[draggedSectionIndex];
    newSections.splice(draggedSectionIndex, 1);
    newSections.splice(idx, 0, item);
    setDraggedSectionIndex(idx);
    onSectionsChange(newSections);
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionIndex(null);
  };

  const handleQuestionDragStart = (e, sectionId, qIdx) => {
    setDraggedQuestionIndex(qIdx);
    setDraggedQuestionSectionId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuestionDragOver = (e, sectionId, qIdx) => {
    e.preventDefault();
    if (draggedQuestionSectionId !== sectionId || draggedQuestionIndex === null || draggedQuestionIndex === qIdx) return;
    const newSections = sections.map((s) => {
      if (s.id === sectionId) {
        const newQs = [...(s.questions || [])];
        const item = newQs[draggedQuestionIndex];
        newQs.splice(draggedQuestionIndex, 1);
        newQs.splice(qIdx, 0, item);
        return { ...s, questions: newQs };
      }
      return s;
    });
    setDraggedQuestionIndex(qIdx);
    onSectionsChange(newSections);
  };

  const handleQuestionDragEnd = () => {
    setDraggedQuestionIndex(null);
    setDraggedQuestionSectionId(null);
  };

  const assignedMarks = sections.reduce(
    (sum, s) => sum + s.numQuestions * s.marksPerQuestion,
    0
  );

  const toggleExpandSection = (sectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleAddSection = (qtype) => {
    const newSection = createNewSection(qtype, sections.length);
    onSectionsChange([...sections, newSection]);
    setActiveSectionId(newSection.id);
  };

  const handleDeleteSection = (sectionId) => {
    setRemovingSectionIds((prev) => new Set(prev).add(sectionId));
    setTimeout(() => {
      onSectionsChange(sections.filter((s) => s.id !== sectionId));
      setRemovingSectionIds((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }, REMOVE_ANIM_MS);
  };

  const handleQuestionFormatChange = (sectionId, newFormat) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          const newQuestions = Array.from({ length: s.numQuestions }, (_, idx) =>
            createDefaultQuestion(newFormat, idx + 1)
          );
          return { ...s, questionFormat: newFormat, questions: newQuestions };
        }
        return s;
      })
    );
  };

  const handleFieldChange = (sectionId, field, value) => {
    const numValue = Math.max(0, parseInt(value, 10) || 0);
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          const updated = { ...s, [field]: numValue };
          const format = getQuestionFormat(s);
          if (field === 'numQuestions') {
            const currentQuestions = s.questions || [];
            if (numValue > currentQuestions.length) {
              const extraCount = numValue - currentQuestions.length;
              const newQuestions = Array.from({ length: extraCount }, (_, idx) =>
                createDefaultQuestion(format, currentQuestions.length + idx + 1)
              );
              updated.questions = [...currentQuestions, ...newQuestions];
            } else if (numValue < currentQuestions.length) {
              updated.questions = currentQuestions.slice(0, numValue);
            }
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleQuestionTextChange = (sectionId, questionId, text) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: (s.questions || []).map((q) =>
              q.id === questionId ? { ...q, text } : q
            )
          };
        }
        return s;
      })
    );
  };

  const handleQuestionAnswerChange = (sectionId, questionId, answer) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: (s.questions || []).map((q) =>
              q.id === questionId ? { ...q, answer } : q
            )
          };
        }
        return s;
      })
    );
  };

  const handleMCQOptionChange = (sectionId, questionId, optionIdx, value) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: (s.questions || []).map((q) => {
              if (q.id === questionId) {
                const newOpts = [...(q.options || ['', '', '', ''])];
                newOpts[optionIdx] = value;
                return { ...q, options: newOpts };
              }
              return q;
            })
          };
        }
        return s;
      })
    );
  };

  const handleMatchFieldChange = (sectionId, questionId, field, value) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: (s.questions || []).map((q) =>
              q.id === questionId ? { ...q, [field]: value } : q
            )
          };
        }
        return s;
      })
    );
  };

  const handleDeleteQuestion = (sectionId, questionId) => {
    setRemovingQuestionIds((prev) => new Set(prev).add(questionId));
    setTimeout(() => {
      setRemovingQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }, REMOVE_ANIM_MS);
    setTimeout(() => {
      onSectionsChange(
        sections.map((s) => {
          if (s.id === sectionId) {
            const newQuestions = (s.questions || []).filter((q) => q.id !== questionId);
            return {
              ...s,
              questions: newQuestions,
              numQuestions: newQuestions.length // Sync length
            };
          }
          return s;
        })
      );
    }, REMOVE_ANIM_MS);
  };

  const handleQuestionBankAdd = (sectionId, newQuestion) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          const currentQuestions = s.questions || [];
          const updatedQuestions = [...currentQuestions, newQuestion];
          return {
            ...s,
            questions: updatedQuestions,
            numQuestions: updatedQuestions.length
          };
        }
        return s;
      })
    );
  };

  const handleAddQuestion = (sectionId) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id === sectionId) {
          const currentQuestions = s.questions || [];
          const format = getQuestionFormat(s);
          const newQ = createDefaultQuestion(format, currentQuestions.length + 1);
          return {
            ...s,
            numQuestions: currentQuestions.length + 1,
            questions: [...currentQuestions, newQ]
          };
        }
        return s;
      })
    );
  };

  const handleAIConfirm = (generatedQuestions) => {
    if (!activeAISection) return;
    onSectionsChange(
      sections.map((s) => {
        if (s.id === activeAISection.id) {
          const userFilledQuestions = (s.questions || []).filter(
            (q) => (q.text && q.text.trim() !== '')
          );
          const updatedQuestions = [...userFilledQuestions, ...generatedQuestions];
          return {
            ...s,
            numQuestions: updatedQuestions.length,
            questions: updatedQuestions
          };
        }
        return s;
      })
    );
    setAiModalOpen(false);
    setActiveAISection(null);
    setExpandedSections((prev) => new Set(prev).add(activeAISection.id));
  };

  const handleAutoGenerateAll = async () => {
    if (!syllabusData || !syllabusData.topics || syllabusData.topics.filter(t => t.enabled).length === 0) {
      showToast('Please upload syllabus material and enable topics first.', 'error');
      return;
    }

    setGeneratingAll(true);
    try {
      const activeTopicsText = syllabusData.topics
        .filter(t => t.enabled)
        .map(t => `Topic: ${t.name}\nKey points:\n${t.keyPoints.map(p => `- ${p}`).join('\n')}`)
        .join('\n\n');

      const hasKey = getApiKey().length > 0;
      const newSections = [];

      for (const section of sections) {
        let generatedQuestions = [];
        const format = getQuestionFormat(section);
        if (hasKey) {
          generatedQuestions = await generateQuestionsWithAI(
            activeTopicsText,
            format,
            section.numQuestions,
            'Medium',
            section.title || ''
          );
        } else {
          generatedQuestions = generateQuestionsFromText(
            activeTopicsText,
            format,
            section.numQuestions
          );
        }

        newSections.push({
          ...section,
          questions: generatedQuestions
        });
      }

      onSectionsChange(newSections);
      showToast('Successfully auto-generated all questions and answers!', 'success');
    } catch (err) {
      showToast(`Auto-generation failed: ${err.message}`, 'error');
    } finally {
      setGeneratingAll(false);
    }
  };

  // Open the fill-all modal, pre-populating text with syllabus if available
  const openFillAllModal = () => {
    if (syllabusData?.topics) {
      const activeTopicsText = syllabusData.topics
        .filter(t => t.enabled)
        .map(t => `Topic: ${t.name}\nKey points:\n${(t.keyPoints || []).map(p => `- ${p}`).join('\n')}`)
        .join('\n\n');
      setFillAllText(activeTopicsText);
    }
    setFillAllModal(true);
  };

  // Generate all sections from the custom text in the fill-all modal
  const handleFillAllSubmit = async () => {
    if (!fillAllText.trim()) {
      showToast('Please paste some content to generate questions from.', 'error');
      return;
    }
    setFillAllProgress(5);
    setFillAllStatus('Starting generation...');

    const hasKey = getApiKey().length > 0;
    const newSections = [];
    const total = sections.length;

    try {
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const format = getQuestionFormat(section);
        setFillAllStatus(`Generating "${section.title}" (${i + 1}/${total})...`);
        setFillAllProgress(Math.round(5 + ((i / total) * 90)));

        let generatedQuestions = [];
        if (hasKey) {
          generatedQuestions = await generateQuestionsWithAI(
            fillAllText,
            format,
            section.numQuestions,
            fillAllDifficulty,
            section.title || ''
          );
        } else {
          generatedQuestions = generateQuestionsFromText(
            fillAllText,
            format,
            section.numQuestions
          );
        }

        newSections.push({ ...section, questions: generatedQuestions });
      }

      setFillAllProgress(100);
      setFillAllStatus('Done!');
      onSectionsChange(newSections);

      setTimeout(() => {
        setFillAllModal(false);
        setFillAllProgress(0);
        setFillAllStatus('');
      }, 800);
    } catch (err) {
      showToast(`Generation failed: ${err.message}`, 'error');
      setFillAllProgress(0);
      setFillAllStatus('');
    }
  };

  const displayedAssignedMarks = useCountUp(assignedMarks);
  let trackerClass = 'tracker-badge';
  let fillClass = 'marks-fill-bar';
  let trackerSymbol;
  if (assignedMarks === totalMarks) {
    trackerClass += ' tracker-perfect';
     fillClass += ' fill-perfect';
     trackerSymbol = (
       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
         <polyline points="20 6 9 17 4 12"/>
       </svg>
     );
   } else if (assignedMarks < totalMarks) {
     trackerClass += ' tracker-incomplete';
     fillClass += ' fill-incomplete';
     trackerSymbol = (
       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
         <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
       </svg>
     );
   } else {
     trackerClass += ' tracker-over';
     fillClass += ' fill-over';
     trackerSymbol = (
       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
         <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
       </svg>
     );
   }
 
   const fillPercent = totalMarks > 0 ? Math.min(100, Math.round((assignedMarks / totalMarks) * 100)) : 0;
 
   return (
     <div>
       <NotificationBanner 
         message={message?.text} 
         type={message?.type || 'error'} 
         onClose={() => setMessage(null)} 
       />
 
       {/* Fill-All Modal */}
       {fillAllModal && (
         <div className="modal-overlay" onClick={() => { setFillAllModal(false); setFillAllProgress(0); setFillAllStatus(''); }}>
           <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
             <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                   <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                 </svg>
                 Auto-Fill All Sections
               </span>
               <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                 onClick={() => { setFillAllModal(false); setFillAllProgress(0); setFillAllStatus(''); }}>
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
               </button>
             </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Paste chapter text or syllabus notes. Questions will be generated for all {sections.length} sections automatically, each in its correct format (MCQ, Match, FIB, etc.).
            </p>

            {fillAllProgress > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
                <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-main)' }}>{fillAllStatus}</div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden', border: '0.5px solid var(--border-color)' }}>
                  <div style={{ height: '100%', width: `${fillAllProgress}%`, backgroundColor: 'var(--primary)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Content / Syllabus Text</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: '160px', fontSize: '13px' }}
                    placeholder="Paste chapter notes, textbook text, or topic summaries here..."
                    value={fillAllText}
                    onChange={e => setFillAllText(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Difficulty</label>
                  <select className="form-select" value={fillAllDifficulty} onChange={e => setFillAllDifficulty(e.target.value)}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '6px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-color)' }}>
                  <strong>Sections to fill:</strong>
                  {sections.map((s, i) => (
                    <span key={s.id} style={{ marginLeft: '6px', padding: '2px 8px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-full)', border: '0.5px solid var(--border-color)', display: 'inline-block', marginTop: '4px', fontSize: '0.75rem' }}>
                      {String.fromCharCode(65 + i)}. {s.title} ({getQuestionFormat(s)})
                    </span>
                  ))}
                </div>
              </>
            )}

             {fillAllProgress === 0 && (
               <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                 <button className="btn btn-secondary" onClick={() => { setFillAllModal(false); setFillAllProgress(0); setFillAllStatus(''); }}>Cancel</button>
                 <button className="btn btn-primary" onClick={handleFillAllSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                     <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                   </svg>
                   Generate All Questions
                 </button>
               </div>
             )}
           </div>
         </div>
       )}
 
       {/* ── AI Bulk Generation ── */}
       <div className="card bulk-gen">
         <div className="bulk-gen-header">
           <div className="bulk-gen-icon">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
               <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
             </svg>
           </div>
           <div>
             <div className="bulk-gen-title">AI Bulk Generation</div>
             <div className="bulk-gen-subtitle">Auto-fill all {sections.length} section{sections.length !== 1 ? 's' : ''} with one click</div>
           </div>
         </div>
 
         <div className="bulk-gen-grid">
           {/* Option 1 — Paste custom text */}
           <button
             type="button"
             className="bulk-gen-card"
             onClick={openFillAllModal}
             disabled={generatingAll || sections.length === 0}
           >
             <div className="bulk-gen-card-icon primary">
               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                 <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
               </svg>
             </div>
             <div className="bulk-gen-card-body">
               <div className="bulk-gen-card-label">Paste Text</div>
               <div className="bulk-gen-card-desc">Paste chapter notes or study material and generate questions for every section.</div>
             </div>
             <svg className="bulk-gen-card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
           </button>
 
           {/* Option 2 — From syllabus */}
           {(() => {
             const syllabusReady = syllabusData?.topics && syllabusData.topics.filter(t => t.enabled).length > 0;
             const enabledCount = syllabusReady ? syllabusData.topics.filter(t => t.enabled).length : 0;
                          const isDisabled = generatingAll || sections.length === 0 || !syllabusReady;
             return (
               <button
                 type="button"
                 className={`bulk-gen-card variant-syllabus ${!syllabusReady ? 'is-locked' : ''}`}
                 onClick={handleAutoGenerateAll}
                 disabled={isDisabled}
               >
                 <div className={`bulk-gen-card-icon ${syllabusReady ? 'secondary' : 'locked'}`}>
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={syllabusReady ? 'var(--secondary)' : 'var(--text-muted)'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                     <path d="M8 7h8"/><path d="M8 11h8"/>
                   </svg>
                 </div>
                 <div className="bulk-gen-card-body">
                   <div className="bulk-gen-card-label">
                     From Syllabus
                     {syllabusReady ? (
                       <span className="bulk-gen-status-badge ready">
                         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                         {enabledCount} topic{enabledCount !== 1 ? 's' : ''}
                       </span>
                     ) : (
                       <span className="bulk-gen-status-badge locked">
                         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                         Step 2
                       </span>
                     )}
                   </div>
                   <div className="bulk-gen-card-desc">
                     {syllabusReady
                       ? 'Generate questions directly from your extracted syllabus topics — no pasting needed.'
                       : 'Upload a syllabus in Step 2 to unlock one-click generation.'}
                   </div>
                 </div>
                 <svg className="bulk-gen-card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
               </button>
             );
           })()}
        </div>

        {generatingAll && (
          <div className="bulk-gen-spinner-row">
            <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '1.5px' }} />
            Generating questions across all sections…
          </div>
        )}
      </div>

      {/* Question type selector */}
      <div className="qtype-grid">
        {QUESTION_TYPES.map((qtype) => (
          <button
            key={qtype.id}
            type="button"
            className={`qtype-btn ${selectedType === qtype.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedType(qtype.id);
              handleAddSection(qtype);
            }}
          >
            <span className="qtype-icon">{qtype.icon}</span>
            <span className="qtype-label">{qtype.label}</span>
            <span className="qtype-desc">{qtype.desc}</span>
          </button>
        ))}
      </div>

      {/* Section cards list */}
            <div className="sections-list">
        {sections.map((section, index) => {
          const sectionTotal = section.numQuestions * section.marksPerQuestion;
          const letter = SECTION_LETTERS[index] || index + 1;
          const isDragging = draggedSectionIndex === index;

          return (
            <div 
              key={section.id} 
              className={`card stagger-item ${expandedSections.has(section.id) ? 'expanded' : ''} ${activeSectionId === section.id ? 'active-section' : ''} ${removingSectionIds.has(section.id) ? 'item-removing' : ''}`}
              onClickCapture={() => setActiveSectionId(section.id)}
              draggable
              onDragStart={(e) => handleSectionDragStart(e, index)}
              onDragOver={(e) => handleSectionDragOver(e, index)}
              onDragEnd={handleSectionDragEnd}
              style={{
                animationDelay: `${index * 50}ms`,
                opacity: isDragging ? 0.4 : 1,
                border: isDragging ? '1.5px dashed var(--primary)' : undefined,
                cursor: 'grab',
                transition: 'border-color var(--dur-fast) var(--ease-snappy), opacity var(--dur-fast) var(--ease-snappy)'
              }}
            >
              <div
                className="card-title"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  {/* Drag Handle Icon */}
                  <div style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)', marginRight: '2px' }} title="Drag to reorder Section">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                      <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                    </svg>
                  </div>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Section {letter}:</span>
                  <input
                    type="text"
                    className="section-title-input"
                    value={section.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const inferredFormat = section.type === 'CUSTOM' ? inferFormatFromTitle(newTitle) : null;
                      onSectionsChange(
                        sections.map((s) => {
                          if (s.id !== section.id) return s;
                          const updated = { ...s, title: newTitle };
                          // Auto-update questionFormat for CUSTOM sections when title implies a new format
                          if (s.type === 'CUSTOM' && inferredFormat && s.questionFormat !== inferredFormat) {
                            const newQuestions = Array.from({ length: s.numQuestions }, (_, idx) =>
                              createDefaultQuestion(inferredFormat, idx + 1)
                            );
                            updated.questionFormat = inferredFormat;
                            updated.questions = newQuestions;
                          }
                          return updated;
                        })
                      );
                    }}
                    placeholder="Enter custom section title..."
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteSection(section.id)}
                >
                  Delete
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Number of questions</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={section.numQuestions}
                    onChange={(e) =>
                      handleFieldChange(section.id, 'numQuestions', e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Marks per question</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={section.marksPerQuestion}
                    onChange={(e) =>
                      handleFieldChange(
                        section.id,
                        'marksPerQuestion',
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              {/* Question format picker for CUSTOM sections */}
              {section.type === 'CUSTOM' && (
                <div className="form-group">
                  <label className="form-label">Question format</label>
                  <select
                    className="form-select"
                    value={section.questionFormat || 'SA'}
                    onChange={(e) => handleQuestionFormatChange(section.id, e.target.value)}
                  >
                    <option value="MCQ">Multiple choice</option>
                    <option value="FIB">Fill in the blanks</option>
                    <option value="TF">True or false</option>
                    <option value="SA">Short answer</option>
                    <option value="LA">Long answer</option>
                    <option value="MATCH">Match the columns</option>
                    <option value="DRAW">Draw and label</option>
                    <option value="SOLVE">Solve / Calculate</option>
                  </select>
                </div>
              )}

              {/* Questions list toggle accordion */}
              <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                  onClick={() => toggleExpandSection(section.id)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Edit questions ({section.questions?.length || 0})
                  </span>
                  <span style={{ fontSize: '10px' }}>{expandedSections.has(section.id) ? '▲' : '▼'}</span>
                </button>
                
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => {
                    setActiveAISection(section);
                    setAiModalOpen(true);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                  </svg>
                  Auto-Generate
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    setActiveQBSection(section);
                    setQuestionBankOpen(true);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Question Bank
                </button>
              </div>

              {/* Collapsible Questions list */}
              {expandedSections.has(section.id) && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '0.5px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                    QUESTIONS LIST
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(section.questions || []).map((q, qIdx) => {
                      const isQDragging = draggedQuestionSectionId === section.id && draggedQuestionIndex === qIdx;
                      const hasUnderline = q.text && q.text.includes('___');
                      const missingFIB = getQuestionFormat(section) === 'FIB' && !hasUnderline;
                      const missingMCQOpts = getQuestionFormat(section) === 'MCQ' && (!q.options || q.options.some(opt => !opt.trim()));
                      const missingMCQKey = getQuestionFormat(section) === 'MCQ' && !q.answer;

                      return (
                        <div 
                          key={q.id || qIdx} 
                          className={removingQuestionIds.has(q.id) ? 'item-removing' : ''}
                          draggable
                          onDragStart={(e) => handleQuestionDragStart(e, section.id, qIdx)}
                          onDragOver={(e) => handleQuestionDragOver(e, section.id, qIdx)}
                          onDragEnd={handleQuestionDragEnd}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '12px',
                            backgroundColor: 'var(--bg-input)',
                            borderRadius: 'var(--radius-sm)',
                            border: isQDragging ? '1.5px dashed var(--primary)' : '0.5px solid var(--border-color)',
                            opacity: isQDragging ? 0.4 : 1,
                            cursor: 'grab',
                            transition: 'all var(--dur-fast) var(--ease-snappy)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* Grab Handle */}
                              <div style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'inline-flex' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                                  <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                                </svg>
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Question {qIdx + 1}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              onClick={() => handleDeleteQuestion(section.id, q.id)}
                            >
                              Delete
                            </button>
                          </div>

                          {/* Live FIB Validation Warning */}
                          {missingFIB && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span>Hint: Add blanks (e.g., "___") to let students fill in the text.</span>
                            </div>
                          )}

                          {/* Live MCQ Validation Warning */}
                          {missingMCQOpts && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span>Please fill in all 4 MCQ options.</span>
                            </div>
                          )}
                          {missingMCQKey && !missingMCQOpts && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span>Correct Answer / Solution key is missing.</span>
                            </div>
                          )}

                                                <div className="form-group">
                          <label className="form-label">Question text</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder={`Enter question ${qIdx + 1} text...`}
                            value={q.text || ''}
                            onChange={(e) => handleQuestionTextChange(section.id, q.id, e.target.value)}
                          />
                        </div>

                        {/* Render extra MCQ options inputs */}
                        {getQuestionFormat(section) === 'MCQ' && q.options && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            marginTop: '4px'
                          }}>
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="form-group">
                                <label className="form-label">Option {String.fromCharCode(97 + optIdx)}</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder={`Option ${String.fromCharCode(97 + optIdx)}`}
                                  value={opt || ''}
                                  onChange={(e) => handleMCQOptionChange(section.id, q.id, optIdx, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Render MATCH Columns inputs */}
                        {getQuestionFormat(section) === 'MATCH' && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginTop: '4px'
                          }}>
                            <div className="form-group">
                              <label className="form-label">Column A item</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. 1. Mitochondria"
                                value={q.columnA || ''}
                                onChange={(e) => handleMatchFieldChange(section.id, q.id, 'columnA', e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Column B item</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. a. Powerhouse"
                                value={q.columnB || ''}
                                onChange={(e) => handleMatchFieldChange(section.id, q.id, 'columnB', e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Answer Key editor */}
                        <div className="form-group" style={{ marginTop: '4px' }}>
                          <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                            </svg>
                            Correct Answer / Ideal Solution
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Mitochondria is the powerhouse of the cell."
                            value={q.answer || ''}
                            onChange={(e) => handleQuestionAnswerChange(section.id, q.id, e.target.value)}
                            style={{ borderLeft: '2px solid var(--primary)', fontSize: '0.82rem' }}
                          />
                        </div>
                      </div>
                              );
        })}
      </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => handleAddQuestion(section.id)}
                  >
                    + Add question
                  </button>
                </div>
              )}

              <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>
                Section total: {sectionTotal} marks
              </div>
            </div>
                    );
        })}
      </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div className={trackerClass}>
          {trackerSymbol} {displayedAssignedMarks} / {totalMarks} marks assigned
        </div>
        <div className="marks-fill-track" title={`${fillPercent}% of total marks assigned`}>
          <div className={fillClass} style={{ width: `${fillPercent}%` }} />
        </div>
      </div>

      <AIGeneratorModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        section={activeAISection ? { ...activeAISection, type: getQuestionFormat(activeAISection) } : null}
        onConfirm={handleAIConfirm}
        syllabusData={syllabusData}
      />

      <QuestionBankModal
        isOpen={questionBankOpen}
        onClose={() => setQuestionBankOpen(false)}
        onAddQuestion={(sectionId, q) => {
          handleQuestionBankAdd(sectionId, q);
        }}
        preselectedSectionId={activeQBSection?.id}
        sections={sections}
        activeGrade={activeGrade}
        activeSubject={activeSubject}
      />
    </div>
  );
}

export default Step2Sections;
