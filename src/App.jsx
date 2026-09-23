import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Step1Details from './components/Step1Details';
import SyllabusUpload from './components/SyllabusUpload';
import Step2Sections from './components/Step2Sections';
import Step3Preview from './components/Step3Preview';
import AISettingsModal from './components/AISettingsModal';
import MyPapersModal from './components/MyPapersModal';
import ToastContainer from './components/ToastContainer';

// --- Default initial states ---
const INITIAL_HEADER = {
  schoolName: 'ABCD International School',
  examTitle: 'Mid-Term Examination 2026',
  grade: 'IV',
  subject: 'Science',
  examType: 'Mid Term',
  duration: '1.5 hours',
  totalMarks: 50,
  dateOfExam: '',
  academicYear: '2025-2026',
  instructions: 'All questions are compulsory.\nFigures to the right indicate full marks for that question.\nUse of calculators is not permitted.\nWrite neatly and legibly.'
};

// Pre-loaded default sections: MCQ + Fill in blanks + Short answer
const INITIAL_SECTIONS = [
  {
    id: 'sec-default-1',
    type: 'MCQ',
    title: 'Multiple choice',
    numQuestions: 5,
    marksPerQuestion: 1,
    questions: [
      { id: 'q-mcq-1', text: '', options: ['', '', '', ''], answer: '' },
      { id: 'q-mcq-2', text: '', options: ['', '', '', ''], answer: '' },
      { id: 'q-mcq-3', text: '', options: ['', '', '', ''], answer: '' },
      { id: 'q-mcq-4', text: '', options: ['', '', '', ''], answer: '' },
      { id: 'q-mcq-5', text: '', options: ['', '', '', ''], answer: '' }
    ]
  },
  {
    id: 'sec-default-2',
    type: 'FIB',
    title: 'Fill in the blanks',
    numQuestions: 5,
    marksPerQuestion: 1,
    questions: [
      { id: 'q-fib-1', text: '', answer: '' },
      { id: 'q-fib-2', text: '', answer: '' },
      { id: 'q-fib-3', text: '', answer: '' },
      { id: 'q-fib-4', text: '', answer: '' },
      { id: 'q-fib-5', text: '', answer: '' }
    ]
  },
  {
    id: 'sec-default-3',
    type: 'SA',
    title: 'Short answer',
    numQuestions: 5,
    marksPerQuestion: 2,
    questions: [
      { id: 'q-sa-1', text: '', answer: '' },
      { id: 'q-sa-2', text: '', answer: '' },
      { id: 'q-sa-3', text: '', answer: '' },
      { id: 'q-sa-4', text: '', answer: '' },
      { id: 'q-sa-5', text: '', answer: '' }
    ]
  }
];

// Step definitions
const STEPS = [
  { num: 1, label: 'Paper details' },
  { num: 2, label: 'Upload syllabus' },
  { num: 3, label: 'Sections & marks' },
  { num: 4, label: 'Preview & export' }
];

