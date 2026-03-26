import React from 'react';

const ShimmerLoader = ({ type = 'default', height = '20px', width = '100%', count = 1, className = '' }) => {
  const shimmerBase = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
  };

  const shimmerTypes = {
    default: { ...shimmerBase, height, width },
    text: { ...shimmerBase, height: '16px', width, marginBottom: '8px' },
    title: { ...shimmerBase, height: '24px', width: '60%', marginBottom: '16px' },
    button: { ...shimmerBase, height: '36px', width: '120px', borderRadius: '6px' },
    table: { ...shimmerBase, height: '40px', width, marginBottom: '4px' },
    tableHeader: { ...shimmerBase, height: '20px', width, backgroundColor: '#e8e8e8' },
    card: { ...shimmerBase, height: '120px', width, borderRadius: '8px' },
    avatar: { ...shimmerBase, height: '40px', width: '40px', borderRadius: '50%' },
    input: { ...shimmerBase, height: '40px', width, borderRadius: '6px' },
    small: { ...shimmerBase, height: '12px', width: '80px' },
  };

  const style = shimmerTypes[type] || shimmerTypes.default;

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`shimmer-loader ${className}`}
          style={{ ...style, animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </>
  );
};

// Specific shimmer components for different use cases
export const TableShimmer = ({ rows = 5, columns = 4 }) => (
  <div>
    {/* Header */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', padding: '12px' }}>
      {Array.from({ length: columns }, (_, i) => (
        <ShimmerLoader key={`header-${i}`} type="tableHeader" style={{ flex: 1 }} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={`row-${rowIndex}`} style={{ display: 'flex', gap: '8px', padding: '12px' }}>
        {Array.from({ length: columns }, (_, colIndex) => (
          <ShimmerLoader key={`cell-${rowIndex}-${colIndex}`} type="table" style={{ flex: 1 }} />
        ))}
      </div>
    ))}
  </div>
);

export const CardShimmer = ({ count = 3 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <ShimmerLoader type="title" />
        <ShimmerLoader type="text" count={3} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <ShimmerLoader type="button" />
          <ShimmerLoader type="button" width="80px" />
        </div>
      </div>
    ))}
  </div>
);

export const FormShimmer = ({ fieldCount = 5 }) => (
  <div style={{ maxWidth: '500px' }}>
    <ShimmerLoader type="title" />
    {Array.from({ length: fieldCount }, (_, i) => (
      <div key={i} style={{ marginBottom: '16px' }}>
        <ShimmerLoader type="small" width="120px" style={{ marginBottom: '8px' }} />
        <ShimmerLoader type="input" />
      </div>
    ))}
    <div style={{ display: 'flex', gap: '8px' }}>
      <ShimmerLoader type="button" />
      <ShimmerLoader type="button" width="100px" />
    </div>
  </div>
);

export const ListShimmer = ({ count = 5, showAvatar = true }) => (
  <div>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
        {showAvatar && <ShimmerLoader type="avatar" />}
        <div style={{ flex: 1 }}>
          <ShimmerLoader type="text" width="150px" />
          <ShimmerLoader type="small" width="100px" />
        </div>
        <ShimmerLoader type="button" width="60px" />
      </div>
    ))}
  </div>
);

export default ShimmerLoader;
