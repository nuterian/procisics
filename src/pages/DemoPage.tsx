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
  onPointerMove?: (ctx: FrameContext, pointer: { x: number; y: number; buttons: number }) => void;
  onPointerUp?: (ctx: FrameContext, pointer: { x: number; y: number; button: number }) => void;
  onKeyDown?: (e: KeyboardEvent, ctx: FrameContext | null) => void;
  rightControls?: React.ReactNode;
}

export const DemoPage = ({ 
  title,
  children,
  onInit,
  onFrame,
  enableKeyboardShortcuts = true,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
  rightControls
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
  const onFrameRef = useRef(onFrame);
  const onInitRef = useRef(onInit);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    onInitRef.current = onInit;
  }, [onInit]);

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
    if (onInitRef.current && frameCtxRef.current) {
      onInitRef.current(frameCtxRef.current);
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
        onFrameRef.current(frameCtxRef.current);
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
  }, [ensureCanvasSize]);

  // Keep a ref of the paused state so the animation loop sees updates
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Wire pointer down on the canvas and map to canvas space (CSS pixels)
  useEffect(() => {
    if (!onPointerDown && !onPointerMove && !onPointerUp) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const toPointer = (e: PointerEvent) => {
      if (!frameCtxRef.current) return null;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y };
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (!frameCtxRef.current) return;
      if (!onPointerDown) return;
      const p = toPointer(e);
      if (!p) return;
      onPointerDown(frameCtxRef.current, { x: p.x, y: p.y, button: e.button });
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!frameCtxRef.current) return;
      if (!onPointerMove) return;
      const p = toPointer(e);
      if (!p) return;
      onPointerMove(frameCtxRef.current, { x: p.x, y: p.y, buttons: e.buttons });
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (!frameCtxRef.current) return;
      if (!onPointerUp) return;
      const p = toPointer(e);
      if (!p) return;
      onPointerUp(frameCtxRef.current, { x: p.x, y: p.y, button: e.button });
    };
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

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
        if (onInitRef.current && frameCtxRef.current) {
          onInitRef.current(frameCtxRef.current);
        }
      }
      if (key === 'h') {
        setShowHelp((s) => !s);
      }
      if (key === 'f') {
        setShowDebug((s) => !s);
      }
      if (onKeyDown) {
        onKeyDown(e, frameCtxRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, onInit, onKeyDown]);

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
        rightControls={rightControls}
      />

      {/* Help Panel */}
      {showHelp && (
        <div className="help-panel" role="dialog" aria-label="Hotkeys help">
          <h3 className="help-title"><Keyboard className="help-title-icon" /> Hotkeys</h3>
          <HelpCategories />
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

function HelpCategories() {
  type HK = { keys: string | string[]; text: string };
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

  const categories: Array<{ title: string; items: HK[] }> = [
    {
      title: 'Simulation',
      items: [
        { keys: 'Space', text: 'Pause / Play' },
        { keys: 'R', text: 'Reset' },
        { keys: 'S', text: 'Toggle slow-mo' },
        { keys: 'Q', text: 'Shake' },
        { keys: 'F', text: 'Toggle debug' },
        { keys: 'Esc', text: 'Close help' },
      ],
    },
    {
      title: 'Gravity',
      items: [
        { keys: 'ArrowLeft', text: 'Tilt -5°' },
        { keys: 'ArrowRight', text: 'Tilt +5°' },
        { keys: 'ArrowUp', text: 'Reset tilt' },
      ],
    },
    {
      title: 'Forces',
      items: [
        { keys: 'W', text: 'Toggle wind' },
        { keys: 'A', text: 'Toggle attractor' },
      ],
    },
    {
      title: 'Spawning',
      items: [
        { keys: 'Click', text: 'Spawn at cursor' },
        { keys: ['Drag', 'Release'], text: 'Throw to spawn' },
        { keys: 'B', text: 'Burst spawn' },
        { keys: '1', text: 'Spawn Circle' },
        { keys: '2', text: 'Spawn Box' },
        { keys: '3', text: 'Spawn Triangle' },
        { keys: '0', text: 'Spawn Random' },
        { keys: 'X', text: 'Clear all' },
      ],
    },
  ];

  return (
    <div className="help-categories">
      {categories.map((cat, idx) => (
        <div className="help-category" key={idx}>
          <div className="help-category-title">{cat.title}</div>
          <div className="help-category-grid">
            {cat.items.map((hk, i) => (
              <div className="help-row" key={i}>
                {renderKeys(hk.keys)}
                <div className="help-text help-text-right">{hk.text}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}