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
  // Per-shape damping (keeps motion natural while preventing runaway energy)
  body.setLinearDamping(0.12)
  body.setAngularDamping(0.12)
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
  body.setLinearDamping(0.22)
  body.setAngularDamping(0.25)
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
  body.setLinearDamping(0.16)
  body.setAngularDamping(0.18)
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

/**
 * Step the world using substeps and apply forces before each substep.
 * Guarantees at least one step per frame so forces remain continuous.
 * Returns total simulated seconds this call advanced.
 */
export function stepWorldWithForces(
  world: planck.World,
  accumulatorRef: { current: number },
  dtSeconds: number,
  timeStepSeconds: number,
  simTimeRef: { current: number },
  applyForces: (simTimeSeconds: number) => void,
  afterStep?: () => void
): number {
  let advanced = 0
  accumulatorRef.current += dtSeconds
  // Perform fixed steps
  while (accumulatorRef.current >= timeStepSeconds) {
    applyForces(simTimeRef.current)
    world.step(timeStepSeconds, 10, 6)
    accumulatorRef.current -= timeStepSeconds
    simTimeRef.current += timeStepSeconds
    advanced += timeStepSeconds
    if (afterStep) afterStep()
  }
  // Final partial step to avoid halting when accumulator is small
  if (accumulatorRef.current > 0) {
    const partial = accumulatorRef.current
    applyForces(simTimeRef.current)
    world.step(partial, 10, 6)
    accumulatorRef.current = 0
    simTimeRef.current += partial
    advanced += partial
    if (afterStep) afterStep()
  }
  return advanced
}

/** Clamp all dynamic body speeds in the world to a maximum (meters/second). */
export function clampWorldSpeeds(world: planck.World, maxSpeedMps: number): void {
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic()) continue
    const v = b.getLinearVelocity()
    const speed = Math.hypot(v.x, v.y)
    if (speed > maxSpeedMps && speed > 0) {
      const scale = maxSpeedMps / speed
      b.setLinearVelocity(planck.Vec2(v.x * scale, v.y * scale))
    }
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


// --- Interaction helpers ---

/**
 * Set gravity based on a tilt angle in degrees, keeping magnitude g.
 * 0° means gravity points down; positive angles tilt to the right.
 */
export function setGravityFromAngle(world: planck.World, angleDeg: number, g = 10): void {
  const a = (angleDeg * Math.PI) / 180
  const gx = Math.sin(a) * g
  const gy = Math.cos(a) * g
  world.setGravity(planck.Vec2(gx, gy))
}

/** Apply a small random linear impulse to dynamic bodies for a shake effect. */
export function applyWorldShake(
  world: planck.World,
  pixelsPerMeter: number,
  intensityPx: number
): void {
  const ix = pixelsToMeters(intensityPx, pixelsPerMeter)
  const iy = pixelsToMeters(intensityPx, pixelsPerMeter)
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    if (b.isDynamic()) {
      const jx = (Math.random() * 2 - 1) * ix
      const jy = (Math.random() * 2 - 1) * iy
      b.applyLinearImpulse(planck.Vec2(jx, jy), b.getWorldCenter(), true)
    }
  }
}

/** Apply a linear impulse at a screen-space point to nearby bodies (drag-to-throw or wand). */
export function applyImpulseAt(
  world: planck.World,
  pixelsPerMeter: number,
  pointPx: { x: number; y: number },
  impulsePx: { x: number; y: number },
  radiusPx = 80
): void {
  const radiusM = pixelsToMeters(radiusPx, pixelsPerMeter)
  const jx = pixelsToMeters(impulsePx.x, pixelsPerMeter)
  const jy = pixelsToMeters(impulsePx.y, pixelsPerMeter)
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic()) continue
    const c = b.getWorldCenter()
    const cx = metersToPixels(c.x, pixelsPerMeter)
    const cy = metersToPixels(c.y, pixelsPerMeter)
    const dx = cx - pointPx.x
    const dy = cy - pointPx.y
    const dist = Math.hypot(dx, dy)
    if (dist <= radiusPx) {
      // Attenuate impulse by distance (linear falloff)
      const falloff = 1 - dist / radiusPx
      b.applyLinearImpulse(planck.Vec2(jx * falloff, jy * falloff), c, true)
    }
  }
}

/** Apply a radial force (attractor or repulsor) from a CSS-pixel origin. */
export function applyRadialForce(
  world: planck.World,
  pixelsPerMeter: number,
  originPx: { x: number; y: number },
  strength: number,
  mode: 'attract' | 'repel' = 'attract'
): void {
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic()) continue
    const c = b.getWorldCenter()
    const cx = metersToPixels(c.x, pixelsPerMeter)
    const cy = metersToPixels(c.y, pixelsPerMeter)
    let dx = originPx.x - cx
    let dy = originPx.y - cy
    const distPx = Math.hypot(dx, dy)
    if (distPx < 1) continue
    const nx = dx / distPx
    const ny = dy / distPx
    // linear falloff up to a reasonable radius
    const maxRadiusPx = 300
    const falloff = Math.max(0, 1 - Math.min(distPx, maxRadiusPx) / maxRadiusPx)
    const s = (mode === 'attract' ? 1 : -1) * strength * falloff
    const fxPx = nx * s
    const fyPx = ny * s
    const fx = pixelsToMeters(fxPx, pixelsPerMeter)
    const fy = pixelsToMeters(fyPx, pixelsPerMeter)
    b.applyForceToCenter(planck.Vec2(fx, fy), true)
  }
}

/** Limit a body's linear speed in meters/second to keep stability. */
export function clampBodySpeed(body: planck.Body, maxSpeedMps: number): void {
  const v = body.getLinearVelocity()
  const speed = Math.hypot(v.x, v.y)
  if (speed > maxSpeedMps && speed > 0) {
    const scale = maxSpeedMps / speed
    body.setLinearVelocity(planck.Vec2(v.x * scale, v.y * scale))
  }
}

/** Apply a uniform acceleration (px/s^2) to all dynamic bodies (e.g., wind). */
export function applyUniformAcceleration(
  world: planck.World,
  pixelsPerMeter: number,
  axPx: number,
  ayPx: number
): void {
  const ax = pixelsToMeters(axPx, pixelsPerMeter)
  const ay = pixelsToMeters(ayPx, pixelsPerMeter)
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic()) continue
    const m = b.getMass()
    b.applyForceToCenter(planck.Vec2(ax * m, ay * m), true)
  }
}

