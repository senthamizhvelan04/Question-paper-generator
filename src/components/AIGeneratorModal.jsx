import { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { generateQuestionsWithAI, generateQuestionsFromText, getApiKey, setApiKey } from '../utils/aiGenerator';
import { getQuestionFormat } from '../utils/questionUtils';
import LoadingState from './LoadingState';
import NotificationBanner from './NotificationBanner';

export default function AIGeneratorModal({ isOpen, onClose, section, onConfirm, syllabusData }) {
  const [screen, setScreen] = useState('input'); // 'input', 'loading', 'review'
  const [text, setText] = useState('');
  const [count, setCount] = useState(section?.numQuestions || 5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing AI...');
  const [questions, setQuestions] = useState([]);
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Sync count if section changes
  useEffect(() => {
    if (section) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(section.numQuestions || 5);
    }
  }, [section]);

  // Pre-populate with syllabus topics if available
  useEffect(() => {
    if (isOpen && syllabusData && syllabusData.topics) {
      const activeTopicsText = syllabusData.topics
        .filter(t => t.enabled)
        .map(t => `Topic: ${t.name}\nKey points:\n${t.keyPoints.map(p => `- ${p}`).join('\n')}`)
        .join('\n\n');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(activeTopicsText);
    }
  }, [isOpen, syllabusData]);

  if (!isOpen || !section) return null;

  // Save API key
  const handleSaveApiKey = () => {
    setApiKey(apiKey);
    setShowApiKeyInput(false);
  };

  // File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setText(event.target.result || '');
    };
    reader.readAsText(file);
  };

  // Run AI Generation
  const handleGenerate = async () => {
    if (!text.trim()) {
      showToast('Please paste some text or upload a document first.', 'error');
      return;
    }

    setScreen('loading');
    setLoadingProgress(0);
    setErrorMsg('');

    const hasKey = getApiKey().length > 0;

    if (hasKey) {
      setLoadingText('Connecting to Gemini AI...');
      setLoadingProgress(10);

      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 85) return prev;
          return prev + Math.random() * 8;
        });
        setLoadingText((prev) => {
          if (prev.includes('Connecting')) return 'Analyzing your content...';
          if (prev.includes('Analyzing')) return 'Generating intelligent questions...';
          if (prev.includes('Generating intelligent')) return 'Crafting answer options...';
          if (prev.includes('Crafting')) return 'Finalizing questions...';
          return prev;
        });
      }, 800);

      try {
        const resolvedFormat = getQuestionFormat(section);
        const generated = await generateQuestionsWithAI(text, resolvedFormat, count, difficulty, section.title || '');
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setLoadingText('Done!');

        setTimeout(() => {
          setQuestions(generated.map(q => ({ ...q, checked: true })));
          setScreen('review');
        }, 300);
      } catch (err) {
        clearInterval(progressInterval);
        if (err.message === 'NO_API_KEY' || err.message === 'INVALID_API_KEY') {
          setErrorMsg('Invalid or missing API key. Please update your Gemini API key in settings.');
        } else {
          setErrorMsg(`AI generation failed: ${err.message}. Falling back to local generation...`);
          setTimeout(() => {
            const resolvedFormat = getQuestionFormat(section);
            const generated = generateQuestionsFromText(text, resolvedFormat, count);
            setQuestions(generated.map(q => ({ ...q, checked: true })));
            setScreen('review');
            setErrorMsg('');
          }, 1000);
          return;
        }
        setScreen('input');
      }
    } else {
      setLoadingText('Generating questions locally...');
      const steps = [
        { pct: 20, msg: 'Parsing document sentences...' },
        { pct: 50, msg: 'Extracting key concepts...' },
        { pct: 80, msg: 'Formulating questions...' },
        { pct: 100, msg: 'Done!' },
      ];
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < steps.length) {
          setLoadingProgress(steps[stepIdx].pct);
          setLoadingText(steps[stepIdx].msg);
          stepIdx++;
        } else {
          clearInterval(interval);
          const generated = generateQuestionsFromText(text, resolvedFormat, count);
          setQuestions(generated.map(q => ({ ...q, checked: true })));
          setScreen('review');
        }
      }, 350);
    }
  };

  // Toggle Checkbox
  const handleToggleCheck = (id) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, checked: !q.checked } : q));
  };

  // Edit Question text inline
  const handleQuestionTextChange = (id, newText) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, text: newText } : q));
  };

  // Edit Question answer inline
  const handleQuestionAnswerChange = (id, newAnswer) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, answer: newAnswer } : q));
  };

  // Edit MCQ Option text inline
  const handleMCQOptionChange = (qId, optIdx, newVal) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        const newOpts = [...(q.options || ['', '', '', ''])];
        newOpts[optIdx] = newVal;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  // Edit MATCH Columns text inline
  const handleMatchFieldChange = (qId, field, newVal) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, [field]: newVal } : q));
  };

  // Submit back to Step 2
  const handleConfirmSubmit = () => {
    const selectedQs = questions.filter(q => q.checked);
    if (selectedQs.length === 0) {
      showToast('Please select at least one question to import.', 'error');
      return;
    }
    const finalQs = selectedQs.map((q) => {
      const copy = { ...q };
      delete copy.checked;
      return copy;
    });
    onConfirm(finalQs);
    onClose();
    setText('');
    setScreen('input');
  };

  const resolvedFormat = section ? getQuestionFormat(section) : 'SA';
  const hasApiKey = getApiKey().length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '680px', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px' 
        }}
      >
        <NotificationBanner message={errorMsg} type="error" onClose={() => setErrorMsg('')} />

        {/* --- Screen 1: Input --- */}
        {screen === 'input' && (
          <>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                </svg>
                Generate {section.title} questions with AI
              </span>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-muted)' }}
                onClick={onClose}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* AI Status Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: hasApiKey ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              border: `1px solid ${hasApiKey ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
              fontSize: 'var(--text-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: hasApiKey ? 'var(--color-success)' : 'var(--color-warning)',
                  display: 'inline-block',
                }} />
                <span style={{ fontWeight: 600, color: hasApiKey ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {hasApiKey ? 'Gemini AI Connected' : 'Local Mode (Basic)'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {hasApiKey ? '— Powered by Google Gemini' : '— Add API key for smarter questions'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline',
                }}
              >
                {showApiKeyInput ? 'Hide' : hasApiKey ? 'Change Key' : 'Add API Key'}
              </button>
            </div>
 
            {/* API Key Input (collapsible) */}
            {showApiKeyInput && (
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'flex-end',
                padding: '12px', backgroundColor: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-color)',
              }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Gemini API Key
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: 'var(--text-xs)' }}
                    >
                      Get free key →
                    </a>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKeyState(e.target.value)}
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleSaveApiKey} style={{ marginBottom: '0px', height: '36px' }}>
                  Save
                </button>
              </div>
            )}
 
            {!hasApiKey && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-warning-bg)', border: `1px solid var(--color-warning-border)`,
                color: 'var(--color-warning)', fontSize: 'var(--text-sm)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span><strong>Local Mode Active:</strong> Fallback offline generation uses basic keyword parsing to build simple questions. For intelligent, context-aware syllabus questions, please configure an API key.</span>
              </div>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Upload a chapter summary, lecture notes, or syllabus text. {hasApiKey ? 'Gemini AI will intelligently generate contextual questions.' : 'Add a Gemini API key for high-quality AI-generated questions.'}
            </div>

            <div className="form-group">
              <label className="form-label">Study notes or chapter text</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: '180px', fontSize: '13px' }}
                placeholder="Paste your learning material here... (e.g. Photosynthesis is the process used by plants to convert light energy into chemical energy...)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label">Or upload a text (.txt) file</label>
                <input 
                  type="file" 
                  accept=".txt" 
                  onChange={handleFileUpload} 
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              <div className="form-group" style={{ width: '120px' }}>
                <label className="form-label">Difficulty</label>
                <select 
                  className="form-select" 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="form-group" style={{ width: '100px' }}>
                <label className="form-label">Questions count</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="30"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleGenerate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {hasApiKey ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="10" rx="2"/>
                      <circle cx="12" cy="5" r="2"/>
                      <path d="M12 7v4"/>
                      <line x1="8" y1="16" x2="8.01" y2="16"/>
                      <line x1="16" y1="16" x2="16.01" y2="16"/>
                    </svg>
                    Generate with AI
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                    </svg>
                    Generate questions
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* --- Screen 2: Loading --- */}
        {screen === 'loading' && (
          <LoadingState 
            text={loadingText}
            progress={Math.min(loadingProgress, 100)}
            subtitle={hasApiKey ? 'Powered by Google Gemini AI' : undefined}
          />
        )}

        {/* --- Screen 3: Review --- */}
        {screen === 'review' && (
          <>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Review AI generated questions</span>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-muted)' }}
                onClick={onClose}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Deselect questions you don't want. You can edit the text, choices, and correct answers inline before importing them.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
              {questions.map((q, idx) => (
                <div 
                  key={q.id || idx} 
                  style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    padding: '16px', 
                    backgroundColor: 'var(--bg-input)', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '0.5px solid var(--border-color)',
                    alignItems: 'flex-start'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={q.checked} 
                    onChange={() => handleToggleCheck(q.id)} 
                    style={{ marginTop: '4px', cursor: 'pointer' }}
                  />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span>Question {idx + 1}</span>
                      <span>{q.checked ? 'Active' : 'Excluded'}</span>
                    </div>

                    <div className="form-group">
                      <input
                        type="text"
                        className="form-input"
                        style={{ backgroundColor: 'var(--bg-card)', fontSize: '13px' }}
                        value={q.text || ''}
                        disabled={!q.checked}
                        onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                        placeholder="Question text..."
                      />
                    </div>

                    {/* MCQ Options */}
                    {resolvedFormat === 'MCQ' && q.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Option {String.fromCharCode(97 + optIdx)}</label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ backgroundColor: 'var(--bg-card)', padding: '6px 10px', fontSize: '12px' }}
                              value={opt || ''}
                              disabled={!q.checked}
                              onChange={(e) => handleMCQOptionChange(q.id, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(97 + optIdx)}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* MATCH Columns */}
                    {resolvedFormat === 'MATCH' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Column A</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: 'var(--bg-card)', padding: '6px 10px', fontSize: '12px' }}
                            value={q.columnA || ''}
                            disabled={!q.checked}
                            onChange={(e) => handleMatchFieldChange(q.id, 'columnA', e.target.value)}
                            placeholder="Column A item..."
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Column B</label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ backgroundColor: 'var(--bg-card)', padding: '6px 10px', fontSize: '12px' }}
                            value={q.columnB || ''}
                            disabled={!q.checked}
                            onChange={(e) => handleMatchFieldChange(q.id, 'columnB', e.target.value)}
                            placeholder="Column B item..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Answer Key review */}
                    <div className="form-group" style={{ marginTop: '4px' }}>
                      <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                        Correct Answer / Solution
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ backgroundColor: 'var(--bg-card)', padding: '6px 10px', fontSize: '12px', borderLeft: '2px solid var(--primary)' }}
                        value={q.answer || ''}
                        disabled={!q.checked}
                        onChange={(e) => handleQuestionAnswerChange(q.id, e.target.value)}
                        placeholder="Correct answer..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setScreen('input')}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={handleConfirmSubmit}>
                Confirm & insert ({questions.filter(q => q.checked).length} questions)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
