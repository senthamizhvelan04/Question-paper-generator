import { useState, useEffect, useRef } from 'react';
import { 
  getApiKey, setApiKey, 
  getGroqApiKey, setGroqApiKey, 
  getAiProvider, setAiProvider 
} from '../utils/aiGenerator';

export default function AISettingsModal({ isOpen, onClose }) {
  const [provider, setProviderState] = useState(getAiProvider());
  const [geminiKey, setGeminiKeyState] = useState(getApiKey());
  const [groqKey, setGroqKeyState] = useState(getGroqApiKey());
  const [saved, setSaved] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Auto-focus first focusable element
      setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll('button, input, select, textarea');
          if (focusable.length > 0) focusable[0].focus();
        }
      }, 50);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    setAiProvider(provider);
    setApiKey(geminiKey);
    setGroqApiKey(groqKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const isConfigured = (provider === 'gemini' && geminiKey) || (provider === 'groq' && groqKey);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            AI Provider Settings
          </span>
          <button 
            type="button" 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-muted)' }}
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
            Choose your preferred AI service and configure the credentials to power automated syllabus analysis and question paper generation.
          </p>

          <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <strong>What is an API Key?</strong> An API key is a private code that acts as a secure password allowing ExamPrep to connect directly to AI models (like Google Gemini). This enables advanced question generation based on your syllabus. Keys are stored safely in your own browser's storage and never sent anywhere else.
          </div>

          <div className="form-group">
            <label className="form-label">Active AI Provider</label>
            <select 
              className="form-select" 
              value={provider} 
              onChange={(e) => setProviderState(e.target.value)}
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="groq">Groq (Llama 3.3 70B)</option>
            </select>
          </div>

          {provider === 'gemini' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gemini API Key</span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.75rem' }}
                >
                  Get free key →
                </a>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Paste Gemini API key (AIzaSy...)"
                value={geminiKey}
                onChange={(e) => setGeminiKeyState(e.target.value)}
              />
            </div>
          )}

          {provider === 'groq' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Groq API Key</span>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.75rem' }}
                >
                  Get Groq key →
                </a>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Paste Groq API key (gsk_...)"
                value={groqKey}
                onChange={(e) => setGroqKeyState(e.target.value)}
              />
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--text-xs)',
            padding: '8px 12px',
            backgroundColor: isConfigured ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
            border: `1.5px solid ${isConfigured ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
            borderRadius: 'var(--radius-sm)',
            color: isConfigured ? 'var(--color-success)' : 'var(--color-warning)',
            fontWeight: 500
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: isConfigured ? 'var(--color-success)' : 'var(--color-warning)',
            }} />
            {isConfigured ? `${provider === 'gemini' ? 'Google Gemini' : 'Groq'} key is configured. AI features active.` : 'Running in Local Mode (Basic Offline Generation).'}
          </div>
 
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saved} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {saved ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved!
                </span>
              ) : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
