import React from 'react';

interface ToggleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
}

/**
 * Base toggle button component with accessibility support.
 * Handles only behavior - styling is applied via className.
 */
export function ToggleIconButton({ 
  pressed, 
  onPressedChange, 
  children, 
  className = '',
  ...props 
}: ToggleIconButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`toggle-icon-button ${pressed ? 'on' : 'off'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default ToggleIconButton;
