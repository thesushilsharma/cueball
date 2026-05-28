export type Vector = {
  x: number;
  y: number;
};

export type Ball = {
  id: number;
  color: string;
  mass: number;
  radius: number;
  velocity: Vector;
  position: Vector;
};

export type Shot = {
  label: string;
  value: string;
  impulse: Vector;
};

export type Table = {
  height: number;
  rail: number;
  width: number;
};

export const SIMULATION_HZ = 120;

export const table: Table = {
  height: 520,
  rail: 42,
  width: 780,
};

export const shots: Shot[] = [
  { label: "Break", value: "break", impulse: { x: 360, y: -72 } },
  { label: "Rail cut", value: "rail", impulse: { x: 285, y: 118 } },
  { label: "Soft stun", value: "stun", impulse: { x: 180, y: -12 } },
];

export function createRack(shot: Shot, power: number): Ball[] {
  const centerY = table.height * 0.5;
  const cueVelocityScale = power / 60;

  return [
    createBall(0, "#f8fafc", 154, centerY + 14, {
      x: shot.impulse.x * cueVelocityScale,
      y: shot.impulse.y * cueVelocityScale,
    }),
    createBall(1, "#0f1419", 442, centerY),
    createBall(2, "#2c5ef5", 474, centerY - 18),
    createBall(3, "#4a5568", 474, centerY + 18),
    createBall(4, "#d7dde4", 506, centerY),
  ];
}

export function getActiveBallCount(balls: Ball[], speedThreshold = 2) {
  return balls.filter((ball) => magnitude(ball.velocity) > speedThreshold)
    .length;
}

export function getSystemEnergy(balls: Ball[]) {
  return balls.reduce((total, ball) => total + magnitude(ball.velocity), 0);
}

export function stepSimulation(balls: Ball[], friction: number) {
  const bounds = {
    bottom: table.height - table.rail - 16,
    left: table.rail + 16,
    right: table.width - table.rail - 16,
    top: table.rail + 16,
  };
  let collisions = 0;

  for (const ball of balls) {
    ball.position.x += ball.velocity.x / SIMULATION_HZ;
    ball.position.y += ball.velocity.y / SIMULATION_HZ;
    ball.velocity.x = stopSlowVelocity(ball.velocity.x * friction);
    ball.velocity.y = stopSlowVelocity(ball.velocity.y * friction);

    if (ball.position.x < bounds.left) {
      ball.position.x = bounds.left;
      ball.velocity.x = Math.abs(ball.velocity.x) * 0.84;
      collisions += 1;
    }
    if (ball.position.x > bounds.right) {
      ball.position.x = bounds.right;
      ball.velocity.x = -Math.abs(ball.velocity.x) * 0.84;
      collisions += 1;
    }
    if (ball.position.y < bounds.top) {
      ball.position.y = bounds.top;
      ball.velocity.y = Math.abs(ball.velocity.y) * 0.84;
      collisions += 1;
    }
    if (ball.position.y > bounds.bottom) {
      ball.position.y = bounds.bottom;
      ball.velocity.y = -Math.abs(ball.velocity.y) * 0.84;
      collisions += 1;
    }
  }

  for (let index = 0; index < balls.length; index += 1) {
    for (let next = index + 1; next < balls.length; next += 1) {
      collisions += resolveBallCollision(balls[index], balls[next]);
    }
  }

  return collisions;
}

function createBall(
  id: number,
  color: string,
  x: number,
  y: number,
  velocity: Vector = { x: 0, y: 0 },
): Ball {
  return {
    id,
    color,
    mass: 1,
    radius: 15,
    velocity,
    position: { x, y },
  };
}

function magnitude(vector: Vector) {
  return Math.hypot(vector.x, vector.y);
}

function resolveBallCollision(a: Ball, b: Ball) {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const distance = Math.hypot(dx, dy);
  const minimum = a.radius + b.radius;

  if (distance <= 0 || distance >= minimum) {
    return 0;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = (minimum - distance) / 2;
  const relativeVelocityX = a.velocity.x - b.velocity.x;
  const relativeVelocityY = a.velocity.y - b.velocity.y;
  const speed = relativeVelocityX * nx + relativeVelocityY * ny;

  a.position.x -= nx * overlap;
  a.position.y -= ny * overlap;
  b.position.x += nx * overlap;
  b.position.y += ny * overlap;

  if (speed > 0) {
    const impulse = (2 * speed) / (a.mass + b.mass);
    a.velocity.x -= impulse * b.mass * nx;
    a.velocity.y -= impulse * b.mass * ny;
    b.velocity.x += impulse * a.mass * nx;
    b.velocity.y += impulse * a.mass * ny;
  }

  return 1;
}

function stopSlowVelocity(value: number) {
  return Math.abs(value) < 0.8 ? 0 : value;
}
