export default function LoadingState({ text, progress, subtitle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '16px', width: '100%' }}>
      <div className="spinner" />
      <div style={{ fontWeight: 500, color: 'var(--text-main)', textAlign: 'center', fontSize: 'var(--fs-base)' }}>
        {text || 'Loading...'}
      </div>
      {progress !== undefined && (
        <div style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{progress}%</span>
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
