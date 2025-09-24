import planck from 'planck-js'

export type ShapeKind = 'circle' | 'box' | 'triangle'

export interface RenderInfo {
  kind: ShapeKind
  radiusPx?: number
  sizePx?: number
  fillStyle?: string
}

export interface PhysicsEntity {
  body: planck.Body
  render: RenderInfo
}

export interface PhysicsConfig {
  pixelsPerMeter: number
  gravityY?: number
  restitution?: number
  friction?: number
  density?: number
}

// Fixed, per-shape colors (beautiful, distinct triad)
export const SHAPE_COLORS: Record<ShapeKind, string> = {
  circle: '#60a5fa',   // blue: bouncy
  box: '#34d399',      // green: heavy/grounded
  triangle: '#f472b6', // pink: nimble/medium bounce
}

type MaterialProfile = {
  density: number
  friction: number
  restitution: number
}

// Fixed, per-shape base materials with slight variance applied per instance
const MATERIALS: Record<ShapeKind, MaterialProfile> = {
  // Bouncy character
  circle: {
    density: 0.8,     // low
    friction: 0.15,   // low
    restitution: 0.9, // high (very bouncy)
  },
  // Non-bouncy, heavy character
  box: {
    density: 1.5,     // high
    friction: 0.45,   // high
    restitution: 0.2, // low (not bouncy)
  },
  // Medium bouncy, nimble character
  triangle: {
    density: 1.1,     // medium
    friction: 0.3,    // medium
    restitution: 0.55 // medium
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function jitter(value: number, amount: number): number {
  return value + (Math.random() * 2 - 1) * amount
}

function materialFor(kind: ShapeKind): MaterialProfile {
  const base = MATERIALS[kind]
  // Slight variance so instances feel alive but remain in role
  const density = Math.max(0.1, jitter(base.density, 0.1))
  const friction = clamp01(jitter(base.friction, 0.03))
  const restitution = clamp01(jitter(base.restitution, 0.05))
  return { density, friction, restitution }
}

export function createWorld(config: PhysicsConfig): planck.World {
  const gravity = planck.Vec2(0, config.gravityY ?? 10)
  return planck.World(gravity)
}

export function pixelsToMeters(pixels: number, pixelsPerMeter: number): number {
  return pixels / pixelsPerMeter
}

export function metersToPixels(meters: number, pixelsPerMeter: number): number {
  return meters * pixelsPerMeter
}

export function createBounds(
  world: planck.World,
  widthPx: number,
  heightPx: number,
  pixelsPerMeter: number
): void {
  const w = pixelsToMeters(widthPx, pixelsPerMeter)
  const h = pixelsToMeters(heightPx, pixelsPerMeter)
  const boundsBody = world.createBody()
  boundsBody.createFixture(planck.Edge(planck.Vec2(0, 0), planck.Vec2(w, 0)))
  boundsBody.createFixture(planck.Edge(planck.Vec2(0, h), planck.Vec2(w, h)))
  boundsBody.createFixture(planck.Edge(planck.Vec2(0, 0), planck.Vec2(0, h)))
  boundsBody.createFixture(planck.Edge(planck.Vec2(w, 0), planck.Vec2(w, h)))
}

export interface BodyOptions {
  density?: number
  friction?: number
  restitution?: number
  vxPx?: number
  vyPx?: number
  fillStyle?: string
}

export function createCircleEntity(
  world: planck.World,
  pixelsPerMeter: number,
  xPx: number,
  yPx: number,
  radiusPx: number,
  options: BodyOptions = {}
): PhysicsEntity {
  const d = materialFor('circle')
  const body = world.createBody({
    type: 'dynamic',
    position: planck.Vec2(pixelsToMeters(xPx, pixelsPerMeter), pixelsToMeters(yPx, pixelsPerMeter)),
    linearVelocity: planck.Vec2(
      pixelsToMeters(options.vxPx ?? 0, pixelsPerMeter),
      pixelsToMeters(options.vyPx ?? 0, pixelsPerMeter)
    ),
  })
  body.createFixture(planck.Circle(pixelsToMeters(radiusPx, pixelsPerMeter)), {
    density: options.density ?? d.density,
    friction: options.friction ?? d.friction,
    restitution: options.restitution ?? d.restitution,
  })
  return {
    body,
    render: { kind: 'circle', radiusPx, fillStyle: options.fillStyle ?? SHAPE_COLORS.circle },
  }
}

export function createBoxEntity(
  world: planck.World,
  pixelsPerMeter: number,
  xPx: number,
  yPx: number,
  sizePx: number,
  options: BodyOptions = {}
): PhysicsEntity {
  const d = materialFor('box')
  const body = world.createBody({
    type: 'dynamic',
    position: planck.Vec2(pixelsToMeters(xPx, pixelsPerMeter), pixelsToMeters(yPx, pixelsPerMeter)),
    linearVelocity: planck.Vec2(
      pixelsToMeters(options.vxPx ?? 0, pixelsPerMeter),
      pixelsToMeters(options.vyPx ?? 0, pixelsPerMeter)
    ),
  })
  const half = pixelsToMeters(sizePx / 2, pixelsPerMeter)
  body.createFixture(planck.Box(half, half), {
    density: options.density ?? d.density,
    friction: options.friction ?? d.friction,
    restitution: options.restitution ?? d.restitution,
  })
  return {
    body,
    render: { kind: 'box', sizePx, fillStyle: options.fillStyle ?? SHAPE_COLORS.box },
  }
}

export function createTriangleEntity(
  world: planck.World,
  pixelsPerMeter: number,
  xPx: number,
  yPx: number,
  sizePx: number,
  options: BodyOptions = {}
): PhysicsEntity {
  const d = materialFor('triangle')
  const body = world.createBody({
    type: 'dynamic',
    position: planck.Vec2(pixelsToMeters(xPx, pixelsPerMeter), pixelsToMeters(yPx, pixelsPerMeter)),
    linearVelocity: planck.Vec2(
      pixelsToMeters(options.vxPx ?? 0, pixelsPerMeter),
      pixelsToMeters(options.vyPx ?? 0, pixelsPerMeter)
    ),
  })
  const s = pixelsToMeters(sizePx, pixelsPerMeter)
  const h = Math.sqrt(3) / 2 * s
  // Center at origin using centroid at (0,0)
  const v0 = planck.Vec2(0, (2 / 3) * h)
  const v1 = planck.Vec2(-s / 2, -(1 / 3) * h)
  const v2 = planck.Vec2(s / 2, -(1 / 3) * h)
  body.createFixture(planck.Polygon([v0, v1, v2]), {
    density: options.density ?? d.density,
    friction: options.friction ?? d.friction,
    restitution: options.restitution ?? d.restitution,
  })
  return {
    body,
    render: { kind: 'triangle', sizePx, fillStyle: options.fillStyle ?? SHAPE_COLORS.triangle },
  }
}

export function stepWithFixedTimestep(
  world: planck.World,
  accumulatorRef: { current: number },
  dtSeconds: number,
  timeStepSeconds = 1 / 60
) {
  accumulatorRef.current += dtSeconds
  while (accumulatorRef.current >= timeStepSeconds) {
    world.step(timeStepSeconds)
    accumulatorRef.current -= timeStepSeconds
  }
}

export function drawEntity(
  g: CanvasRenderingContext2D,
  entity: PhysicsEntity,
  pixelsPerMeter: number
): void {
  const pos = entity.body.getPosition()
  const angle = entity.body.getAngle()
  const x = metersToPixels(pos.x, pixelsPerMeter)
  const y = metersToPixels(pos.y, pixelsPerMeter)
  if (entity.render.fillStyle) {
    g.fillStyle = entity.render.fillStyle
    g.strokeStyle = entity.render.fillStyle
  }
  if (entity.render.kind === 'circle' && entity.render.radiusPx) {
    g.beginPath()
    g.arc(x, y, entity.render.radiusPx, 0, Math.PI * 2)
    g.fill()
  } else if (entity.render.kind === 'box' && entity.render.sizePx) {
    g.save()
    g.translate(x, y)
    g.rotate(angle)
    const size = entity.render.sizePx
    g.fillRect(-size / 2, -size / 2, size, size)
    g.restore()
  } else if (entity.render.kind === 'triangle' && entity.render.sizePx) {
    g.save()
    g.translate(x, y)
    g.rotate(angle)
    const s = entity.render.sizePx
    const h = Math.sqrt(3) / 2 * s
    g.beginPath()
    g.moveTo(0, (2 / 3) * h)
    g.lineTo(-s / 2, -(1 / 3) * h)
    g.lineTo(s / 2, -(1 / 3) * h)
    g.closePath()
    g.fill()
    g.restore()
  }
}

export function createRandomEntity(
  world: planck.World,
  pixelsPerMeter: number,
  widthPx: number,
  heightPx: number
): PhysicsEntity {
  const r = Math.random()
  const radiusPx = Math.random() * 35 + 25
  const sizePx = radiusPx * 1.4
  const xPx = Math.random() * Math.max(0, widthPx - 2 * radiusPx) + radiusPx
  const yPx = Math.random() * Math.max(0, heightPx - 2 * radiusPx) + radiusPx
  const vxPx = (Math.random() - 0.5) * 400
  const vyPx = (Math.random() - 0.5) * 400
  if (r < 1 / 3) {
    return createCircleEntity(world, pixelsPerMeter, xPx, yPx, radiusPx, { vxPx, vyPx })
  } else if (r < 2 / 3) {
    return createBoxEntity(world, pixelsPerMeter, xPx, yPx, sizePx, { vxPx, vyPx })
  }
  return createTriangleEntity(world, pixelsPerMeter, xPx, yPx, sizePx, { vxPx, vyPx })
}


