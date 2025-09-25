import { useRef, useState } from 'react';
import { Wind, Magnet, Turtle } from 'lucide-react';
import DemoPage, { type FrameContext } from './DemoPage';
import {
  createWorld,
  createBounds,
  createCircleEntity,
  createBoxEntity,
  createTriangleEntity,
  stepWithFixedTimestep,
  drawEntity,
  createRandomEntity as createRandomEntityHelper,
  setGravityFromAngle,
  applyRadialForce,
  applyWorldShake,
  applyUniformAcceleration,
  SHAPE_COLORS,
  type ShapeKind,
} from '@/lib/physics';

export const BouncingShapesDemo = () => {
  const worldRef = useRef<ReturnType<typeof createWorld> | null>(null);
  const entitiesRef = useRef<ReturnType<typeof createRandomEntityHelper>[]>([]);
  const accumulatorRef = useRef<number>(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ start: { x: number; y: number; t: number } | null }>(
    { start: null }
  );

  const [tiltDeg, setTiltDeg] = useState(0);
  const [spawnKind, setSpawnKind] = useState<'circle' | 'box' | 'triangle' | 'random'>('random');
  const [windOn, setWindOn] = useState(false);
  const [attractorOn, setAttractorOn] = useState(false);
  const [slowMo, setSlowMo] = useState(false);
  const rollRandomKind = (): ShapeKind => {
    const r = Math.random();
    return r < 1 / 3 ? 'circle' : r < 2 / 3 ? 'box' : 'triangle';
  };
  const [nextRandomKind, setNextRandomKind] = useState<ShapeKind>(rollRandomKind());

  const PPM = 50; // pixels per meter
  const timeStep = 1 / 60;


  const onInit = (ctx: FrameContext) => {
    const { ctx: g, width, height } = ctx;

    // Create world
    const world = createWorld({ pixelsPerMeter: PPM, gravityY: 10 });
    worldRef.current = world;
    entitiesRef.current = [];
    accumulatorRef.current = 0;

    // World bounds (static edge fixtures)
    createBounds(world, width, height, PPM);

    // Initial entities
    for (let i = 0; i < 60; i++) {
      entitiesRef.current.push(createRandomEntityHelper(world, PPM, width, height));
    }

    // Clear screen
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);
  };

  const onFrame = (ctx: FrameContext) => {
    const { ctx: g, width, height, dt, time } = ctx;
    const world = worldRef.current;
    if (!world) return;

    // Update gravity based on tilt
    setGravityFromAngle(world, tiltDeg, 10);

    // Pre-step forces
    if (windOn) {
      // noticeable oscillating wind
      const axPx = Math.sin(time * 0.7) * 200; // px/s^2
      applyUniformAcceleration(world, PPM, axPx, 0);
    }

    if (attractorOn) {
      const origin = lastPointerRef.current ?? { x: width / 2, y: height / 2 };
      applyRadialForce(world, PPM, origin, 2500, 'attract');
    }

    // Fixed-step simulation
    const simDt = slowMo ? dt * 0.33 : dt;
    accumulatorRef.current += simDt;
    stepWithFixedTimestep(world, accumulatorRef, simDt, timeStep);

    // Clear
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);

    // Draw entities
    g.lineWidth = 2;
    const remaining: typeof entitiesRef.current = [];
    for (const ent of entitiesRef.current) {
      const pos = ent.body.getPosition();
      const x = pos.x * PPM;
      const y = pos.y * PPM;
      const margin = 200; // allow some leeway
      if (x < -margin || x > width + margin || y > height + margin) {
        world.destroyBody(ent.body);
        continue;
      }
      remaining.push(ent);
      drawEntity(g, ent, PPM);
    }
    // Cap total count softly
    if (remaining.length > 260) {
      const toRemove = remaining.length - 260;
      for (let i = 0; i < toRemove; i++) {
        const ent = remaining[i];
        world.destroyBody(ent.body);
      }
      entitiesRef.current = remaining.slice(toRemove);
    } else {
      entitiesRef.current = remaining;
    }

    // Ghost preview under cursor
    const pointer = lastPointerRef.current;
    if (pointer) {
      g.save();
      g.globalAlpha = 0.35;
      const ghostKind = spawnKind === 'random' ? nextRandomKind : spawnKind;
      const color = ghostKind === 'circle' ? SHAPE_COLORS.circle : ghostKind === 'box' ? SHAPE_COLORS.box : ghostKind === 'triangle' ? SHAPE_COLORS.triangle : '#888888';
      g.fillStyle = color;
      g.strokeStyle = color;
      if (ghostKind === 'circle') {
        const r = 22;
        g.beginPath();
        g.arc(pointer.x, pointer.y, r, 0, Math.PI * 2);
        g.fill();
      } else if (ghostKind === 'box') {
        const s = 30;
        g.fillRect(pointer.x - s / 2, pointer.y - s / 2, s, s);
      } else if (ghostKind === 'triangle') {
        const s = 30;
        const h = Math.sqrt(3) / 2 * s;
        g.beginPath();
        g.moveTo(pointer.x, pointer.y + (2 / 3) * h);
        g.lineTo(pointer.x - s / 2, pointer.y - (1 / 3) * h);
        g.lineTo(pointer.x + s / 2, pointer.y - (1 / 3) * h);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
  };

  return (
    <DemoPage
      title="Bouncing Shapes"
      onInit={onInit}
      onFrame={onFrame}
      rightControls={(
        <div className="demo-controls">
          {/* Minimal inline UI kept compact; keyboard remains primary */}
          <div className="control-group">
            <input
              aria-label="Tilt"
              type="range"
              min={-45}
              max={45}
              step={1}
              value={tiltDeg}
              onChange={(e) => setTiltDeg(parseInt(e.target.value, 10))}
              style={{ width: 120 }}
            />
          </div>
          <div className="indicator" aria-live="polite">
            <span className={"indicator-dot" + (windOn ? " active" : "")}></span>
            <div className="help-keys" title="Wind (toggle with W)">
              <Wind className="indicator-icon" />
              <span className="sr-only">Wind</span>
            </div>
          </div>
          <div className="indicator" aria-live="polite">
            <span className={"indicator-dot" + (attractorOn ? " active" : "")}></span>
            <div className="help-keys" title="Attractor (toggle with A)">
              <Magnet className="indicator-icon" />
              <span className="sr-only">Attractor</span>
            </div>
          </div>
          <div className="indicator" aria-live="polite">
            <span className={"indicator-dot" + (slowMo ? " active" : "")}></span>
            <div className="help-keys" title="Slow-mo (toggle with S)">
              <Turtle className="indicator-icon" />
              <span className="sr-only">Slow-mo</span>
            </div>
          </div>
        </div>
      )}
      onPointerDown={(_, p) => {
        if (!worldRef.current) return;
        lastPointerRef.current = { x: p.x, y: p.y };
        dragRef.current.start = { x: p.x, y: p.y, t: performance.now() };
      }}
      onPointerMove={(_, p) => {
        lastPointerRef.current = { x: p.x, y: p.y };
      }}
      onPointerUp={(_, p) => {
        const start = dragRef.current.start;
        dragRef.current.start = null;
        if (!start) return;
        const dtMs = Math.max(16, performance.now() - start.t);
        const vxPx = (p.x - start.x) / (dtMs / 1000);
        const vyPx = (p.y - start.y) / (dtMs / 1000);
        if (!worldRef.current) return;
        const world = worldRef.current;
        const CLICK_THRESHOLD_MS = 150;
        const kindToSpawn: 'circle' | 'box' | 'triangle' = (spawnKind === 'random' ? nextRandomKind : spawnKind) as 'circle' | 'box' | 'triangle';
        const radiusPx = Math.random() * 20 + 15;
        const sizePx = radiusPx * 1.4;
        if (dtMs <= CLICK_THRESHOLD_MS) {
          // Click-to-drop
          const vel = { vxPx: (Math.random() - 0.5) * 120, vyPx: 200 + Math.random() * 160 };
          if (kindToSpawn === 'circle') {
            entitiesRef.current.push(createCircleEntity(world, PPM, p.x, p.y, radiusPx, vel));
          } else if (kindToSpawn === 'box') {
            entitiesRef.current.push(createBoxEntity(world, PPM, p.x, p.y, sizePx, vel));
          } else {
            entitiesRef.current.push(createTriangleEntity(world, PPM, p.x, p.y, sizePx, vel));
          }
        } else {
          // Drag-to-throw
          const vel = { vxPx: vxPx * 0.6, vyPx: vyPx * 0.6 };
          if (kindToSpawn === 'circle') {
            entitiesRef.current.push(createCircleEntity(world, PPM, p.x, p.y, radiusPx, vel));
          } else if (kindToSpawn === 'box') {
            entitiesRef.current.push(createBoxEntity(world, PPM, p.x, p.y, sizePx, vel));
          } else {
            entitiesRef.current.push(createTriangleEntity(world, PPM, p.x, p.y, sizePx, vel));
          }
        }
        if (spawnKind === 'random') {
          setNextRandomKind(rollRandomKind());
        }
      }}
      onKeyDown={(e) => {
        const k = e.key.toLowerCase();
        if (k === 'arrowleft') setTiltDeg((d) => Math.max(-45, d - 5));
        if (k === 'arrowright') setTiltDeg((d) => Math.min(45, d + 5));
        if (k === 'arrowup') setTiltDeg(0);
        if (k === '1') setSpawnKind('circle');
        if (k === '2') setSpawnKind('box');
        if (k === '3') setSpawnKind('triangle');
        if (k === '0') {
          setSpawnKind('random');
          setNextRandomKind(rollRandomKind());
        }
        if (k === 'w') setWindOn((s) => !s);
        if (k === 'a') setAttractorOn((s) => !s);
        if (k === 's') setSlowMo((s) => !s);
        if (k === 'x') {
          // clear all
          if (!worldRef.current) return;
          const world = worldRef.current;
          for (const ent of entitiesRef.current) {
            world.destroyBody(ent.body);
          }
          entitiesRef.current = [];
        }
        if (k === 'b') {
          // burst spawn at pointer or center
          if (!worldRef.current) return;
          const world = worldRef.current;
          const origin = lastPointerRef.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          for (let i = 0; i < 10; i++) {
            const jitterX = origin.x + (Math.random() * 2 - 1) * 40;
            const jitterY = origin.y + (Math.random() * 2 - 1) * 40;
            const radiusPx = Math.random() * 20 + 15;
            const sizePx = radiusPx * 1.4;
            const vel = { vxPx: (Math.random() - 0.5) * 240, vyPx: (Math.random() - 0.5) * 240 };
            const r = Math.random();
            if (spawnKind === 'circle' || (spawnKind === 'random' && r < 1 / 3)) {
              entitiesRef.current.push(createCircleEntity(world, PPM, jitterX, jitterY, radiusPx, vel));
            } else if (spawnKind === 'box' || (spawnKind === 'random' && r < 2 / 3)) {
              entitiesRef.current.push(createBoxEntity(world, PPM, jitterX, jitterY, sizePx, vel));
            } else {
              entitiesRef.current.push(createTriangleEntity(world, PPM, jitterX, jitterY, sizePx, vel));
            }
          }
        }
        if (k === 'q') {
          // quick shake
          if (!worldRef.current) return;
          applyWorldShake(worldRef.current, PPM, 160);
        }
      }}
    />
  );
};

export default BouncingShapesDemo;