"use client";

import { Pause, Play, RotateCcw, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Ball = {
  id: number;
  color: string;
  mass: number;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type Shot = {
  label: string;
  value: string;
  impulse: { x: number; y: number };
};

const shots: Shot[] = [
  { label: "Break", value: "break", impulse: { x: 360, y: -72 } },
  { label: "Rail cut", value: "rail", impulse: { x: 285, y: 118 } },
  { label: "Soft stun", value: "stun", impulse: { x: 180, y: -12 } },
];

const table = {
  height: 520,
  rail: 42,
  width: 780,
};

const metrics = [
  { label: "simulation step", value: "120 hz" },
  { label: "render target", value: "60 fps" },
  { label: "collisions", value: "elastic" },
];

function createRack(shot: Shot, power: number): Ball[] {
  const centerY = table.height * 0.5;
  const cueVelocityScale = power / 60;

  return [
    {
      id: 0,
      color: "#f8fafc",
      mass: 1,
      radius: 15,
      vx: shot.impulse.x * cueVelocityScale,
      vy: shot.impulse.y * cueVelocityScale,
      x: 154,
      y: centerY + 14,
    },
    {
      id: 1,
      color: "#0f1419",
      mass: 1,
      radius: 15,
      vx: 0,
      vy: 0,
      x: 442,
      y: centerY,
    },
    {
      id: 2,
      color: "#2c5ef5",
      mass: 1,
      radius: 15,
      vx: 0,
      vy: 0,
      x: 474,
      y: centerY - 18,
    },
    {
      id: 3,
      color: "#4a5568",
      mass: 1,
      radius: 15,
      vx: 0,
      vy: 0,
      x: 474,
      y: centerY + 18,
    },
    {
      id: 4,
      color: "#d7dde4",
      mass: 1,
      radius: 15,
      vx: 0,
      vy: 0,
      x: 506,
      y: centerY,
    },
  ];
}

function drawTable(context: CanvasRenderingContext2D, balls: Ball[]) {
  const { height, rail, width } = table;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f1f3f5";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#ffffff";
  roundRect(context, rail, rail, width - rail * 2, height - rail * 2, 12);
  context.fill();

  context.strokeStyle = "#d9dde3";
  context.lineWidth = 1;
  roundRect(
    context,
    rail + 14,
    rail + 14,
    width - (rail + 14) * 2,
    height - (rail + 14) * 2,
    8,
  );
  context.stroke();

  context.fillStyle = "#0f1419";
  for (const [x, y] of [
    [rail, rail],
    [width / 2, rail],
    [width - rail, rail],
    [rail, height - rail],
    [width / 2, height - rail],
    [width - rail, height - rail],
  ]) {
    context.beginPath();
    context.arc(x, y, 11, 0, Math.PI * 2);
    context.fill();
  }

  for (const ball of balls) {
    context.save();
    context.shadowBlur = 20;
    context.shadowColor = "rgba(15, 20, 25, 0.18)";
    context.shadowOffsetY = 10;
    context.fillStyle = ball.color;
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.strokeStyle =
      ball.id === 0 ? "#d9dde3" : "rgba(255, 255, 255, 0.48)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(ball.x - 4, ball.y - 4, ball.radius * 0.36, 0, Math.PI * 2);
    context.stroke();
  }
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function stepSimulation(balls: Ball[], friction: number) {
  const bounds = {
    bottom: table.height - table.rail - 16,
    left: table.rail + 16,
    right: table.width - table.rail - 16,
    top: table.rail + 16,
  };
  let collisions = 0;

  for (const ball of balls) {
    ball.x += ball.vx / 120;
    ball.y += ball.vy / 120;
    ball.vx *= friction;
    ball.vy *= friction;

    if (Math.abs(ball.vx) < 0.8) {
      ball.vx = 0;
    }
    if (Math.abs(ball.vy) < 0.8) {
      ball.vy = 0;
    }

    if (ball.x < bounds.left) {
      ball.x = bounds.left;
      ball.vx = Math.abs(ball.vx) * 0.84;
      collisions += 1;
    }
    if (ball.x > bounds.right) {
      ball.x = bounds.right;
      ball.vx = -Math.abs(ball.vx) * 0.84;
      collisions += 1;
    }
    if (ball.y < bounds.top) {
      ball.y = bounds.top;
      ball.vy = Math.abs(ball.vy) * 0.84;
      collisions += 1;
    }
    if (ball.y > bounds.bottom) {
      ball.y = bounds.bottom;
      ball.vy = -Math.abs(ball.vy) * 0.84;
      collisions += 1;
    }
  }

  for (let index = 0; index < balls.length; index += 1) {
    for (let next = index + 1; next < balls.length; next += 1) {
      const a = balls[index];
      const b = balls[next];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minimum = a.radius + b.radius;

      if (distance > 0 && distance < minimum) {
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = (minimum - distance) / 2;
        const relativeVelocityX = a.vx - b.vx;
        const relativeVelocityY = a.vy - b.vy;
        const speed = relativeVelocityX * nx + relativeVelocityY * ny;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        if (speed > 0) {
          const impulse = (2 * speed) / (a.mass + b.mass);
          a.vx -= impulse * b.mass * nx;
          a.vy -= impulse * b.mass * ny;
          b.vx += impulse * a.mass * nx;
          b.vy += impulse * a.mass * ny;
        }

        collisions += 1;
      }
    }
  }

  return collisions;
}

export function SimulationDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const collisionRef = useRef(0);
  const [friction, setFriction] = useState(0.992);
  const [isRunning, setIsRunning] = useState(true);
  const [power, setPower] = useState(72);
  const [shotValue, setShotValue] = useState(shots[0].value);
  const [stats, setStats] = useState({
    activeBalls: 5,
    collisions: 0,
    energy: 0,
  });

  const selectedShot = useMemo(
    () => shots.find((shot) => shot.value === shotValue) ?? shots[0],
    [shotValue],
  );

  const reset = useCallback(() => {
    collisionRef.current = 0;
    ballsRef.current = createRack(selectedShot, power);
    setStats({ activeBalls: 5, collisions: 0, energy: 0 });
  }, [power, selectedShot]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    let animationFrame = 0;
    let previous = performance.now();
    let accumulator = 0;

    const render = (now: number) => {
      const elapsed = Math.min(now - previous, 80) / 1000;
      previous = now;
      accumulator += elapsed;

      if (isRunning) {
        while (accumulator >= 1 / 120) {
          collisionRef.current += stepSimulation(ballsRef.current, friction);
          accumulator -= 1 / 120;
        }
      } else {
        accumulator = 0;
      }

      drawTable(context, ballsRef.current);

      const energy = ballsRef.current.reduce(
        (total, ball) => total + Math.hypot(ball.vx, ball.vy),
        0,
      );
      const activeBalls = ballsRef.current.filter(
        (ball) => Math.hypot(ball.vx, ball.vy) > 2,
      ).length;
      setStats({
        activeBalls,
        collisions: collisionRef.current,
        energy: Math.round(energy),
      });

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrame);
  }, [friction, isRunning]);

  return (
    <div className="rounded-[16px] bg-card p-3 shadow-sm ring-1 ring-border sm:p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative overflow-hidden rounded-[10px] bg-muted ring-1 ring-border">
          <canvas
            ref={canvasRef}
            aria-label="Interactive billiards physics simulation"
            className="aspect-[16/10] h-auto w-full"
            height={table.height}
            width={table.width}
          />
          <div className="absolute top-4 left-4 rounded-[6px] bg-card px-3 py-2 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border">
            #{shotValue} / {stats.energy} px-s
          </div>
          <div className="absolute right-4 bottom-4 rounded-[6px] bg-card px-3 py-2 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border">
            {stats.collisions} contacts
          </div>
        </div>

        <div className="grid content-start gap-3">
          <div className="grid grid-cols-3 overflow-hidden rounded-[10px] bg-muted p-1 ring-1 ring-border xl:grid-cols-1">
            {shots.map((shot) => (
              <button
                className="h-10 rounded-[8px] px-3 font-semibold text-muted-foreground text-xs transition hover:bg-card hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
                key={shot.value}
                onClick={() => setShotValue(shot.value)}
                type="button"
                aria-pressed={shot.value === shotValue}
              >
                {shot.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-primary px-3 font-semibold text-primary-foreground text-sm transition hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              onClick={() => setIsRunning((value) => !value)}
              type="button"
            >
              {isRunning ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              {isRunning ? "Pause" : "Play"}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-muted px-3 font-semibold text-foreground text-sm ring-1 ring-border transition hover:bg-card focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              onClick={reset}
              type="button"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </button>
          </div>

          <label className="grid gap-2 font-mono text-muted-foreground text-xs">
            Shot power
            <input
              className="accent-primary"
              max="100"
              min="35"
              onChange={(event) => setPower(Number(event.target.value))}
              type="range"
              value={power}
            />
          </label>

          <label className="grid gap-2 font-mono text-muted-foreground text-xs">
            Cloth speed
            <input
              className="accent-primary"
              max="0.998"
              min="0.982"
              onChange={(event) => setFriction(Number(event.target.value))}
              step="0.001"
              type="range"
              value={friction}
            />
          </label>

          <div className="grid grid-cols-2 gap-2 text-sm xl:grid-cols-1">
            <div className="rounded-[10px] bg-muted p-3">
              <div className="font-mono text-muted-foreground text-xs">
                moving
              </div>
              <div className="mt-1 font-semibold text-2xl">
                {stats.activeBalls}
              </div>
            </div>
            <div className="rounded-[10px] bg-muted p-3">
              <div className="font-mono text-muted-foreground text-xs">
                friction
              </div>
              <div className="mt-1 font-semibold text-2xl">
                {(friction * 100).toFixed(1)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[10px] bg-muted p-3 font-mono text-muted-foreground text-xs">
            <Zap className="size-4 text-primary" aria-hidden="true" />
            deterministic loop
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[10px] bg-muted p-3">
            <div className="font-mono text-muted-foreground text-xs tracking-normal">
              {metric.label}
            </div>
            <div className="mt-2 font-semibold text-2xl">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
