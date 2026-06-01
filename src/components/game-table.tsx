"use client";

import { RotateCcw } from "lucide-react";
import type {
  Application,
  Container,
  Graphics,
  Text as PixiText,
} from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyCueImpulse,
  type Ball,
  computeCueTrajectory,
  createEightBallRack,
  getActiveBallCount,
  getCueBall,
  getObjectBalls,
  getShotPowerFromPull,
  getSystemEnergy,
  MAX_PULL_LENGTH,
  MAX_SHOT_POWER,
  MIN_SHOT_POWER,
  POCKET_RADIUS,
  pocketSettledBalls,
  pockets,
  SIMULATION_HZ,
  stepSimulation,
  table,
  type Vector,
} from "@/lib/physics";

type AssignedGroup = "solid" | "stripe";
type GameStatus = "aiming" | "rolling" | "won";
type Player = 1 | 2;

type GameSnapshot = {
  activeBalls: number;
  currentPlayer: Player;
  energy: number;
  groups: Record<Player, AssignedGroup | null>;
  message: string;
  pocketed: number[];
  shotPower: number | null;
  status: GameStatus;
};

type PixiLayers = {
  aim: Graphics;
  aimLabels: Container;
  balls: Graphics;
  colors: GameColors;
  labels: Container;
  table: Graphics;
  Text: typeof PixiText;
};

type GameColors = {
  cushion: number;
  felt: number;
  guide: number;
  pocket: number;
  pocketRim: number;
  railDark: number;
  railLight: number;
};

const initialSnapshot: GameSnapshot = {
  activeBalls: 0,
  currentPlayer: 1,
  energy: 0,
  groups: { 1: null, 2: null },
  message: "Drag from the cue ball, pull back, and release to shoot.",
  pocketed: [],
  shotPower: null,
  status: "aiming",
};

