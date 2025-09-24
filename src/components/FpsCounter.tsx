import { useEffect, useMemo, useRef } from 'react';
import { Gauge } from 'lucide-react';

export function FpsCounter({ fps }: { fps: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const valuesRef = useRef<number[]>([]);
  const maxSamples = 60; // keep ~1s history at 60Hz
  const width = 72; // CSS pixels
  const height = 24; // CSS pixels

  // Device pixel ratio setup for crisp lines on HiDPI
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const canvasWidth = useMemo(() => Math.floor(width * dpr), [dpr]);
  const canvasHeight = useMemo(() => Math.floor(height * dpr), [dpr]);

  useEffect(() => {
    const list = valuesRef.current;
    list.push(fps);
    if (list.length > maxSamples) list.shift();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset and clear at DPR resolution
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Parameters
    const baselineFps = 60;
    const minFps = 0;
    const maxFps = 75; // clamp to reduce jitter

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const normalize = (v: number) => (clamp(v, minFps, maxFps) - minFps) / (maxFps - minFps);

    ctx.lineWidth = 1 * dpr;

    // Baseline at 60 fps
    ctx.strokeStyle = 'rgba(170,170,170,0.15)';
    const baseY = Math.floor((1 - normalize(baselineFps)) * canvas.height) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(canvas.width, baseY);
    ctx.stroke();

    // Sparkline path
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    const n = list.length;
    for (let i = 0; i < n; i++) {
      const x = Math.floor((i / Math.max(1, maxSamples - 1)) * canvas.width) + 0.5;
      const y = Math.floor((1 - normalize(list[i])) * canvas.height) + 0.5;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [fps, dpr]);

  return (
    <div className="debug-item" aria-label="Frames per second">
      <Gauge className="debug-icon" />
      <span className="debug-value" data-metric="fps">{fps.toFixed(0)}</span>
      <canvas
        ref={canvasRef}
        className="debug-sparkline"
        width={canvasWidth}
        height={canvasHeight}
        style={{ width: `${width}px`, height: `${height}px` }}
        aria-hidden
      />
    </div>
  );
}

export default FpsCounter;


