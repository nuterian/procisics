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
  stepWorldWithForces,
} from '@/lib/physics';

// Configuration constants for physics simulation and UI behavior
const CONFIG = {
  PPM: 50, // pixels per meter - conversion factor for physics world
  TIME_STEP: 1 / 60, // fixed timestep for stable physics simulation
  INITIAL_ENTITIES: 60, // number of entities spawned at startup
  MAX_ENTITIES: 260, // maximum entities before cleanup
  ENTITY_MARGIN: 200, // pixels outside viewport before cleanup
  CLICK_THRESHOLD_MS: 150, // max time for click vs drag detection
  BURST_COUNT: 10, // entities spawned in burst mode
  BURST_JITTER: 40, // random offset for burst spawn positions
  GHOST_ALPHA: 0.35, // transparency for cursor preview
  WIND_AMPLITUDE: 200, // wind force strength (px/s^2)
  WIND_FREQUENCY: 0.7, // wind oscillation frequency
  ATTRACTOR_FORCE: 2500, // magnetic attractor strength
  SHAKE_FORCE: 160, // world shake intensity
  SLOW_MO_FACTOR: 0.33, // time multiplier for slow motion
} as const;

// Entity size configuration for random generation
const ENTITY_SIZES = {
  MIN_RADIUS: 15, // minimum radius for circles (px)
  MAX_RADIUS: 35, // maximum radius for circles (px)
  SIZE_MULTIPLIER: 1.4, // multiplier for box/triangle size relative to circle radius
} as const;

// Velocity ranges for different interaction modes
const VELOCITY_RANGES = {
  CLICK_VX_RANGE: 120, // horizontal velocity range for click-to-drop (px/s)
  CLICK_VY_BASE: 200, // base downward velocity for click-to-drop (px/s)
  CLICK_VY_RANGE: 160, // additional random downward velocity (px/s)
  DRAG_MULTIPLIER: 0.6, // velocity multiplier for drag-to-throw
  BURST_VELOCITY: 240, // velocity range for burst spawn (px/s)
} as const;

// Helper functions for entity management
const createRandomShapeKind = (): ShapeKind => {
  const r = Math.random();
  return r < 1 / 3 ? 'circle' : r < 2 / 3 ? 'box' : 'triangle';
};

const createEntityAtPosition = (
  world: ReturnType<typeof createWorld>,
  x: number,
  y: number,
  kind: 'circle' | 'box' | 'triangle',
  velocity: { vxPx: number; vyPx: number }
) => {
  const radiusPx = Math.random() * (ENTITY_SIZES.MAX_RADIUS - ENTITY_SIZES.MIN_RADIUS) + ENTITY_SIZES.MIN_RADIUS;
  const sizePx = radiusPx * ENTITY_SIZES.SIZE_MULTIPLIER;

  switch (kind) {
    case 'circle':
      return createCircleEntity(world, CONFIG.PPM, x, y, radiusPx, velocity);
    case 'box':
      return createBoxEntity(world, CONFIG.PPM, x, y, sizePx, velocity);
    case 'triangle':
      return createTriangleEntity(world, CONFIG.PPM, x, y, sizePx, velocity);
  }
};

const cleanupEntities = (
  world: ReturnType<typeof createWorld>,
  entities: ReturnType<typeof createRandomEntityHelper>[],
  width: number,
  height: number
): ReturnType<typeof createRandomEntityHelper>[] => {
  const remaining: typeof entities = [];
  
  for (const entity of entities) {
    const pos = entity.body.getPosition();
    const x = pos.x * CONFIG.PPM;
    const y = pos.y * CONFIG.PPM;
    
    // Remove entities that are far outside the viewport
    if (x < -CONFIG.ENTITY_MARGIN || x > width + CONFIG.ENTITY_MARGIN || y > height + CONFIG.ENTITY_MARGIN) {
      world.destroyBody(entity.body);
      continue;
    }
    remaining.push(entity);
  }
  
  // Cap total entity count
  if (remaining.length > CONFIG.MAX_ENTITIES) {
    const toRemove = remaining.length - CONFIG.MAX_ENTITIES;
    for (let i = 0; i < toRemove; i++) {
      world.destroyBody(remaining[i].body);
    }
    return remaining.slice(toRemove);
  }
  
  return remaining;
};

