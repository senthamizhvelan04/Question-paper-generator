

export default function AnalyticsPanel({ sections, targetMarks }) {
  // Calculate total marks and extract questions
  let totalMarks = 0;
  const allQuestions = [];
  
  sections.forEach((section) => {
    totalMarks += (section.numQuestions || 0) * (section.marksPerQuestion || 0);
    const resolvedType = section.type === 'CUSTOM' ? (section.questionFormat || 'SA') : section.type;
    (section.questions || []).forEach(q => {
      allQuestions.push({
        ...q,
        type: resolvedType
      });
    });
  });

  const questionCount = allQuestions.length;
  // MCQs: ~1.5 mins, True/False: ~1.5 mins, Fill-in-blanks: ~2 mins, Short Answer: ~4 mins, Long Answer: ~10 mins
  const estimatedTime = allQuestions.reduce((time, q) => {
    switch (q.type) {
      case 'MCQ': return time + 1.5;
      case 'TF': return time + 1.5;
      case 'FIB': return time + 2;
      case 'SA': return time + 4;
      case 'LA': return time + 10;
      case 'MATCH': return time + 3;
      case 'DRAW': return time + 8;
      case 'SOLVE': return time + 6;
      default: return time + 3;
    }
  }, 0);

  // Difficulty distributions
  const difficultyCounts = allQuestions.reduce(
    (acc, q) => {
      const diff = q.difficulty || 'Easy';
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    },
    { Easy: 0, Medium: 0, Hard: 0 }
  );

  // Type distributions
  const typeCounts = allQuestions.reduce(
    (acc, q) => {
      const type = q.type || 'MCQ';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    { MCQ: 0, FIB: 0, TF: 0, SA: 0, LA: 0 }
  );

  const getPercent = (count) => {
    if (questionCount === 0) return 0;
    return Math.round((count / questionCount) * 100);
  };

  const isMarksMatch = targetMarks && Number(totalMarks) === Number(targetMarks);

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div className="card" style={{ padding: '16px', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isMarksMatch ? 'var(--secondary)' : (targetMarks ? 'var(--primary)' : 'var(--text-main)') }}>
            {totalMarks}
            {targetMarks ? <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}> / {targetMarks}</span> : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Marks</div>
        </div>

        <div className="card" style={{ padding: '16px', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{questionCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Questions</div>
        </div>

        <div className="card" style={{ padding: '16px', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {Math.round(estimatedTime)}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}> mins</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Est. Duration</div>
        </div>
      </div>

      {targetMarks && !isMarksMatch && (
        <div 
          className="badge" 
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'rgba(245, 158, 11, 0.15)', 
            color: 'var(--warning)',
            fontSize: '0.75rem',
            textTransform: 'none'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>
            {totalMarks < targetMarks 
              ? `Add ${targetMarks - totalMarks} more marks to hit your target of ${targetMarks}.`
              : `Current marks exceed your target of ${targetMarks} by ${totalMarks - targetMarks} marks.`
            }
          </span>
        </div>
      )}

      {/* Difficulty Breakdown */}
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Difficulty Balance</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(difficultyCounts).map(([level, count]) => {
            const pct = getPercent(count);
            let barColor = 'var(--color-success)'; // Easy
            if (level === 'Medium') barColor = 'var(--color-warning)';
            if (level === 'Hard') barColor = 'var(--color-error)';

            return (
              <div key={level} style={{ fontSize: 'var(--text-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  <span>{level}</span>
                  <span>{count} ({pct}%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, transition: 'width 0.3s ease' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Types Breakdown */}
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Question Formats</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(typeCounts).map(([type, count]) => {
            if (count === 0) return null;
            const pct = getPercent(count);
            const typeLabels = { MCQ: 'Multiple Choice', FIB: 'Fill in Blanks', TF: 'True / False', SA: 'Short Answer', LA: 'Long Answer', MATCH: 'Match Columns', DRAW: 'Draw', SOLVE: 'Solve' };

            return (
              <div key={type} style={{ fontSize: 'var(--text-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  <span>{typeLabels[type] || type}</span>
                  <span>{count}</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--secondary)', transition: 'width 0.3s ease' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
