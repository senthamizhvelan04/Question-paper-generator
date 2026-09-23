import { useState, useEffect } from 'react';

export default function MyPapersModal({
  isOpen,
  onClose,
  papers,
  currentPaperId,
  onSelectPaper,
  onCreatePaper,
  onDeletePaper,
  onDuplicatePaper,
  onRenamePaper
}) {
  const [renameId, setRenameId] = useState(null);
  const [newName, setNewName] = useState('');

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

  if (!isOpen) return null;

  const paperList = Object.values(papers).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const startRename = (paper) => {
    setRenameId(paper.id);
    setNewName(paper.headerData.examTitle || 'Untitled Paper');
  };

  const saveRename = (id) => {
    if (newName.trim()) {
      onRenamePaper(id, newName.trim());
    }
    setRenameId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '680px', 
          maxHeight: '80vh', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            My Saved Papers
          </span>
          <button 
            type="button" 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-muted)' }}
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage and switch between your active question papers.
          </span>
          <button 
            className="btn btn-success btn-sm"
            onClick={() => {
              onCreatePaper();
            }}
          >
            + Create New Paper
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {paperList.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <span className="empty-state-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </span>
              <div className="empty-state-title" style={{ fontSize: 'var(--text-base)' }}>No papers saved yet</div>
              <div className="empty-state-desc" style={{ fontSize: 'var(--text-xs)' }}>Click "Create New Paper" to get started.</div>
            </div>
          ) : (
            paperList.map((paper) => {
              const isCurrent = paper.id === currentPaperId;
              const dateStr = new Date(paper.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={paper.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrent ? '1.5px solid var(--primary)' : '0.5px solid var(--border-color)',
                    backgroundColor: isCurrent ? 'rgba(194, 89, 63, 0.02)' : 'var(--bg-card)',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renameId === paper.id ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input 
                            type="text"
                            className="form-input"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.9rem', flex: 1 }}
                            autoFocus
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => saveRename(paper.id)}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setRenameId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              style={{ 
                                fontWeight: 600, 
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                textDecoration: isCurrent ? 'underline' : 'none'
                              }}
                              onClick={() => {
                                onSelectPaper(paper.id);
                                onClose();
                              }}
                            >
                              {paper.headerData?.examTitle || 'Untitled Paper'}
                            </span>
                            {isCurrent && (
                              <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                                Active
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {paper.headerData?.schoolName || 'No School'} | Grade {paper.headerData?.grade || '—'} | {paper.headerData?.subject || '—'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                      Last updated: {dateStr}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '0.5px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onSelectPaper(paper.id);
                        onClose();
                      }}
                      disabled={isCurrent}
                    >
                      Open
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => startRename(paper)}
                    >
                      Rename
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onDuplicatePaper(paper.id)}
                    >
                      Duplicate
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this paper? This cannot be undone.')) {
                          onDeletePaper(paper.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
