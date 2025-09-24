import { useState, useRef, useEffect, useMemo } from 'react';
import { Keyboard } from 'lucide-react';
import Hud from '@/components/Hud';

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
  const [showDebug, setShowDebug] = useState(true);

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
      if (key === 'f') {
        setShowDebug((s) => !s);
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
      
      <Hud 
        title={title}
        isPaused={isPaused}
        fps={fps}
        onTogglePause={handlePause}
        onReset={handleReset}
        onToggleHelp={toggleHelp}
        showHelp={showHelp}
        showDebug={showDebug}
      />

      {/* Help Panel */}
      {showHelp && (
        <div className="help-panel" role="dialog" aria-label="Hotkeys help">
          <h3 className="help-title"><Keyboard className="help-title-icon" /> Hotkeys</h3>
          <HelpList />
        </div>
      )}

      {children}
    </div>
  );
};

export default DemoPage;

function Keycap({ label }: { label: string }) {
  const isSpace = label.toLowerCase() === 'space';
  const display = label === ' ' ? 'Space' : label;
  const className = isSpace ? 'keycap keycap-space' : 'keycap';
  return <span className={className}>{display}</span>;
}

function HelpList() {
  const hotkeys: Array<{ keys: string | string[]; text: string }> = [
    { keys: 'Space', text: 'Pause / Play' },
    { keys: 'R', text: 'Reset' },
    { keys: 'H', text: 'Toggle help' },
    { keys: 'F', text: 'Toggle debug' },
    { keys: 'Esc', text: 'Close help' },
  ];

  const renderKeys = (keys: string | string[]) => {
    if (Array.isArray(keys)) {
      return (
        <div className="help-keys">
          {keys.map((k, i) => (
            <>
              <Keycap key={k + i} label={k} />
              {i < keys.length - 1 ? <span className="help-plus">+</span> : null}
            </>
          ))}
        </div>
      );
    }
    return (
      <div className="help-keys">
        <Keycap label={keys} />
      </div>
    );
  };

  return (
    <div className="help-grid">
      {hotkeys.map((hk, idx) => (
        <div className="help-row" key={idx}>
          {renderKeys(hk.keys)}
          <div className="help-text help-text-right">{hk.text}</div>
        </div>
      ))}
    </div>
  );
}