export default function App() {
  // --- Core State ---
  const [activeStep, setActiveStep] = useState(() => {
    const saved = localStorage.getItem('qmaker_step');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [papers, setPapers] = useState(() => {
    const saved = localStorage.getItem('qmaker_papers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) return parsed;
      } catch (e) {}
    }

    // Check legacy import
    const oldHeader = localStorage.getItem('qmaker_header_v2');
    const oldSyllabus = localStorage.getItem('qmaker_syllabus');
    const oldSections = localStorage.getItem('qmaker_sections_v2');

    const initialPaperId = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    let header = INITIAL_HEADER;
    let syllabus = null;
    let sects = INITIAL_SECTIONS;

    if (oldHeader) {
      try { header = JSON.parse(oldHeader); } catch (e) {}
    }
    if (oldSyllabus) {
      try { syllabus = JSON.parse(oldSyllabus); } catch (e) {}
    }
    if (oldSections) {
      try { sects = JSON.parse(oldSections); } catch (e) {}
    }

    const firstPaper = {
      id: initialPaperId,
      headerData: header,
      syllabusData: syllabus,
      sections: sects,
      updatedAt: new Date().toISOString()
    };

    const initialPapers = { [initialPaperId]: firstPaper };
    localStorage.setItem('qmaker_papers', JSON.stringify(initialPapers));
    localStorage.setItem('qmaker_current_paper_id', initialPaperId);

    // Clear legacy keys
    localStorage.removeItem('qmaker_header_v2');
    localStorage.removeItem('qmaker_syllabus');
    localStorage.removeItem('qmaker_sections_v2');

    return initialPapers;
  });

  const [currentPaperId, setCurrentPaperId] = useState(() => {
    return localStorage.getItem('qmaker_current_paper_id') || Object.keys(papers)[0] || '';
  });

  const currentPaper = papers[currentPaperId] || Object.values(papers)[0] || {};

  const [headerData, setHeaderData] = useState(currentPaper.headerData || INITIAL_HEADER);
  const [syllabusData, setSyllabusData] = useState(currentPaper.syllabusData || null);
  const [sections, setSections] = useState(currentPaper.sections || INITIAL_SECTIONS);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('qmaker_theme') || 'light';
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [papersOpen, setPapersOpen] = useState(false);
  const [stepDirection, setStepDirection] = useState('forward');

  // --- Sliding step-pill indicator ---
  const stepContainerRef = useRef(null);
  const pillRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ transform: 'translateX(0px)', width: 0 });

  useLayoutEffect(() => {
    const activePill = pillRefs.current[activeStep];
    const container = stepContainerRef.current;
    if (activePill && container) {
      const containerRect = container.getBoundingClientRect();
      const pillRect = activePill.getBoundingClientRect();
      setIndicatorStyle({
        transform: `translateX(${pillRect.left - containerRect.left}px)`,
        width: pillRect.width,
      });
    }
  }, [activeStep]);

  // --- Theme Controller ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('qmaker_theme', theme);
  }, [theme]);

  // Sync state when currentPaperId changes
  useEffect(() => {
    const paper = papers[currentPaperId];
    if (paper) {
      setHeaderData(paper.headerData || INITIAL_HEADER);
      setSyllabusData(paper.syllabusData || null);
      setSections(paper.sections || INITIAL_SECTIONS);
    }
  }, [currentPaperId]);

  // Auto-save changes back to papers dictionary
  useEffect(() => {
    if (!currentPaperId) return;
    setPapers(prev => {
      const updated = {
        ...prev,
        [currentPaperId]: {
          ...prev[currentPaperId],
          headerData,
          syllabusData,
          sections,
          updatedAt: new Date().toISOString()
        }
      };
      localStorage.setItem('qmaker_papers', JSON.stringify(updated));
      return updated;
    });
  }, [headerData, syllabusData, sections, currentPaperId]);

  useEffect(() => {
    if (currentPaperId) {
      localStorage.setItem('qmaker_current_paper_id', currentPaperId);
    }
  }, [currentPaperId]);

  useEffect(() => {
    localStorage.setItem('qmaker_step', String(activeStep));
  }, [activeStep]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- Navigation ---
  const goNext = () => {
    if (activeStep < 4) {
      setStepDirection('forward');
      setActiveStep(activeStep + 1);
    }
  };

  const goPrev = () => {
    if (activeStep > 1) {
      setStepDirection('back');
      setActiveStep(activeStep - 1);
    }
  };

  const goToStep = (stepNum) => {
    setStepDirection(stepNum >= activeStep ? 'forward' : 'back');
    setActiveStep(stepNum);
  };

  // --- Paper Actions ---
  const createNewPaper = () => {
    const newId = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newPaper = {
      id: newId,
      headerData: {
        ...INITIAL_HEADER,
        examTitle: `New Exam ${new Date().toLocaleDateString()}`
      },
      syllabusData: null,
      sections: INITIAL_SECTIONS,
      updatedAt: new Date().toISOString()
    };
    setPapers(prev => {
      const updated = { ...prev, [newId]: newPaper };
      localStorage.setItem('qmaker_papers', JSON.stringify(updated));
      return updated;
    });
    setCurrentPaperId(newId);
    setActiveStep(1);
  };

  const deletePaper = (id) => {
    setPapers(prev => {
      const updated = { ...prev };
      delete updated[id];
      const remainingIds = Object.keys(updated);
      if (remainingIds.length > 0) {
        setCurrentPaperId(remainingIds[0]);
      } else {
        const newId = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        updated[newId] = {
          id: newId,
          headerData: INITIAL_HEADER,
          syllabusData: null,
          sections: INITIAL_SECTIONS,
          updatedAt: new Date().toISOString()
        };
        setCurrentPaperId(newId);
      }
      localStorage.setItem('qmaker_papers', JSON.stringify(updated));
      return updated;
    });
  };

  const duplicatePaper = (id) => {
    const source = papers[id];
    if (!source) return;
    const newId = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const duplicated = {
      ...source,
      id: newId,
      headerData: {
        ...source.headerData,
        examTitle: `${source.headerData.examTitle || 'Untitled Paper'} (Copy)`
      },
      updatedAt: new Date().toISOString()
    };
    setPapers(prev => {
      const updated = { ...prev, [newId]: duplicated };
      localStorage.setItem('qmaker_papers', JSON.stringify(updated));
      return updated;
    });
    setCurrentPaperId(newId);
  };

  const renamePaper = (id, newTitle) => {
    setPapers(prev => {
      if (!prev[id]) return prev;
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          headerData: {
            ...prev[id].headerData,
            examTitle: newTitle
          },
          updatedAt: new Date().toISOString()
        }
      };
      localStorage.setItem('qmaker_papers', JSON.stringify(updated));
      return updated;
    });
  };

  const resetPaper = () => {
    if (confirm('Create a new paper? Your current paper is automatically saved in "My Papers".')) {
      createNewPaper();
    }
  };

  const resetCurrentPaper = () => {
    if (confirm('Reset this paper? All filled data (header, syllabus, questions) will be cleared back to defaults.')) {
      setHeaderData({ ...INITIAL_HEADER });
      setSyllabusData(null);
      setSections(JSON.parse(JSON.stringify(INITIAL_SECTIONS)));
      setActiveStep(1);
    }
  };

    // Compute step completion status
  const isStepCompleted = (stepNum) => {
    if (stepNum === 1) {
      return headerData.schoolName && headerData.grade && headerData.subject;
    }
    if (stepNum === 2) {
      return syllabusData?.topics && syllabusData.topics.length > 0;
    }
    if (stepNum === 3) {
      return sections.length > 0;
    }
    return false;
  };

  return (
    <div className="app-container app-entrance">
      {/* Top Bar */}
      <div className="topbar">
                <div className="logo-container">
          <span className="logo-text">ExamPrep</span>
          <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Question Paper Maker
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setPapersOpen(true)} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            My Papers
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setSettingsOpen(true)} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            AI Settings
          </button>
          <button className="btn btn-sm btn-secondary" onClick={resetPaper}>
            New Paper
          </button>
          <button className="btn btn-sm btn-secondary" onClick={resetCurrentPaper} title="Reset current paper to defaults">
            Reset
          </button>
          <button 
            className={`theme-toggle-btn ${theme === 'dark' ? 'dark-mode' : ''}`} 
            onClick={toggleTheme} 
            title="Toggle theme"
            aria-label="Toggle light and dark theme"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.75" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="theme-toggle-icon"
            >
              <circle cx="12" cy="12" r="5" className="sun-core" />
              <g className="sun-rays">
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </g>
              <path 
                className="moon-crescent" 
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              />
            </svg>
          </button>
        </div>
      </div>
 
      {/* Step Pill Navigation */}
      <div className="step-container" ref={stepContainerRef}>
        <div className="step-pill-indicator" style={indicatorStyle} />
        {STEPS.map((step, index) => {
          const completed = isStepCompleted(step.num);
          return (
            <React.Fragment key={step.num}>
              {index > 0 && <div className="step-divider" />}
              <button
                ref={(el) => { pillRefs.current[step.num] = el; }}
                className={`step-pill ${activeStep === step.num ? 'active' : ''} ${completed && activeStep !== step.num ? 'completed' : ''}`}
                onClick={() => goToStep(step.num)}
              >
                <span style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: '0.5px solid currentColor',
                  flexShrink: 0
                }}>
                  {completed && activeStep !== step.num ? (
                    <svg className="step-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : step.num}
                </span>
                {step.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content Layout */}
      <div key={activeStep} className={`step-content-wrapper active ${stepDirection === 'back' ? 'dir-back' : ''} edit-step`}>
        {activeStep === 1 && (
          <Step1Details
            headerData={headerData}
            onChange={setHeaderData}
          />
        )}
        {activeStep === 2 && (
          <SyllabusUpload
            headerData={headerData}
            syllabusData={syllabusData}
            onSyllabusChange={setSyllabusData}
          />
        )}
        {activeStep === 3 && (
          <Step2Sections
            sections={sections}
            onSectionsChange={setSections}
            totalMarks={parseInt(headerData.totalMarks, 10) || 50}
            syllabusData={syllabusData}
            activeGrade={headerData.grade}
            activeSubject={headerData.subject}
          />
        )}
        {activeStep === 4 && (
          <Step3Preview
            headerData={headerData}
            sections={sections}
            syllabusData={syllabusData}
            onSectionsChange={setSections}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="navigation-footer no-print">
        <div>
          {activeStep > 1 && (
            <button className="btn btn-secondary" onClick={goPrev} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Previous
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
          Step {activeStep} <span style={{ opacity: 0.5 }}>/ 4</span>
        </div>

        <div>
          {activeStep < 4 ? (
            <button className="btn btn-primary" onClick={goNext} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ) : (
            <button className="btn btn-success" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print paper
            </button>
          )}
        </div>
      </div>

      <AISettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <MyPapersModal
        isOpen={papersOpen}
        onClose={() => setPapersOpen(false)}
        papers={papers}
        currentPaperId={currentPaperId}
        onSelectPaper={setCurrentPaperId}
        onCreatePaper={createNewPaper}
        onDeletePaper={deletePaper}
        onDuplicatePaper={duplicatePaper}
        onRenamePaper={renamePaper}
      />

      <ToastContainer />
    </div>
  );
}
