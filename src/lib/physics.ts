export type Vector = {
  x: number;
  y: number;
};

export type Ball = {
  group?: "black" | "cue" | "solid" | "stripe";
  id: number;
  color: string;
  mass: number;
  number?: number;
  pocketed?: boolean;
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
export const POCKET_RADIUS = 20;

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

export const pockets: Vector[] = [
  { x: table.rail, y: table.rail },
  { x: table.width / 2, y: table.rail },
  { x: table.width - table.rail, y: table.rail },
  { x: table.rail, y: table.height - table.rail },
  { x: table.width / 2, y: table.height - table.rail },
  { x: table.width - table.rail, y: table.height - table.rail },
];

export function createRack(shot: Shot, power: number): Ball[] {
  const balls = createStationaryRack();

  applyShot(balls, shot, power);

  return balls;
}

export function createStationaryRack(): Ball[] {
  const centerY = table.height * 0.5;

  return [
    createBall(0, "#f8fafc", 154, centerY + 14),
    createBall(1, "#0f1419", 442, centerY),
    createBall(2, "#2c5ef5", 474, centerY - 18),
    createBall(3, "#4a5568", 474, centerY + 18),
    createBall(4, "#d7dde4", 506, centerY),
  ];
}

export function createEightBallRack(): Ball[] {
  const radius = 12;
  const spacingX = radius * 1.8;
  const spacingY = radius * 2.08;
  const apexX = 452;
  const centerY = table.height * 0.5;
  const layout = [[1], [9, 2], [10, 8, 3], [4, 11, 12, 5], [13, 6, 14, 7, 15]];

  return [
    createBall(0, "#f8fafc", 154, centerY, { group: "cue", radius }),
    ...layout.flatMap((row, rowIndex) =>
      row.map((number, columnIndex) => {
        const y = centerY + (columnIndex - (row.length - 1) / 2) * spacingY;
        const x = apexX + rowIndex * spacingX;

        return createBall(number, getBallColor(number), x, y, {
          group: getBallGroup(number),
          number,
          radius,
        });
      }),
    ),
  ];
}

export function applyShot(balls: Ball[], shot: Shot, power: number) {
  const cueBall = balls.find((ball) => ball.id === 0);
  const cueVelocityScale = power / 60;

  if (!cueBall) {
    return;
  }

  cueBall.velocity.x = shot.impulse.x * cueVelocityScale;
  cueBall.velocity.y = shot.impulse.y * cueVelocityScale;
}

export function applyCueImpulse(
  balls: Ball[],
  direction: Vector,
  power: number,
) {
  const cueBall = balls.find((ball) => ball.group === "cue");
  const length = Math.hypot(direction.x, direction.y);

  if (!cueBall || length === 0 || cueBall.pocketed) {
    return;
  }

  const impulse = Math.min(Math.max(power, 0), 100) * 5.4;
  cueBall.velocity.x = (direction.x / length) * impulse;
  cueBall.velocity.y = (direction.y / length) * impulse;
}

export function getActiveBallCount(balls: Ball[], speedThreshold = 2) {
  return balls.filter(
    (ball) => !ball.pocketed && magnitude(ball.velocity) > speedThreshold,
  ).length;
}

export function getSystemEnergy(balls: Ball[]) {
  return balls.reduce(
    (total, ball) => total + (ball.pocketed ? 0 : magnitude(ball.velocity)),
    0,
  );
}

export function getCueBall(balls: Ball[]) {
  return balls.find((ball) => ball.group === "cue");
}

export function getObjectBalls(balls: Ball[]) {
  return balls.filter((ball) => ball.group !== "cue");
}

export function pocketSettledBalls(balls: Ball[]) {
  const pocketed: Ball[] = [];

  for (const ball of balls) {
    if (ball.pocketed) {
      continue;
    }

    const pocket = pockets.find(
      (candidate) =>
        Math.hypot(
          ball.position.x - candidate.x,
          ball.position.y - candidate.y,
        ) < POCKET_RADIUS,
    );

    if (pocket) {
      if (ball.group === "cue") {
        ball.position = { x: 154, y: table.height * 0.5 };
        ball.velocity = { x: 0, y: 0 };
      } else {
        ball.pocketed = true;
        ball.position = pocket;
        ball.velocity = { x: 0, y: 0 };
        pocketed.push(ball);
      }
    }
  }

  return pocketed;
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
    if (ball.pocketed) {
      continue;
    }

    ball.position.x += ball.velocity.x / SIMULATION_HZ;
    ball.position.y += ball.velocity.y / SIMULATION_HZ;
    ball.velocity.x = stopSlowVelocity(ball.velocity.x * friction);
    ball.velocity.y = stopSlowVelocity(ball.velocity.y * friction);

    if (ball.position.x < bounds.left + ball.radius) {
      ball.position.x = bounds.left + ball.radius;
      ball.velocity.x = Math.abs(ball.velocity.x) * 0.84;
      collisions += 1;
    }
    if (ball.position.x > bounds.right - ball.radius) {
      ball.position.x = bounds.right - ball.radius;
      ball.velocity.x = -Math.abs(ball.velocity.x) * 0.84;
      collisions += 1;
    }
    if (ball.position.y < bounds.top + ball.radius) {
      ball.position.y = bounds.top + ball.radius;
      ball.velocity.y = Math.abs(ball.velocity.y) * 0.84;
      collisions += 1;
    }
    if (ball.position.y > bounds.bottom - ball.radius) {
      ball.position.y = bounds.bottom - ball.radius;
      ball.velocity.y = -Math.abs(ball.velocity.y) * 0.84;
      collisions += 1;
    }
  }

  for (let index = 0; index < balls.length; index += 1) {
    for (let next = index + 1; next < balls.length; next += 1) {
      if (balls[index].pocketed || balls[next].pocketed) {
        continue;
      }

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
  options: Partial<Ball> & { velocity?: Vector } = {},
): Ball {
  return {
    group: options.group,
    id,
    color,
    mass: options.mass ?? 1,
    number: options.number,
    pocketed: options.pocketed ?? false,
    radius: options.radius ?? 15,
    velocity: options.velocity ?? { x: 0, y: 0 },
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

function getBallGroup(number: number): Ball["group"] {
  if (number === 8) {
    return "black";
  }

  return number < 8 ? "solid" : "stripe";
}

function getBallColor(number: number) {
  const colors: Record<number, string> = {
    1: "#f5c542",
    2: "#2c5ef5",
    3: "#d14545",
    4: "#6f4bb8",
    5: "#e4772e",
    6: "#208a74",
    7: "#6a2d22",
    8: "#101418",
    9: "#f5c542",
    10: "#2c5ef5",
    11: "#d14545",
    12: "#6f4bb8",
    13: "#e4772e",
    14: "#208a74",
    15: "#6a2d22",
  };

  return colors[number] ?? "#d7dde4";
}
