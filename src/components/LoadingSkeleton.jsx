export default function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="shimmer-wrapper">
      {Array.from({ length: lines }).map((_, idx) => (
        <div 
          key={idx} 
          className="shimmer-bar" 
          style={{ 
            width: idx === lines - 1 ? '60%' : '100%',
            marginBottom: '4px' 
          }} 
        />
      ))}
    </div>
  );
}
