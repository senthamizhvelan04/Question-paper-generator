import { useState } from 'react';
import { showToast } from '../utils/toast';
import { extractTextFromPdf } from '../utils/pdfParser';
import { 
  analyzeSyllabus, 
  analyzeSyllabusLocally, 
  getApiKey, 
  getGroqApiKey, 
  getAiProvider 
} from '../utils/aiGenerator';
import LoadingState from './LoadingState';
import NotificationBanner from './NotificationBanner';
import Checkbox from './Checkbox';

export default function SyllabusUpload({ headerData, syllabusData, onSyllabusChange }) {
  const [inputText, setInputText] = useState(syllabusData?.rawText || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAnalyzing(true);
    setError('');
    setFileName(file.name);

    try {
      let extractedText = '';
      if (file.name.endsWith('.pdf')) {
        extractedText = await extractTextFromPdf(file);
      } else {
        // Assume text file
        extractedText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result || '');
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }
      setInputText(extractedText);
    } catch (err) {
      setError(`Failed to extract text from file: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      showToast('Please paste some syllabus text or upload a document first.', 'error');
      return;
    }

    setAnalyzing(true);
    setError('');

    const hasKey = getApiKey().length > 0;
    try {
      let result;
      if (hasKey) {
        result = await analyzeSyllabus(inputText, headerData.grade || 'IV', headerData.subject || 'Science');
      } else {
        result = analyzeSyllabusLocally(inputText);
      }

      onSyllabusChange({
        rawText: inputText,
        topics: result.topics.map(t => ({ ...t, enabled: true }))
      });
    } catch (err) {
      setError(`Syllabus analysis failed: ${err.message}. Running offline fallback...`);
      const localResult = analyzeSyllabusLocally(inputText);
      onSyllabusChange({
        rawText: inputText,
        topics: localResult.topics.map(t => ({ ...t, enabled: true }))
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleTopicEnabled = (topicId) => {
    const updated = syllabusData.topics.map(t => t.id === topicId ? { ...t, enabled: !t.enabled } : t);
    onSyllabusChange({ ...syllabusData, topics: updated });
  };

  const updateTopicName = (topicId, newName) => {
    const updated = syllabusData.topics.map(t => t.id === topicId ? { ...t, name: newName } : t);
    onSyllabusChange({ ...syllabusData, topics: updated });
  };

  const updateTopicDifficulty = (topicId, diff) => {
    const updated = syllabusData.topics.map(t => t.id === topicId ? { ...t, difficulty: diff } : t);
    onSyllabusChange({ ...syllabusData, topics: updated });
  };

  const updateKeyPoint = (topicId, pointIdx, newVal) => {
    const updated = syllabusData.topics.map(t => {
      if (t.id === topicId) {
        const pts = [...t.keyPoints];
        pts[pointIdx] = newVal;
        return { ...t, keyPoints: pts };
      }
      return t;
    });
    onSyllabusChange({ ...syllabusData, topics: updated });
  };

  const addKeyPoint = (topicId) => {
    const updated = syllabusData.topics.map(t => {
      if (t.id === topicId) {
        return { ...t, keyPoints: [...t.keyPoints, 'New key point...'] };
      }
      return t;
    });
    onSyllabusChange({ ...syllabusData, topics: updated });
  };

  const deleteKeyPoint = (topicId, pointIdx) => {
    const updated = syllabusData.topics.map(t => {
      if (t.id === topicId) {
        return { ...t, keyPoints: t.keyPoints.filter((_, idx) => idx !== pointIdx) };
      }
      return t;
    });
    onSyllabusChange({ ...syllabusData, topics: updated });
  };

  const provider = getAiProvider();
  const providerLabel = provider === 'gemini' ? 'Gemini AI' : 'Groq AI';
  const hasApiKey = provider === 'gemini' ? getApiKey().length > 0 : getGroqApiKey().length > 0;

  return (
    <div className="card">
      <h2 className="card-title">Upload Syllabus / Chapter Notes</h2>
      
      {analyzing ? (
        <LoadingState 
          text={hasApiKey ? `${providerLabel} is analyzing your syllabus...` : 'Extracting topics from text...'} 
          subtitle="This might take a few seconds" 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NotificationBanner message={error} type="error" onClose={() => setError('')} />

          {!hasApiKey && (
            <NotificationBanner 
              message={`Local Mode Active: No API key is configured. Extraction will run in basic offline fallback mode, which produces less detailed topics. For high-quality, syllabus-aware questions, please add an API key for ${providerLabel} in AI Settings.`} 
              type="warning" 
            />
          )}

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
              <label className="form-label">Syllabus Text / Learning Material</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: '180px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                placeholder="Paste learning material, textbook chapter text, or syllabus here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  let pasted = (e.clipboardData || window.clipboardData).getData('text');
                  // Remove single line breaks (PDF artifacts) but preserve paragraph breaks (double line breaks)
                  // Replace single \n with a space.
                  pasted = pasted.replace(/([^\n])\n([^\n])/g, '$1 $2');
                  
                  // Insert the cleaned text at the cursor position
                  const target = e.target;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const currentVal = target.value;
                  const newVal = currentVal.substring(0, start) + pasted + currentVal.substring(end);
                  setInputText(newVal);
                  
                  // Restore cursor position after state update
                  setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + pasted.length;
                  }, 0);
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1', minWidth: '250px' }}>
              <label className="form-label">Or upload (.txt, .pdf) file</label>
              <div className="file-upload-zone">
                <svg className="file-upload-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="file-upload-text">
                  {fileName ? `Selected: ${fileName}` : 'Choose a file or drag it here'}
                </span>
                <span className="file-upload-hint">
                  Supports PDF or Plain Text (.txt)
                </span>
                <input 
                  type="file" 
                  className="file-upload-input"
                  accept=".txt,.pdf" 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleAnalyze} style={{ height: '42px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {hasApiKey ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2Z"/>
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2Z"/>
                  </svg>
                  Analyze with {providerLabel}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                  </svg>
                  Analyze Text
                </>
              )}
            </button>
          </div>

          {/* Extracted syllabus topics listing */}
          {syllabusData?.topics && syllabusData.topics.length > 0 && (
            <div style={{ marginTop: '20px', borderTop: '0.5px solid var(--border-color)', paddingTop: '20px' }}>
              <h3 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '8px' }}>
                Extracted Syllabus Topics & Key Points
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Verify, edit, or disable topics. Disabled topics won't be used to generate questions.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {syllabusData.topics.map((topic) => (
                  <div key={topic.id} style={{
                    padding: '16px',
                    backgroundColor: topic.enabled ? 'var(--bg-input)' : 'rgba(0,0,0,0.02)',
                    opacity: topic.enabled ? 1 : 0.6,
                    borderRadius: 'var(--radius-sm)',
                    border: '0.5px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <Checkbox
                          checked={topic.enabled}
                          onChange={() => toggleTopicEnabled(topic.id)}
                          ariaLabel={`Toggle topic ${topic.name}`}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontWeight: 600, fontSize: '0.92rem', padding: '4px 8px', border: 'none', background: 'transparent', flex: 1 }}
                          value={topic.name}
                          onChange={(e) => updateTopicName(topic.id, e.target.value)}
                          disabled={!topic.enabled}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          className="form-select"
                          style={{ padding: '2px 8px', width: '100px', fontSize: '0.78rem' }}
                          value={topic.difficulty}
                          onChange={(e) => updateTopicDifficulty(topic.id, e.target.value)}
                          disabled={!topic.enabled}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setEditingTopicId(editingTopicId === topic.id ? null : topic.id)}
                          disabled={!topic.enabled}
                        >
                          {editingTopicId === topic.id ? 'Close Points' : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                              Key Points ({topic.keyPoints?.length || 0})
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Key Points Accordion */}
                    {editingTopicId === topic.id && topic.enabled && (
                      <div style={{
                        paddingLeft: '24px',
                        borderLeft: '2px solid var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '8px'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                          KEY LEARNING POINTS / SYLLABUS OUTLINE:
                        </div>
                        {topic.keyPoints.map((point, pIdx) => (
                          <div key={pIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
                              value={point}
                              onChange={(e) => updateKeyPoint(topic.id, pIdx, e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => deleteKeyPoint(topic.id, pIdx)}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ alignSelf: 'flex-start', fontSize: '0.72rem', marginTop: '4px' }}
                          onClick={() => addKeyPoint(topic.id)}
                        >
                          + Add key point
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
