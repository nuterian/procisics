import planck from 'planck-js'

export type ShapeKind = 'circle' | 'box'

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
}

export function createCircleEntity(
  world: planck.World,
  pixelsPerMeter: number,
  xPx: number,
  yPx: number,
  radiusPx: number,
  options: BodyOptions = {}
): PhysicsEntity {
  const body = world.createBody({
    type: 'dynamic',
    position: planck.Vec2(pixelsToMeters(xPx, pixelsPerMeter), pixelsToMeters(yPx, pixelsPerMeter)),
    linearVelocity: planck.Vec2(
      pixelsToMeters(options.vxPx ?? 0, pixelsPerMeter),
      pixelsToMeters(options.vyPx ?? 0, pixelsPerMeter)
    ),
  })
  body.createFixture(planck.Circle(pixelsToMeters(radiusPx, pixelsPerMeter)), {
    density: options.density ?? 1,
    friction: options.friction ?? 0.2,
    restitution: options.restitution ?? 0.7,
  })
  return {
    body,
    render: { kind: 'circle', radiusPx },
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
    density: options.density ?? 1,
    friction: options.friction ?? 0.3,
    restitution: options.restitution ?? 0.6,
  })
  return {
    body,
    render: { kind: 'box', sizePx },
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
  }
}

export function createRandomEntity(
  world: planck.World,
  pixelsPerMeter: number,
  widthPx: number,
  heightPx: number
): PhysicsEntity {
  const isCircle = Math.random() > 0.5
  const radiusPx = Math.random() * 20 + 10
  const sizePx = radiusPx * 1.4
  const xPx = Math.random() * Math.max(0, widthPx - 2 * radiusPx) + radiusPx
  const yPx = Math.random() * Math.max(0, heightPx - 2 * radiusPx) + radiusPx
  const vxPx = (Math.random() - 0.5) * 400
  const vyPx = (Math.random() - 0.5) * 400
  if (isCircle) {
    return createCircleEntity(world, pixelsPerMeter, xPx, yPx, radiusPx, { vxPx, vyPx })
  }
  return createBoxEntity(world, pixelsPerMeter, xPx, yPx, sizePx, { vxPx, vyPx })
}


