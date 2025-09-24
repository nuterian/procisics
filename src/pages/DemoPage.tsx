import { useState, useRef, useEffect, useMemo } from 'react';

export interface FrameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  time: number; // seconds since init/reset
  dt: number;   // seconds since last frame
  width: number; // CSS pixels
  height: number; // CSS pixels
  dpr: number; // device pixel ratio
}

interface DemoPageProps {
  title: string;
  children?: React.ReactNode;
  onInit?: (ctx: FrameContext) => void;
  onFrame: (ctx: FrameContext) => void;
  enableKeyboardShortcuts?: boolean;
  onPointerDown?: (ctx: FrameContext, pointer: { x: number; y: number; button: number }) => void;
}

export const DemoPage = ({ 
  title,
  children,
  onInit,
  onFrame,
  enableKeyboardShortcuts = true,
  onPointerDown
}: DemoPageProps) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fps, setFps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const frameCtxRef = useRef<FrameContext | null>(null);
  const isPausedRef = useRef<boolean>(false);

  const ensureCanvasSize = useMemo(() => {
    return () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Set backing store size
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      // Ensure CSS size matches viewport
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.touchAction = 'none';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Reset transform and scale for DPR
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      frameCtxRef.current = {
        canvas,
        ctx,
        time: 0,
        dt: 0,
        width,
        height,
        dpr
      };
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    ensureCanvasSize();
    const handleResize = () => {
      ensureCanvasSize();
    };
    window.addEventListener('resize', handleResize);

    // Initialize lifecycle and timing
    startTimeRef.current = performance.now();
    lastTimeRef.current = startTimeRef.current;
    if (onInit && frameCtxRef.current) {
      onInit(frameCtxRef.current);
    }

    const animate = (now: number) => {
      const last = lastTimeRef.current;
      if (isPausedRef.current) {
        // Avoid huge dt on resume; keep timing continuous
        lastTimeRef.current = now;
      } else if (frameCtxRef.current) {
        const deltaMs = now - last;
        const dt = deltaMs / 1000;
        if (deltaMs > 0) {
          setFps(1000 / deltaMs);
        }
        const t = (now - startTimeRef.current) / 1000;
        frameCtxRef.current.time = t;
        frameCtxRef.current.dt = dt;
        onFrame(frameCtxRef.current);
        lastTimeRef.current = now;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [onInit, onFrame, ensureCanvasSize]);

  // Keep a ref of the paused state so the animation loop sees updates
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Wire pointer down on the canvas and map to canvas space (CSS pixels)
  useEffect(() => {
    if (!onPointerDown) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!frameCtxRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onPointerDown(frameCtxRef.current, { x, y, button: e.button });
    };
    canvas.addEventListener('pointerdown', handlePointerDown);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onPointerDown]);

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        setShowHelp(false);
      }
      if (key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
      if (key === 'r') {
        // Re-init state
        startTimeRef.current = performance.now();
        lastTimeRef.current = startTimeRef.current;
        if (onInit && frameCtxRef.current) {
          onInit(frameCtxRef.current);
        }
      }
      if (key === 'h') {
        setShowHelp((s) => !s);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, onInit]);

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    startTimeRef.current = performance.now();
    lastTimeRef.current = startTimeRef.current;
    if (onInit && frameCtxRef.current) {
      onInit(frameCtxRef.current);
    }
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  return (
    <div className="demo-viewport">
      <canvas 
        ref={canvasRef}
        className="demo-canvas"
        aria-label={`${title} simulation`}
      />
      
      {/* HUD Controls */}
      <div className="demo-hud">
        <span className="demo-title">{title}</span>
        
        <button 
          className="demo-button" 
          onClick={handlePause}
          aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        
        <button 
          className="demo-button" 
          onClick={handleReset}
          aria-label="Reset simulation"
        >
          Reset
        </button>
        
        <button 
          className="demo-button" 
          onClick={toggleHelp}
          aria-label="Toggle help panel"
          aria-expanded={showHelp}
        >
          Help
        </button>
        
        <span className="demo-fps">
          {fps.toFixed(0)} FPS
        </span>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="help-panel">
          <h3 className="help-title">Controls</h3>
          <div className="help-list">
            <div className="help-item">• Space: Pause/Resume</div>
            <div className="help-item">• R: Reset</div>
            <div className="help-item">• H: Toggle help</div>
            <div className="help-item">• Escape: Close help</div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default DemoPage;