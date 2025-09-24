import { useMemo, useRef } from 'react';
import DemoPage, { type FrameContext } from './DemoPage';
import planck from 'planck-js';

type ShapeType = 'circle' | 'square';

interface Entity {
  body: planck.Body;
  type: ShapeType;
  radiusPx?: number;
  sizePx?: number;
}

export const BouncingShapesDemo = () => {
  const worldRef = useRef<planck.World | null>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const accumulatorRef = useRef<number>(0);

  const PPM = 50; // pixels per meter
  const timeStep = 1 / 60;

  const createRandomEntity = useMemo(() => {
    return (width: number, height: number, world: planck.World): Entity => {
      const type: ShapeType = Math.random() > 0.5 ? 'circle' : 'square';
      const radiusPx = Math.random() * 20 + 10;
      const sizePx = radiusPx * 1.4;
      const xPx = Math.random() * Math.max(0, width - 2 * radiusPx) + radiusPx;
      const yPx = Math.random() * Math.max(0, height - 2 * radiusPx) + radiusPx;
      const vxPx = (Math.random() - 0.5) * 400;
      const vyPx = (Math.random() - 0.5) * 400;

      const body = world.createBody({
        type: 'dynamic',
        position: planck.Vec2(xPx / PPM, yPx / PPM),
        linearVelocity: planck.Vec2(vxPx / PPM, vyPx / PPM),
      });

      if (type === 'circle') {
        body.createFixture(planck.Circle(radiusPx / PPM), {
          density: 1,
          friction: 0.2,
          restitution: 0.7,
        });
        return { body, type, radiusPx };
      } else {
        const half = sizePx / 2 / PPM;
        body.createFixture(planck.Box(half, half), {
          density: 1,
          friction: 0.3,
          restitution: 0.6,
        });
        return { body, type, sizePx };
      }
    };
  }, []);

  const onInit = (ctx: FrameContext) => {
    const { ctx: g, width, height } = ctx;

    // Create world
    const world = planck.World(planck.Vec2(0, 10));
    worldRef.current = world;
    entitiesRef.current = [];
    accumulatorRef.current = 0;

    // World bounds (static edge fixtures)
    const w = width / PPM;
    const h = height / PPM;
    const bounds = world.createBody();
    bounds.createFixture(planck.Edge(planck.Vec2(0, 0), planck.Vec2(w, 0)));       // top
    bounds.createFixture(planck.Edge(planck.Vec2(0, h), planck.Vec2(w, h)));       // bottom
    bounds.createFixture(planck.Edge(planck.Vec2(0, 0), planck.Vec2(0, h)));       // left
    bounds.createFixture(planck.Edge(planck.Vec2(w, 0), planck.Vec2(w, h)));       // right

    // Initial entities
    for (let i = 0; i < 8; i++) {
      entitiesRef.current.push(createRandomEntity(width, height, world));
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
    while (accumulatorRef.current >= timeStep) {
      world.step(timeStep);
      accumulatorRef.current -= timeStep;
    }

    // Clear
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);

    // Draw entities
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    for (const ent of entitiesRef.current) {
      const p = ent.body.getPosition();
      const angle = ent.body.getAngle();
      const x = p.x * PPM;
      const y = p.y * PPM;
      if (ent.type === 'circle' && ent.radiusPx) {
        g.beginPath();
        g.arc(x, y, ent.radiusPx, 0, Math.PI * 2);
        g.fill();
      } else if (ent.type === 'square' && ent.sizePx) {
        const size = ent.sizePx;
        g.save();
        g.translate(x, y);
        g.rotate(angle);
        g.fillRect(-size / 2, -size / 2, size, size);
        g.restore();
      }
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
        const type: ShapeType = Math.random() > 0.5 ? 'circle' : 'square';
        const radiusPx = Math.random() * 20 + 10;
        const sizePx = radiusPx * 1.4;
        const body = world.createBody({
          type: 'dynamic',
          position: planck.Vec2(p.x / PPM, p.y / PPM),
          linearVelocity: planck.Vec2((Math.random() - 0.5) * 4, 6 + Math.random() * 4),
        });
        if (type === 'circle') {
          body.createFixture(planck.Circle(radiusPx / PPM), {
            density: 1,
            friction: 0.2,
            restitution: 0.7,
          });
          entitiesRef.current.push({ body, type, radiusPx });
        } else {
          const half = sizePx / 2 / PPM;
          body.createFixture(planck.Box(half, half), {
            density: 1,
            friction: 0.3,
            restitution: 0.6,
          });
          entitiesRef.current.push({ body, type, sizePx });
        }
      }}
    />
  );
};

export default BouncingShapesDemo;