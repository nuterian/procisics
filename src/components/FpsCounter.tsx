import { useEffect, useMemo, useRef } from 'react';
import { Gauge } from 'lucide-react';

interface FpsCounterProps {
  fps: number;
  windowMs?: number;  // time window for running average (default 1500ms)
  rangeFps?: number;  // range around average (default 20 FPS)
}

export function FpsCounter({ fps, windowMs = 1500, rangeFps = 20 }: FpsCounterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplesRef = useRef<Array<{ t: number; fps: number }>>([]);
  const maxSamples = 600; // safety cap on array length
  const width = 96; // CSS pixels
  const height = 24; // CSS pixels

  // Device pixel ratio setup for crisp lines on HiDPI
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const canvasWidth = useMemo(() => Math.floor(width * dpr), [dpr]);
  const canvasHeight = useMemo(() => Math.floor(height * dpr), [dpr]);

  useEffect(() => {
    const now = performance.now();
    const samples = samplesRef.current;
    
    // Add new sample
    samples.push({ t: now, fps });
    
    // Prune old samples by time window
    const cutoff = now - windowMs;
    samplesRef.current = samples.filter(s => s.t >= cutoff);
    
    // Safety cap on array length
    if (samplesRef.current.length > maxSamples) {
      samplesRef.current = samplesRef.current.slice(-maxSamples);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset and clear at DPR resolution
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compute running average and dynamic bounds
    const list = samplesRef.current;
    const avg = list.length ? list.reduce((a, s) => a + s.fps, 0) / list.length : fps;
    const minFps = Math.max(0, avg - rangeFps);
    const maxFps = Math.max(minFps + 1, avg + rangeFps); // avoid zero span

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const normalize = (v: number) => (clamp(v, minFps, maxFps) - minFps) / (maxFps - minFps);

    ctx.lineWidth = 1 * dpr;

    // Baseline at running average
    ctx.strokeStyle = 'rgba(170,170,170,0.20)';
    const baseY = Math.floor((1 - normalize(avg)) * canvas.height) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(canvas.width, baseY);
    ctx.stroke();

    // Sparkline path with green gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, 'rgba(16, 120, 60, 0.1)');   // old (left) darker green
    grad.addColorStop(0.5, 'rgba(34, 197, 94, 0.9)');   // new (right) bright green
    grad.addColorStop(1, 'rgba(34, 197, 94, 1.0)');   // new (right) bright green
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3.5 * dpr;
    ctx.beginPath();
    
    // Map x-coordinates by time across the window
    const start = Math.max(0, now - windowMs);
    for (let i = 0; i < list.length; i++) {
      const x = Math.floor(((list[i].t - start) / windowMs) * canvas.width) + 0.5;
      const y = Math.floor((1 - normalize(list[i].fps)) * canvas.height) + 0.5;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [fps, dpr, windowMs, rangeFps]);

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


