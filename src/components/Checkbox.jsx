export default function Checkbox({ checked, onChange, disabled, label, ariaLabel }) {
  return (
    <label 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <span 
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          border: `1px solid ${checked ? 'var(--primary)' : 'var(--border-color)'}`,
          backgroundColor: checked ? 'var(--primary)' : 'var(--bg-card)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--dur-fast) var(--ease-snappy)',
          flexShrink: 0,
          position: 'relative'
        }}
        className="checkbox-box"
      >
        <input 
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-label={ariaLabel}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'inherit',
            margin: 0
          }}
        />
        <svg 
          width="10" 
          height="8" 
          viewBox="0 0 10 8" 
          fill="none" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transform: checked ? 'scale(1)' : 'scale(0)',
            opacity: checked ? 1 : 0,
            transition: 'transform var(--dur-fast) var(--ease-snappy), opacity var(--dur-fast) var(--ease-snappy)'
          }}
        >
          <polyline points="9 1 3.5 6.5 1 4" />
        </svg>
      </span>
      {label && <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-main)' }}>{label}</span>}
    </label>
  );
}