const clearAllEntities = (
  world: ReturnType<typeof createWorld>,
  entities: ReturnType<typeof createRandomEntityHelper>[]
) => {
  for (const entity of entities) {
    world.destroyBody(entity.body);
  }
  return [];
};

// Rendering helper functions
const drawGhostPreview = (
  g: CanvasRenderingContext2D,
  pointer: { x: number; y: number },
  kind: 'circle' | 'box' | 'triangle'
) => {
  g.save();
  g.globalAlpha = CONFIG.GHOST_ALPHA;
  
  const color = kind === 'circle' ? SHAPE_COLORS.circle : 
                kind === 'box' ? SHAPE_COLORS.box : 
                kind === 'triangle' ? SHAPE_COLORS.triangle : '#888888';
  
  g.fillStyle = color;
  g.strokeStyle = color;
  
  if (kind === 'circle') {
    const r = 22;
    g.beginPath();
    g.arc(pointer.x, pointer.y, r, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'box') {
    const s = 30;
    g.fillRect(pointer.x - s / 2, pointer.y - s / 2, s, s);
  } else if (kind === 'triangle') {
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
};

const drawEntities = (
  g: CanvasRenderingContext2D,
  entities: ReturnType<typeof createRandomEntityHelper>[]
) => {
  g.lineWidth = 2;
  for (const entity of entities) {
    drawEntity(g, entity, CONFIG.PPM);
  }
};

// Event handler functions
const handlePointerDown = (
  world: ReturnType<typeof createWorld> | null,
  lastPointerRef: React.MutableRefObject<{ x: number; y: number } | null>,
  dragRef: React.MutableRefObject<{ start: { x: number; y: number; t: number } | null }>,
  p: { x: number; y: number }
) => {
  if (!world) return;
  lastPointerRef.current = { x: p.x, y: p.y };
  dragRef.current.start = { x: p.x, y: p.y, t: performance.now() };
};

const handlePointerMove = (
  lastPointerRef: React.MutableRefObject<{ x: number; y: number } | null>,
  p: { x: number; y: number }
) => {
  lastPointerRef.current = { x: p.x, y: p.y };
};

const handlePointerUp = (
  world: ReturnType<typeof createWorld> | null,
  entitiesRef: React.MutableRefObject<ReturnType<typeof createRandomEntityHelper>[]>,
  dragRef: React.MutableRefObject<{ start: { x: number; y: number; t: number } | null }>,
  spawnKind: 'circle' | 'box' | 'triangle' | 'random',
  nextRandomKind: ShapeKind,
  setNextRandomKind: (kind: ShapeKind) => void,
  p: { x: number; y: number }
) => {
  const start = dragRef.current.start;
  dragRef.current.start = null;
  if (!start || !world) return;

  const dtMs = Math.max(16, performance.now() - start.t);
  const vxPx = (p.x - start.x) / (dtMs / 1000);
  const vyPx = (p.y - start.y) / (dtMs / 1000);

  const kindToSpawn: 'circle' | 'box' | 'triangle' = (spawnKind === 'random' ? nextRandomKind : spawnKind) as 'circle' | 'box' | 'triangle';

  if (dtMs <= CONFIG.CLICK_THRESHOLD_MS) {
    // Click-to-drop: random velocity
    const vel = { 
      vxPx: (Math.random() - 0.5) * VELOCITY_RANGES.CLICK_VX_RANGE, 
      vyPx: VELOCITY_RANGES.CLICK_VY_BASE + Math.random() * VELOCITY_RANGES.CLICK_VY_RANGE 
    };
    entitiesRef.current.push(createEntityAtPosition(world, p.x, p.y, kindToSpawn, vel));
  } else {
    // Drag-to-throw: use drag velocity
    const vel = { 
      vxPx: vxPx * VELOCITY_RANGES.DRAG_MULTIPLIER, 
      vyPx: vyPx * VELOCITY_RANGES.DRAG_MULTIPLIER 
    };
    entitiesRef.current.push(createEntityAtPosition(world, p.x, p.y, kindToSpawn, vel));
  }

  if (spawnKind === 'random') {
    setNextRandomKind(createRandomShapeKind());
  }
};

const handleKeyDown = (
  e: KeyboardEvent,
  world: ReturnType<typeof createWorld> | null,
  entitiesRef: React.MutableRefObject<ReturnType<typeof createRandomEntityHelper>[]>,
  lastPointerRef: React.MutableRefObject<{ x: number; y: number } | null>,
  setTiltDeg: (fn: (d: number) => number) => void,
  setSpawnKind: (kind: 'circle' | 'box' | 'triangle' | 'random') => void,
  setNextRandomKind: (kind: ShapeKind) => void,
  setWindOn: (fn: (s: boolean) => boolean) => void,
  setAttractorOn: (fn: (s: boolean) => boolean) => void,
  setSlowMo: (fn: (s: boolean) => boolean) => void,
  spawnKind: 'circle' | 'box' | 'triangle' | 'random'
) => {
  const k = e.key.toLowerCase();
  
  // Tilt controls
  if (k === 'arrowleft') setTiltDeg((d) => Math.max(-45, d - 5));
  if (k === 'arrowright') setTiltDeg((d) => Math.min(45, d + 5));
  if (k === 'arrowup') setTiltDeg(() => 0);
  
  // Shape selection
  if (k === '1') setSpawnKind('circle');
  if (k === '2') setSpawnKind('box');
  if (k === '3') setSpawnKind('triangle');
  if (k === '0') {
    setSpawnKind('random');
    setNextRandomKind(createRandomShapeKind());
  }
  
  // Physics toggles
  if (k === 'w') setWindOn((s) => !s);
  if (k === 'a') setAttractorOn((s) => !s);
  if (k === 's') setSlowMo((s) => !s);
  
  // Actions
  if (k === 'x') {
    // Clear all entities
    if (!world) return;
    entitiesRef.current = clearAllEntities(world, entitiesRef.current);
  }
  
  if (k === 'b') {
    // Burst spawn at pointer or center
    if (!world) return;
    const origin = lastPointerRef.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    for (let i = 0; i < CONFIG.BURST_COUNT; i++) {
      const jitterX = origin.x + (Math.random() * 2 - 1) * CONFIG.BURST_JITTER;
      const jitterY = origin.y + (Math.random() * 2 - 1) * CONFIG.BURST_JITTER;
      const vel = { 
        vxPx: (Math.random() - 0.5) * VELOCITY_RANGES.BURST_VELOCITY, 
        vyPx: (Math.random() - 0.5) * VELOCITY_RANGES.BURST_VELOCITY 
      };
      
      const r = Math.random();
      let kindToSpawn: 'circle' | 'box' | 'triangle';
      if (spawnKind === 'circle' || (spawnKind === 'random' && r < 1 / 3)) {
        kindToSpawn = 'circle';
      } else if (spawnKind === 'box' || (spawnKind === 'random' && r < 2 / 3)) {
        kindToSpawn = 'box';
      } else {
        kindToSpawn = 'triangle';
      }
      
      entitiesRef.current.push(createEntityAtPosition(world, jitterX, jitterY, kindToSpawn, vel));
    }
  }
  
  if (k === 'q') {
    // Quick shake
    if (!world) return;
    applyWorldShake(world, CONFIG.PPM, CONFIG.SHAKE_FORCE);
  }
};

/**
 * BouncingShapesDemo - Interactive physics simulation with bouncing shapes
 * 
 * Features:
 * - Click/drag to spawn shapes with physics
 * - Keyboard controls for tilt, wind, attractor, slow-mo
 * - Shape type selection (circle, box, triangle, random)
 * - Burst spawn and world shake effects
 * - Automatic entity cleanup and performance management
 */
export const BouncingShapesDemo = () => {
  // Physics simulation refs
  const worldRef = useRef<ReturnType<typeof createWorld> | null>(null);
  const entitiesRef = useRef<ReturnType<typeof createRandomEntityHelper>[]>([]);
  const accumulatorRef = useRef<number>(0);
  
  // Interaction refs for pointer tracking
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ start: { x: number; y: number; t: number } | null }>({ start: null });

  // Physics controls state
  const [tiltDeg, setTiltDeg] = useState(0);
  const [windOn, setWindOn] = useState(false);
  const [attractorOn, setAttractorOn] = useState(false);
  const [slowMo, setSlowMo] = useState(false);
  
  // Spawn controls state
  const [spawnKind, setSpawnKind] = useState<'circle' | 'box' | 'triangle' | 'random'>('random');
  const [nextRandomKind, setNextRandomKind] = useState<ShapeKind>(createRandomShapeKind());


  const onInit = (ctx: FrameContext) => {
    const { ctx: g, width, height } = ctx;

    // Create physics world
    const world = createWorld({ pixelsPerMeter: CONFIG.PPM, gravityY: 10 });
    worldRef.current = world;
    entitiesRef.current = [];
    accumulatorRef.current = 0;

    // Create world bounds (static edge fixtures)
    createBounds(world, width, height, CONFIG.PPM);

    // Spawn initial entities
    for (let i = 0; i < CONFIG.INITIAL_ENTITIES; i++) {
      entitiesRef.current.push(createRandomEntityHelper(world, CONFIG.PPM, width, height));
    }

    // Clear screen
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);
  };

  const simTimeRef = useRef(0);

  const onFrame = (ctx: FrameContext) => {
    const { ctx: g, width, height, dt, time } = ctx;
    const world = worldRef.current;
    if (!world) return;

    // Update gravity based on tilt
    setGravityFromAngle(world, tiltDeg, 10);

    // Physics stepping with per-substep forces for consistent behavior
    const simDt = slowMo ? dt * CONFIG.SLOW_MO_FACTOR : dt;
    stepWorldWithForces(
      world,
      accumulatorRef,
      simDt,
      CONFIG.TIME_STEP,
      simTimeRef,
      (simTime) => {
        if (windOn) {
          const axPx = Math.sin(simTime * CONFIG.WIND_FREQUENCY) * CONFIG.WIND_AMPLITUDE;
          applyUniformAcceleration(world, CONFIG.PPM, axPx, 0);
        }
        if (attractorOn) {
          const origin = lastPointerRef.current ?? { x: width / 2, y: height / 2 };
          applyRadialForce(world, CONFIG.PPM, origin, CONFIG.ATTRACTOR_FORCE, 'attract');
        }
      }
    );

    // Clear screen
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);

    // Update and draw entities
    entitiesRef.current = cleanupEntities(world, entitiesRef.current, width, height);
    drawEntities(g, entitiesRef.current);

    // Draw ghost preview under cursor
    const pointer = lastPointerRef.current;
    if (pointer) {
      const ghostKind = spawnKind === 'random' ? nextRandomKind : spawnKind;
      drawGhostPreview(g, pointer, ghostKind as 'circle' | 'box' | 'triangle');
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
      onPointerDown={(_, p) => handlePointerDown(worldRef.current, lastPointerRef, dragRef, p)}
      onPointerMove={(_, p) => handlePointerMove(lastPointerRef, p)}
      onPointerUp={(_, p) => handlePointerUp(
        worldRef.current, 
        entitiesRef, 
        dragRef, 
        spawnKind, 
        nextRandomKind, 
        setNextRandomKind, 
        p
      )}
      onKeyDown={(e) => handleKeyDown(
        e,
        worldRef.current,
        entitiesRef,
        lastPointerRef,
        setTiltDeg,
        setSpawnKind,
        setNextRandomKind,
        setWindOn,
        setAttractorOn,
        setSlowMo,
        spawnKind
      )}
    />
  );
};

export default BouncingShapesDemo;