import { useMemo, useRef } from 'react';
import DemoPage, { type FrameContext } from './DemoPage';

interface Shape {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'circle' | 'square';
}

export const BouncingShapesDemo = () => {
  const shapesRef = useRef<Shape[]>([]);

  const createRandomShape = useMemo(() => {
    return (): Shape => ({
      x: Math.random() * 800 + 100,
      y: Math.random() * 400 + 100,
      vx: (Math.random() - 0.5) * 400,
      vy: (Math.random() - 0.5) * 400,
      radius: Math.random() * 20 + 10,
      type: Math.random() > 0.5 ? 'circle' : 'square'
    });
  }, []);

  const onInit = (ctx: FrameContext) => {
    shapesRef.current = Array.from({ length: 8 }, createRandomShape);
    const { ctx: g, width, height } = ctx;
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);
  };

  const onFrame = (ctx: FrameContext) => {
    const { ctx: g, width, height, dt } = ctx;
    // Clear
    g.fillStyle = '#000000';
    g.fillRect(0, 0, width, height);

    // Update and draw
    shapesRef.current.forEach((shape) => {
      shape.x += shape.vx * dt;
      shape.y += shape.vy * dt;

      if (shape.x - shape.radius < 0 || shape.x + shape.radius > width) {
        shape.vx *= -0.9;
        shape.x = Math.max(shape.radius, Math.min(width - shape.radius, shape.x));
      }
      if (shape.y - shape.radius < 0 || shape.y + shape.radius > height) {
        shape.vy *= -0.9;
        shape.y = Math.max(shape.radius, Math.min(height - shape.radius, shape.y));
      }

      g.fillStyle = '#ffffff';
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      if (shape.type === 'circle') {
        g.beginPath();
        g.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
        g.fill();
      } else {
        const size = shape.radius * 1.4;
        g.fillRect(shape.x - size / 2, shape.y - size / 2, size, size);
      }
    });

    // collisions
    for (let i = 0; i < shapesRef.current.length; i++) {
      for (let j = i + 1; j < shapesRef.current.length; j++) {
        const a = shapesRef.current[i];
        const b = shapesRef.current[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < a.radius + b.radius) {
          const nx = dx / distance;
          const ny = dy / distance;
          const relativeVelocity = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (relativeVelocity > 0) continue;
          const impulse = 2 * relativeVelocity / 2;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
          const overlap = (a.radius + b.radius - distance) / 2;
          a.x -= overlap * nx;
          a.y -= overlap * ny;
          b.x += overlap * nx;
          b.y += overlap * ny;
        }
      }
    }
  };

  return (
    <DemoPage
      title="Bouncing Shapes"
      onInit={onInit}
      onFrame={onFrame}
      onPointerDown={(_, p) => {
        const newShape: Shape = {
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 200,
          vy: 300 + Math.random() * 200,
          radius: Math.random() * 20 + 10,
          type: Math.random() > 0.5 ? 'circle' : 'square'
        };
        shapesRef.current.push(newShape);
      }}
    />
  );
};

export default BouncingShapesDemo;