import React from 'react';

interface TopRightStackProps {
  children: React.ReactNode;
}

/**
 * Fixed top-right container that stacks children vertically.
 * Used for scene controls and debug overlay positioning.
 */
export function TopRightStack({ children }: TopRightStackProps) {
  return (
    <div className="demo-right" aria-label="Top-right panels">
      {children}
    </div>
  );
}

export default TopRightStack;
