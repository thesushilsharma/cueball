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
  createEightBallRack,
  getActiveBallCount,
  getCueBall,
  getObjectBalls,
  getSystemEnergy,
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
  status: GameStatus;
};

type PixiLayers = {
  aim: Graphics;
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
    drawScene(layersRef.current, ballsRef.current, null);
  }, []);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const hostElement = host;
    let isMounted = true;
    let accumulator = 0;

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

      const layers: PixiLayers = {
        aim: new Graphics(),
        balls: new Graphics(),
        colors: getGameColors(),
        labels: new Container(),
        table: new Graphics(),
        Text,
      };

      app.stage.addChild(layers.table);
      app.stage.addChild(layers.aim);
      app.stage.addChild(layers.balls);
      app.stage.addChild(layers.labels);

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
        drawScene(layers, ballsRef.current, point);
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (!aimingRef.current) {
          return;
        }

        const point = getTablePoint(event);
        aimPointRef.current = point;
        drawScene(layers, ballsRef.current, point);
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
        const power = Math.min(Math.hypot(pull.x, pull.y) * 0.72, 100);

        aimingRef.current = false;
        aimPointRef.current = null;

        if (power < 6) {
          drawScene(layers, ballsRef.current, null);
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

        drawScene(layers, ballsRef.current, aimPointRef.current);
      });

      appRef.current = app;
      layersRef.current = layers;
      drawScene(layers, ballsRef.current, null);

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
          status: "aiming",
        });
      }

      return () => {
        app.canvas.removeEventListener("pointerdown", handlePointerDown);
        app.canvas.removeEventListener("pointermove", handlePointerMove);
        app.canvas.removeEventListener("pointerup", handlePointerUp);
        app.canvas.removeEventListener("pointerleave", handlePointerUp);
      };
    }

    mountPixi();

    return () => {
      isMounted = false;
      appRef.current?.destroy(true);
      appRef.current = null;
      layersRef.current = null;
      hostElement.textContent = "";
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-[14px] bg-[var(--game-table-shadow)] p-3 shadow-2xl shadow-black/40 ring-1 ring-border">
        <div
          ref={hostRef}
          aria-label="Playable Cueball PixiJS 8-ball game table"
          className="aspect-[3/2] w-full overflow-hidden rounded-[10px] bg-[var(--game-felt)]"
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
) {
  if (!layers) {
    return;
  }

  drawTable(layers.table, layers.colors);
  drawAim(layers.aim, balls, aimPoint, layers.colors);
  drawBalls(layers.balls, layers.labels, balls, layers.Text);
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
  graphics: Graphics,
  balls: Ball[],
  aimPoint: Vector | null,
  colors: GameColors,
) {
  const cueBall = getCueBall(balls);

  graphics.clear();

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

  const nx = pull.x / pullLength;
  const ny = pull.y / pullLength;
  const shotLength = Math.min(230, pullLength * 2.2);
  const cueBack = Math.min(78, pullLength * 0.7);

  graphics
    .moveTo(cueBall.position.x, cueBall.position.y)
    .lineTo(
      cueBall.position.x + nx * shotLength,
      cueBall.position.y + ny * shotLength,
    )
    .stroke({ alpha: 0.5, color: colors.guide, width: 3 });

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
