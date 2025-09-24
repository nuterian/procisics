import { useRef } from 'react';
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
} from '@/lib/physics';

export const BouncingShapesDemo = () => {
  const worldRef = useRef<ReturnType<typeof createWorld> | null>(null);
  const entitiesRef = useRef<ReturnType<typeof createRandomEntityHelper>[]>([]);
  const accumulatorRef = useRef<number>(0);

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
    for (let i = 0; i < 100; i++) {
      entitiesRef.current.push(createRandomEntityHelper(world, PPM, width, height));
    }

    // Clear screen
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);
  };

  const onFrame = (ctx: FrameContext) => {
    const { ctx: g, width, height, dt } = ctx;
    const world = worldRef.current;
    if (!world) return;

    // Fixed-step simulation
    accumulatorRef.current += dt;
    stepWithFixedTimestep(world, accumulatorRef, dt, timeStep);

    // Clear
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);

    // Draw entities
    g.lineWidth = 2;
    for (const ent of entitiesRef.current) {
      drawEntity(g, ent, PPM);
    }
  };

  return (
    <DemoPage
      title="Bouncing Shapes"
      onInit={onInit}
      onFrame={onFrame}
      onPointerDown={(_, p) => {
        if (!worldRef.current) return;
        const world = worldRef.current;
        const radiusPx = Math.random() * 20 + 15;
        const sizePx = radiusPx * 1.4;
        const vel = { vxPx: (Math.random() - 0.5) * 200, vyPx: 300 + Math.random() * 200 };
        const r = Math.random();
        if (r < 1 / 3) {
          entitiesRef.current.push(createCircleEntity(world, PPM, p.x, p.y, radiusPx, vel));
        } else if (r < 2 / 3) {
          entitiesRef.current.push(createBoxEntity(world, PPM, p.x, p.y, sizePx, vel));
        } else {
          entitiesRef.current.push(createTriangleEntity(world, PPM, p.x, p.y, sizePx, vel));
        }
      }}
    />
  );
};

export default BouncingShapesDemo;