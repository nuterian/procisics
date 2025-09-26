import React from 'react';
import { ToggleIconButton } from '@/components/ToggleIconButton';

interface PhysicsToggleProps {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  testId?: string;
}

/**
 * Styled toggle control for physics simulation features.
 * Wraps the base toggle button with physics-specific styling and tooltip.
 */
export function PhysicsToggle({ 
  label, 
  pressed, 
  onToggle, 
  icon, 
  testId 
}: PhysicsToggleProps) {
  return (
    <div 
      className="physics-toggle" 
      title={`${label} (toggle with keyboard)`}
      data-testid={testId}
    >
      <ToggleIconButton pressed={pressed} onPressedChange={onToggle}>
        {icon}
      </ToggleIconButton>
    </div>
  );
}

export default PhysicsToggle;
