import React from 'react';

interface SceneControlsPanelProps {
  children: React.ReactNode;
}

/**
 * Styled panel wrapper for scene-specific controls.
 * Provides consistent styling and layout for per-demo UI elements.
 */
export function SceneControlsPanel({ children }: SceneControlsPanelProps) {
  return (
    <div className="scene-controls-panel">
      {children}
    </div>
  );
}

export default SceneControlsPanel;