export function GameTable() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layersRef = useRef<PixiLayers | null>(null);
  const ballsRef = useRef<Ball[]>(createEightBallRack());
  const aimingRef = useRef(false);
  const aimPointRef = useRef<Vector | null>(null);
  const currentPlayerRef = useRef<Player>(1);
  const groupsRef = useRef<Record<Player, AssignedGroup | null>>({
    1: null,
    2: null,
  });
  const pocketedThisTurnRef = useRef<Ball[]>([]);
  const statusRef = useRef<GameStatus>("aiming");
  const [snapshot, setSnapshot] = useState<GameSnapshot>(initialSnapshot);

  const resetGame = useCallback(() => {
    ballsRef.current = createEightBallRack();
    currentPlayerRef.current = 1;
    groupsRef.current = { 1: null, 2: null };
    pocketedThisTurnRef.current = [];
    statusRef.current = "aiming";
    aimingRef.current = false;
    aimPointRef.current = null;
    setSnapshot(initialSnapshot);
    drawScene(layersRef.current, ballsRef.current, null, null);
  }, []);

  const syncAimPower = useCallback((aimPoint: Vector | null) => {
    const cueBall = getCueBall(ballsRef.current);

    if (!aimPoint || !cueBall) {
      setSnapshot((current) => ({ ...current, shotPower: null }));
      return;
    }

    const pull = {
      x: cueBall.position.x - aimPoint.x,
      y: cueBall.position.y - aimPoint.y,
    };
    const shotPower = getShotPowerFromPull(pull);

    setSnapshot((current) => ({
      ...current,
      shotPower: shotPower < MIN_SHOT_POWER ? 0 : Math.round(shotPower),
    }));
  }, []);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const hostElement = host;
    let isMounted = true;
    let accumulator = 0;
    let resizeObserver: ResizeObserver | undefined;
    let removeCanvasListeners: (() => void) | undefined;

    async function mountPixi() {
      const { Application, Container, Graphics, Text } = await import(
        "pixi.js"
      );

      if (!isMounted || appRef.current) {
        return;
      }

      const app = new Application();
      await app.init({
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        height: table.height,
        resolution: window.devicePixelRatio || 1,
        width: table.width,
      });

      if (!isMounted) {
        app.destroy(true);
        return;
      }

      app.canvas.className = "block h-full w-full touch-none";
      hostElement.appendChild(app.canvas);

      const fitTableView = () => {
        const width = hostElement.clientWidth;
        const height = hostElement.clientHeight;

        if (width === 0 || height === 0) {
          return;
        }

        app.renderer.resize(width, height);
        app.canvas.style.width = "100%";
        app.canvas.style.height = "100%";

        const scale = Math.min(width / table.width, height / table.height);
        app.stage.scale.set(scale);
        app.stage.position.set(
          (width - table.width * scale) / 2,
          (height - table.height * scale) / 2,
        );
      };

      fitTableView();
      resizeObserver = new ResizeObserver(fitTableView);
      resizeObserver.observe(hostElement);

      const layers: PixiLayers = {
        aim: new Graphics(),
        aimLabels: new Container(),
        balls: new Graphics(),
        colors: getGameColors(),
        labels: new Container(),
        table: new Graphics(),
        Text,
      };

      app.stage.addChild(layers.table);
      app.stage.addChild(layers.balls);
      app.stage.addChild(layers.labels);
      app.stage.addChild(layers.aim);
      app.stage.addChild(layers.aimLabels);

      const getTablePoint = (event: PointerEvent): Vector => {
        const rect = app.canvas.getBoundingClientRect();

        return {
          x: ((event.clientX - rect.left) / rect.width) * table.width,
          y: ((event.clientY - rect.top) / rect.height) * table.height,
        };
      };

      const handlePointerDown = (event: PointerEvent) => {
        const cueBall = getCueBall(ballsRef.current);
        const point = getTablePoint(event);

        if (
          statusRef.current !== "aiming" ||
          !cueBall ||
          Math.hypot(
            point.x - cueBall.position.x,
            point.y - cueBall.position.y,
          ) > 44
        ) {
          return;
        }

        aimingRef.current = true;
        aimPointRef.current = point;
        syncAimPower(point);
        drawScene(layers, ballsRef.current, point, getShotPowerFromPull({
          x: cueBall.position.x - point.x,
          y: cueBall.position.y - point.y,
        }));
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (!aimingRef.current) {
          return;
        }

        const point = getTablePoint(event);
        const cueBall = getCueBall(ballsRef.current);
        aimPointRef.current = point;
        syncAimPower(point);
        drawScene(
          layers,
          ballsRef.current,
          point,
          cueBall
            ? getShotPowerFromPull({
                x: cueBall.position.x - point.x,
                y: cueBall.position.y - point.y,
              })
            : null,
        );
      };

      const handlePointerUp = () => {
        const cueBall = getCueBall(ballsRef.current);
        const aimPoint = aimPointRef.current;

        if (!aimingRef.current || !cueBall || !aimPoint) {
          return;
        }

        const pull = {
          x: cueBall.position.x - aimPoint.x,
          y: cueBall.position.y - aimPoint.y,
        };
        const power = getShotPowerFromPull(pull);

        aimingRef.current = false;
        aimPointRef.current = null;
        setSnapshot((current) => ({ ...current, shotPower: null }));

        if (power < MIN_SHOT_POWER) {
          drawScene(layers, ballsRef.current, null, null);
          return;
        }

        pocketedThisTurnRef.current = [];
        applyCueImpulse(ballsRef.current, pull, power);
        statusRef.current = "rolling";
        setSnapshot((current) => ({
          ...current,
          message: `Player ${currentPlayerRef.current} shot with ${Math.round(
            power,
          )}% power.`,
          shotPower: null,
          status: "rolling",
        }));
      };

      app.canvas.addEventListener("pointerdown", handlePointerDown);
      app.canvas.addEventListener("pointermove", handlePointerMove);
      app.canvas.addEventListener("pointerup", handlePointerUp);
      app.canvas.addEventListener("pointerleave", handlePointerUp);

      app.ticker.add((ticker) => {
        const elapsed = Math.min(ticker.deltaMS, 80) / 1000;
        accumulator += elapsed;

        if (statusRef.current === "rolling") {
          while (accumulator >= 1 / SIMULATION_HZ) {
            stepSimulation(ballsRef.current, 0.992);
            pocketedThisTurnRef.current.push(
              ...pocketSettledBalls(ballsRef.current),
            );
            accumulator -= 1 / SIMULATION_HZ;
          }
        } else {
          accumulator = 0;
        }

        const activeBalls = getActiveBallCount(ballsRef.current);
        const energy = Math.round(getSystemEnergy(ballsRef.current));

        if (statusRef.current === "rolling" && activeBalls === 0) {
          settleTurn();
        } else {
          setSnapshot((current) => ({
            ...current,
            activeBalls,
            energy,
            pocketed: getObjectBalls(ballsRef.current)
              .filter((ball) => ball.pocketed)
              .map((ball) => ball.number ?? ball.id)
              .sort((a, b) => a - b),
          }));
        }

        drawScene(layers, ballsRef.current, aimPointRef.current, null);
      });

      appRef.current = app;
      layersRef.current = layers;
      drawScene(layers, ballsRef.current, null, null);

      function settleTurn() {
        const pocketed = pocketedThisTurnRef.current;
        const currentPlayer = currentPlayerRef.current;
        const objectPockets = pocketed.filter((ball) => ball.group !== "cue");
        const blackBall = objectPockets.find((ball) => ball.group === "black");
        let message = objectPockets.length
          ? `Player ${currentPlayer} pocketed ${objectPockets
              .map((ball) => ball.number)
              .join(", ")}.`
          : `Player ${currentPlayer} missed.`;

        if (!groupsRef.current[1] && !groupsRef.current[2]) {
          const claimed = objectPockets.find(
            (ball) => ball.group === "solid" || ball.group === "stripe",
          )?.group;

          if (claimed === "solid" || claimed === "stripe") {
            groupsRef.current[currentPlayer] = claimed;
            groupsRef.current[currentPlayer === 1 ? 2 : 1] =
              claimed === "solid" ? "stripe" : "solid";
            message = `Player ${currentPlayer} claimed ${claimed}s.`;
          }
        }

        if (blackBall) {
          statusRef.current = "won";
          setSnapshot((current) => ({
            ...current,
            activeBalls: 0,
            currentPlayer,
            energy: 0,
            groups: { ...groupsRef.current },
            message: `Player ${currentPlayer} pocketed the black ball and wins.`,
            pocketed: getObjectBalls(ballsRef.current)
              .filter((ball) => ball.pocketed)
              .map((ball) => ball.number ?? ball.id)
              .sort((a, b) => a - b),
            shotPower: null,
            status: "won",
          }));
          return;
        }

        const playerGroup = groupsRef.current[currentPlayer];
        const madeOwnBall =
          playerGroup !== null &&
          objectPockets.some((ball) => ball.group === playerGroup);

        if (!madeOwnBall) {
          currentPlayerRef.current = currentPlayer === 1 ? 2 : 1;
        }

        pocketedThisTurnRef.current = [];
        statusRef.current = "aiming";
        setSnapshot({
          activeBalls: 0,
          currentPlayer: currentPlayerRef.current,
          energy: 0,
          groups: { ...groupsRef.current },
          message,
          pocketed: getObjectBalls(ballsRef.current)
            .filter((ball) => ball.pocketed)
            .map((ball) => ball.number ?? ball.id)
            .sort((a, b) => a - b),
          shotPower: null,
          status: "aiming",
        });
      }

      removeCanvasListeners = () => {
        app.canvas.removeEventListener("pointerdown", handlePointerDown);
        app.canvas.removeEventListener("pointermove", handlePointerMove);
        app.canvas.removeEventListener("pointerup", handlePointerUp);
        app.canvas.removeEventListener("pointerleave", handlePointerUp);
      };
    }

    mountPixi();

    return () => {
      isMounted = false;
      resizeObserver?.disconnect();
      removeCanvasListeners?.();
      appRef.current?.destroy(true);
      appRef.current = null;
      layersRef.current = null;
      hostElement.textContent = "";
    };
  }, [syncAimPower]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-[14px] bg-[var(--game-table-shadow)] p-3 shadow-2xl shadow-black/40 ring-1 ring-border">
        <div
          ref={hostRef}
          aria-label="Playable Cueball PixiJS 8-ball game table"
          className="aspect-[3/2] w-full overflow-hidden rounded-[10px] bg-[var(--game-table-shadow)]"
          role="img"
        />
      </div>

      <div className="grid content-start gap-3">
        <div className="rounded-[10px] bg-card p-4 text-card-foreground ring-1 ring-border">
          <div className="font-mono text-primary text-xs">current turn</div>
          <div className="mt-1 font-semibold text-3xl">
            Player {snapshot.currentPlayer}
          </div>
          <p className="mt-3 min-h-12 text-muted-foreground text-sm leading-6">
            {snapshot.message}
          </p>
        </div>

        <PowerMeter shotPower={snapshot.shotPower} status={snapshot.status} />

        <div className="grid grid-cols-2 gap-2">
          <StatTile label="player 1" value={snapshot.groups[1] ?? "open"} />
          <StatTile label="player 2" value={snapshot.groups[2] ?? "open"} />
          <StatTile label="state" value={snapshot.status} />
          <StatTile label="moving" value={snapshot.activeBalls} />
        </div>

        <div className="rounded-[10px] bg-card p-3 ring-1 ring-border">
          <div className="font-mono text-primary text-xs">pocketed</div>
          <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
            {snapshot.pocketed.length ? (
              snapshot.pocketed.map((number) => (
                <span
                  className="grid size-7 place-items-center rounded-full bg-foreground font-mono text-background text-xs ring-1 ring-border"
                  key={number}
                >
                  {number}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">none yet</span>
            )}
          </div>
        </div>

        <div className="rounded-[10px] bg-card p-3 font-mono text-muted-foreground text-xs ring-1 ring-border">
          drag cue ball to aim / energy {snapshot.energy} px-s / physics{" "}
          {SIMULATION_HZ} hz
        </div>

        <button
          className="interactive-press inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-3 font-semibold text-primary-foreground text-sm transition-[background-color] duration-200 hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          onClick={resetGame}
          type="button"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          New rack
        </button>
      </div>
    </div>
  );
}

