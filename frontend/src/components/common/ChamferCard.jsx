import React from 'react';

/**
 * ChamferCard - Reusable container card with cut-corner (chamfer) styling.
 * Used for product cards, feature boxes, pricing tiers, and form wrappers.
 */
const ChamferCard = ({
  children,
  className = '',
  corner = 'bottom-right', // 'bottom-right' | 'large' | 'small' | 'top-left-bottom-right'
  hoverEffect = true,
  border = true,
  onClick,
  ...props
}) => {
  let chamferClass = 'chamfer-box';
  if (corner === 'large') chamferClass = 'chamfer-box-lg';
  if (corner === 'small') chamferClass = 'chamfer-box-sm';
  if (corner === 'top-left-bottom-right') chamferClass = 'chamfer-box-tl-br';

  return (
    <div
      onClick={onClick}
      className={`relative bg-[var(--theme-bg-surface)] ${chamferClass} ${
        border ? 'border border-[color:var(--theme-border-soft)]' : ''
      } ${
        hoverEffect ? 'transition-all duration-300 hover:border-[var(--theme-accent)]/50' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default ChamferCard;
