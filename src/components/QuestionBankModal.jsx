import { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { questionBank } from '../data/questionBank';

export default function QuestionBankModal({ isOpen, onClose, onAddQuestion, activeGrade, activeSubject, sections }) {
  const [filterGrade, setFilterGrade] = useState(activeGrade || 'All');
  const [filterSubject, setFilterSubject] = useState(activeSubject || 'All');
  const [filterType, setFilterType] = useState('All');
  const [filterDiff, setFilterDiff] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

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

  // Sync state with active grade/subject when modal opens or active selections change
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterGrade(activeGrade || 'All');
      setFilterSubject(activeSubject || 'All');
      if (sections && sections.length > 0) {
        setSelectedSectionId(sections[0].id);
      }
    }
  }, [isOpen, activeGrade, activeSubject, sections]);

  if (!isOpen) return null;

  // Filter the bank
  const filteredQuestions = questionBank.filter((q) => {
    const matchesGrade = filterGrade === 'All' || q.grade === filterGrade;
    const matchesSubject = filterSubject === 'All' || q.subject === filterSubject;
    const matchesType = filterType === 'All' || q.type === filterType;
    const matchesDiff = filterDiff === 'All' || q.difficulty === filterDiff;
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGrade && matchesSubject && matchesType && matchesDiff && matchesSearch;
  });

  // Helper to check if question is already in the paper
  const isQuestionInPaper = (qId) => {
    return sections.some((s) => s.questions.some((q) => q.bankId === qId));
  };

  const handleAdd = (q) => {
    if (!selectedSectionId) {
      showToast('Please create a section in your question paper first!', 'error');
      return;
    }
    
    // Convert bank question structure to active question structure
    const newQuestion = {
      // eslint-disable-next-line react-hooks/purity
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      bankId: q.id,
      type: q.type,
      text: q.question,
      options: q.options ? [...q.options] : [],
      answer: q.answer || '',
      difficulty: q.difficulty,
      marks: q.defaultMarks || 1
    };

    onAddQuestion(selectedSectionId, newQuestion);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '850px', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Browse Built-in Question Bank</span>
          <button 
            type="button" 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-muted)' }}
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', padding: '4px' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
              type="text"
              className="form-input"
              style={{ flex: 1, minWidth: '180px' }}
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <select
              className="form-input"
              style={{ flex: '1 1 120px' }}
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
            >
              <option value="All">All Grades</option>
              <option value="III">Grade III</option>
              <option value="IV">Grade IV</option>
              <option value="V">Grade V</option>
              <option value="VI">Grade VI</option>
            </select>

            <select
              className="form-input"
              style={{ flex: '1 1 120px' }}
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="All">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Computer Science">Computer Science</option>
            </select>

            <select
              className="form-input"
              style={{ flex: '1 1 120px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Formats</option>
              <option value="MCQ">Multiple Choice</option>
              <option value="FIB">Fill in Blanks</option>
              <option value="TF">True / False</option>
              <option value="SA">Short Answer</option>
              <option value="LA">Long Answer</option>
            </select>

            <select
              className="form-input"
              style={{ flex: '1 1 120px' }}
              value={filterDiff}
              onChange={(e) => setFilterDiff(e.target.value)}
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Section Selection Bar */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg-main)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Target Section for importing:</span>
            {sections.length === 0 ? (
              <span style={{ color: 'var(--danger)' }}>No sections created yet! Create a section first.</span>
            ) : (
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.title || "Untitled Section"}</option>
                ))}
              </select>
            )}
          </div>

          {/* Questions List */}
          <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
             {filteredQuestions.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <div className="empty-state-title">No matching questions found</div>
                <div className="empty-state-desc">Try clearing filters or changing your search terms.</div>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const added = isQuestionInPaper(q.id);
                let diffBadge = 'badge-easy';
                if (q.difficulty === 'Medium') diffBadge = 'badge-medium';
                if (q.difficulty === 'Hard') diffBadge = 'badge-hard';

                return (
                  <div 
                    key={q.id} 
                    className="bank-question-card stagger-item"
                    style={{
                      animationDelay: `${idx * 25}ms`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary">{q.grade}</span>
                        <span className="badge badge-secondary">{q.subject}</span>
                        <span className={`badge ${diffBadge}`}>{q.difficulty}</span>
                        <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }}>
                          {q.type} ({q.defaultMarks} {q.defaultMarks === 1 ? 'Mark' : 'Marks'})
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4, color: 'var(--text-main)' }}>
                        {q.question}
                      </p>
                      {q.options && q.options.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                          {q.options.map((opt, idx) => (
                            <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <strong>{String.fromCharCode(65 + idx)})</strong> {opt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      {added ? (
                        <span className="badge badge-success" style={{ padding: '8px 12px', textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Added
                        </span>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAdd(q)}
                          disabled={sections.length === 0}
                          style={{ opacity: sections.length === 0 ? 0.5 : 1 }}
                        >
                          + Add to Paper
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