function PowerMeter({
  shotPower,
  status,
}: {
  shotPower: number | null;
  status: GameStatus;
}) {
  const isAiming = status === "aiming";
  const power = shotPower ?? 0;
  const isReady = power >= MIN_SHOT_POWER;

  return (
    <div className="rounded-[10px] bg-card p-4 ring-1 ring-border">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-primary text-xs">shot power</div>
        <span
          className={`font-mono text-xs ${
            isAiming && isReady ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {isAiming ? `${power}%` : "pull to aim"}
        </span>
      </div>
      <meter
        aria-label="Shot power"
        className="power-meter mt-3 block h-2.5 w-full overflow-hidden rounded-full"
        max={MAX_SHOT_POWER}
        min={0}
        value={isAiming ? power : 0}
      />
      <p className="mt-2 text-muted-foreground text-xs leading-5">
        {isAiming
          ? isReady
            ? "Release to shoot. Further pull = harder hit."
            : "Pull back a little more to register a shot."
          : "Press and drag from the cue ball to line up power."}
      </p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[10px] bg-card p-3 ring-1 ring-border">
      <div className="font-mono text-primary text-xs">{label}</div>
      <div className="mt-1 font-semibold text-card-foreground text-xl capitalize">
        {value}
      </div>
    </div>
  );
}

function drawScene(
  layers: PixiLayers | null,
  balls: Ball[],
  aimPoint: Vector | null,
  shotPower: number | null,
) {
  if (!layers) {
    return;
  }

  drawTable(layers.table, layers.colors);
  drawBalls(layers.balls, layers.labels, balls, layers.Text);
  drawAim(layers, balls, aimPoint, shotPower);
}

function drawTable(graphics: Graphics, colors: GameColors) {
  const { height, rail, width } = table;

  graphics.clear();
  graphics.roundRect(0, 0, width, height, 22).fill(colors.railDark);
  graphics
    .roundRect(14, 14, width - 28, height - 28, 18)
    .fill(colors.railLight);
  graphics.roundRect(26, 26, width - 52, height - 52, 14).fill(colors.railDark);
  graphics
    .roundRect(rail, rail, width - rail * 2, height - rail * 2, 12)
    .fill(colors.cushion);
  graphics
    .roundRect(
      rail + 22,
      rail + 22,
      width - (rail + 22) * 2,
      height - (rail + 22) * 2,
      8,
    )
    .fill(colors.felt)
    .stroke({ alpha: 0.22, color: 0xffffff, width: 2 });

  for (let x = rail + 78; x < width - rail; x += 78) {
    graphics
      .moveTo(x, rail + 24)
      .lineTo(x + 28, height - rail - 24)
      .stroke({ alpha: 0.035, color: 0xffffff, width: 2 });
  }

  for (const diamond of [
    [width * 0.25, rail * 0.52],
    [width * 0.75, rail * 0.52],
    [width * 0.25, height - rail * 0.52],
    [width * 0.75, height - rail * 0.52],
    [rail * 0.52, height * 0.5],
    [width - rail * 0.52, height * 0.5],
  ]) {
    graphics
      .circle(diamond[0], diamond[1], 3)
      .fill({ alpha: 0.82, color: colors.guide });
  }

  for (const pocket of pockets) {
    graphics
      .circle(pocket.x + 2, pocket.y + 2, POCKET_RADIUS + 10)
      .fill({ alpha: 0.35, color: 0x000000 });
    graphics
      .circle(pocket.x, pocket.y, POCKET_RADIUS + 7)
      .fill(colors.pocketRim);
    graphics.circle(pocket.x, pocket.y, POCKET_RADIUS).fill(colors.pocket);
    graphics
      .circle(pocket.x - 4, pocket.y - 5, POCKET_RADIUS * 0.34)
      .fill({ alpha: 0.16, color: 0xffffff });
  }
}

function drawAim(
  layers: PixiLayers,
  balls: Ball[],
  aimPoint: Vector | null,
  shotPower: number | null,
) {
  const { aim: graphics, aimLabels, colors, Text } = layers;
  const cueBall = getCueBall(balls);

  graphics.clear();
  aimLabels.removeChildren();

  if (!cueBall || cueBall.pocketed || !aimPoint) {
    return;
  }

  const pull = {
    x: cueBall.position.x - aimPoint.x,
    y: cueBall.position.y - aimPoint.y,
  };
  const pullLength = Math.hypot(pull.x, pull.y);

  if (pullLength < 4) {
    return;
  }

  const power = shotPower ?? getShotPowerFromPull(pull);
  const powerRatio = Math.min(power / MAX_SHOT_POWER, 1);
  const powerColor = getPowerColor(powerRatio);
  const nx = pull.x / pullLength;
  const ny = pull.y / pullLength;
  const cueBack = Math.min(78, pullLength * 0.7);
  const trajectory = computeCueTrajectory(cueBall, pull, balls);

  graphics
    .circle(cueBall.position.x, cueBall.position.y, MAX_PULL_LENGTH)
    .stroke({ alpha: 0.2, color: colors.guide, width: 1.5 });

  graphics
    .moveTo(aimPoint.x, aimPoint.y)
    .lineTo(cueBall.position.x, cueBall.position.y)
    .stroke({
      alpha: 0.35 + powerRatio * 0.45,
      color: powerColor,
      width: 2 + powerRatio * 4,
    });

  const meterWidth = 72;
  const meterHeight = 8;
  const meterX = cueBall.position.x - meterWidth / 2;
  const meterY = cueBall.position.y - cueBall.radius - 28;
  const fillWidth = meterWidth * powerRatio;

  graphics
    .roundRect(meterX, meterY, meterWidth, meterHeight, 4)
    .fill({ alpha: 0.35, color: 0x0f1419 });
  graphics
    .roundRect(meterX, meterY, fillWidth, meterHeight, 4)
    .fill({ alpha: 0.92, color: powerColor });

  const powerLabel = new Text({
    style: {
      fill: "#f8fafc",
      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: "700",
    },
    text: `${Math.round(power)}%`,
  });
  powerLabel.anchor.set(0.5);
  powerLabel.position.set(cueBall.position.x, meterY - 10);
  aimLabels.addChild(powerLabel);

  if (trajectory.objectBallPath && trajectory.hitBall) {
    const objectColor = toPixiColor(trajectory.hitBall.color);

    for (
      let index = 0;
      index < trajectory.objectBallPath.points.length - 1;
      index += 1
    ) {
      const from = trajectory.objectBallPath.points[index];
      const to = trajectory.objectBallPath.points[index + 1];
      const fade = Math.max(0.28, 0.78 - index * 0.08);

      graphics
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({ alpha: fade, color: objectColor, width: index === 0 ? 3 : 2.5 });
    }

    for (const bounce of trajectory.objectBallPath.bouncePoints) {
      graphics
        .circle(bounce.x, bounce.y, 4)
        .fill({ alpha: 0.75, color: objectColor })
        .stroke({ alpha: 0.35, color: 0xffffff, width: 1.5 });
    }

    graphics
      .circle(trajectory.hitBall.position.x, trajectory.hitBall.position.y, 10)
      .stroke({ alpha: 0.7, color: objectColor, width: 2 });
  }

  for (let index = 0; index < trajectory.points.length - 1; index += 1) {
    const from = trajectory.points[index];
    const to = trajectory.points[index + 1];
    const fade = Math.max(0.22, 0.72 - index * 0.09);

    graphics
      .moveTo(from.x, from.y)
      .lineTo(to.x, to.y)
      .stroke({ alpha: fade, color: colors.guide, width: index === 0 ? 3 : 2.5 });
  }

  for (const bounce of trajectory.bouncePoints) {
    graphics
      .circle(bounce.x, bounce.y, 5)
      .fill({ alpha: 0.85, color: colors.guide })
      .stroke({ alpha: 0.45, color: 0xffffff, width: 1.5 });
  }

  if (trajectory.ballContact) {
    const contact = trajectory.ballContact;

    graphics
      .circle(contact.x, contact.y, cueBall.radius)
      .stroke({ alpha: 0.55, color: colors.guide, width: 2 });
    graphics
      .circle(contact.x, contact.y, 4)
      .fill({ alpha: 0.95, color: colors.guide });
  }

  graphics
    .moveTo(
      cueBall.position.x - nx * (cueBack + 28),
      cueBall.position.y - ny * (cueBack + 28),
    )
    .lineTo(cueBall.position.x - nx * 18, cueBall.position.y - ny * 18)
    .stroke({ color: 0xc68b45, width: 7 });

  graphics
    .circle(aimPoint.x, aimPoint.y, 8)
    .fill({ alpha: 0.72, color: colors.guide });
}

function drawBalls(
  graphics: Graphics,
  labels: Container,
  balls: Ball[],
  Text: typeof PixiText,
) {
  graphics.clear();
  labels.removeChildren();

  for (const ball of balls) {
    if (ball.pocketed) {
      continue;
    }

    graphics
      .circle(ball.position.x + 3, ball.position.y + 5, ball.radius + 3)
      .fill({ alpha: 0.1, color: 0x0f1419 });

    drawBallShape(graphics, ball);
    drawBallLabel(labels, ball, Text);
  }
}

function drawBallShape(graphics: Graphics, ball: Ball) {
  const { x, y } = ball.position;

  graphics.circle(x, y, ball.radius).fill(toPixiColor(ball.color));

  if (ball.group === "stripe") {
    graphics.circle(x, y, ball.radius).fill(0xf8fafc);
    graphics
      .roundRect(
        x - ball.radius,
        y - ball.radius * 0.44,
        ball.radius * 2,
        ball.radius * 0.88,
        3,
      )
      .fill(toPixiColor(ball.color));
  }

  graphics.circle(x - 3, y - 4, ball.radius * 0.34).stroke({
    alpha: ball.group === "cue" ? 1 : 0.54,
    color: 0xffffff,
    width: 2,
  });

  if (ball.number) {
    graphics.circle(x, y, ball.radius * 0.42).fill(0xf8fafc);
  }
}

function drawBallLabel(labels: Container, ball: Ball, Text: typeof PixiText) {
  if (!ball.number) {
    return;
  }

  const label = new Text({
    style: {
      align: "center",
      fill: ball.group === "black" ? "#101418" : "#26313a",
      fontFamily: "Arial",
      fontSize: 8,
      fontWeight: "700",
    },
    text: String(ball.number),
  });
  label.anchor.set(0.5);
  label.position.set(ball.position.x, ball.position.y + 0.5);
  labels.addChild(label);
}

function toPixiColor(color: string) {
  return Number.parseInt(color.replace("#", ""), 16);
}

function getPowerColor(ratio: number) {
  if (ratio < 0.45) {
    return 0x3ecf8e;
  }

  if (ratio < 0.75) {
    return 0xf5c542;
  }

  return 0xf06449;
}

function getGameColors(): GameColors {
  const styles = getComputedStyle(document.documentElement);

  return {
    cushion: cssColorToPixi(styles.getPropertyValue("--game-cushion")),
    felt: cssColorToPixi(styles.getPropertyValue("--game-felt")),
    guide: cssColorToPixi(styles.getPropertyValue("--game-guide")),
    pocket: cssColorToPixi(styles.getPropertyValue("--game-pocket")),
    pocketRim: cssColorToPixi(styles.getPropertyValue("--game-pocket-rim")),
    railDark: cssColorToPixi(styles.getPropertyValue("--game-rail-dark")),
    railLight: cssColorToPixi(styles.getPropertyValue("--game-rail-light")),
  };
}

function cssColorToPixi(value: string) {
  return Number.parseInt(value.trim().replace("#", ""), 16);
}
