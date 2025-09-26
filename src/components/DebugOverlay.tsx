import { FpsCounter } from '@/components/FpsCounter';

interface DebugOverlayProps {
  fps: number;
  show: boolean;
}

/**
 * Debug information overlay showing FPS and other metrics.
 * Can be rendered standalone or within a container stack.
 */
export function DebugOverlay({ fps, show }: DebugOverlayProps) {
  if (!show) return null;
  
  return (
    <div className="debug-overlay" aria-label="Debug overlay">
      <FpsCounter fps={fps} />
    </div>
  );
}

export default DebugOverlay;
