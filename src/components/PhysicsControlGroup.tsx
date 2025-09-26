import React from 'react';

interface PhysicsControlGroupProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for physics control toggles.
 * Provides consistent spacing and grouping for physics simulation controls.
 */
export function PhysicsControlGroup({ children }: PhysicsControlGroupProps) {
  return (
    <div className="physics-control-group">
      {children}
    </div>
  );
}

export default PhysicsControlGroup;
