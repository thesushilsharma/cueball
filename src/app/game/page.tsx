import {
  ArrowLeft,
  CircleDot,
  Crosshair,
  Gauge,
  MousePointer2,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { GameTable } from "@/components/game-table";

const rules = [
  "Pocket a ball after the break to claim solids or stripes.",
  "Always strike your own group first; hitting the opponent's ball first is a foul.",
  "Clear every ball in your group before taking on the black 8-ball.",
  "Legally pocket the black ball last to win the frame.",
];

const controls = [
  {
    description:
      "Press on the white cue ball and drag away from where you want to shoot.",
    icon: MousePointer2,
    title: "Grab the cue ball",
  },
  {
    description:
      "The further you pull, the higher the power meter climbs — up to 100%.",
    icon: Zap,
    title: "Pull back for power",
  },
  {
    description:
      "Gold shows the cue path; the struck ball’s color shows where it will go.",
    icon: Target,
    title: "Read the trajectories",
  },
  {
    description: "Let go when the power and angle feel right to take the shot.",
    icon: Crosshair,
    title: "Release to shoot",
  },
];

const stack = [
  "Next.js",
  "PixiJS renderer",
  "physics functions",
  "WASM-ready core",
];

export default function GamePage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-muted/50 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_oklch,var(--game-felt)_18%,transparent),transparent)]"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8">
        <header className="fade-up flex shrink-0 items-center justify-between border-border/70 border-b pb-3">
          <Link
            href="/"
            className="interactive-press group inline-flex items-center gap-2.5 rounded-[10px] py-1.5 pr-3 pl-1 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            <span className="grid size-9 place-items-center rounded-[10px] bg-card shadow-sm ring-1 ring-border transition-[box-shadow,ring-color] duration-200 group-hover:ring-ring/35">
              <ArrowLeft
                className="size-4 text-muted-foreground transition-colors duration-200 group-hover:text-foreground"
                aria-hidden="true"
              />
            </span>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <CircleDot className="size-3.5 text-primary" aria-hidden="true" />
              Cueball
            </span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-[10px] bg-card/90 px-3 py-2 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border backdrop-blur-sm">
            <Gauge className="size-3.5 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">120 hz loop</span>
            <span className="sm:hidden">120 hz</span>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-5 py-4 lg:gap-6 lg:py-5">
          <section className="fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-primary text-xs tracking-normal">
                PLAYABLE 8-BALL
              </p>
              <h1 className="mt-1 font-semibold text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.02] tracking-normal">
                Your table
              </h1>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:max-w-2xl">
              {controls.map((step, index) => (
                <div
                  className="flex items-start gap-3 rounded-[10px] bg-card/90 p-3 shadow-sm ring-1 ring-border backdrop-blur-sm"
                  key={step.title}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-primary/10 text-primary">
                    <step.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-mono text-[0.65rem] text-muted-foreground">
                      STEP {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="mt-0.5 text-muted-foreground text-xs leading-5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="table" className="fade-up min-w-0 flex-1">
            <GameTable />
          </section>

          <section
            aria-labelledby="rules-heading"
            className="fade-up grid gap-4 border-border/70 border-t pt-5 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-8"
          >
            <div className="grid gap-3">
              <h2
                className="font-mono text-primary text-xs tracking-normal"
                id="rules-heading"
              >
                8-BALL RULES
              </h2>
              <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {rules.map((rule, index) => (
                  <li
                    className="stagger-fade-up grid grid-cols-[2rem_1fr] items-start gap-3 rounded-[10px] bg-card/90 p-3 text-card-foreground text-sm leading-6 shadow-sm ring-1 ring-border backdrop-blur-sm"
                    key={rule}
                  >
                    <span className="grid size-7 place-items-center rounded-[6px] bg-primary/10 font-mono text-primary text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
              {stack.map((item) => (
                <span
                  className="rounded-[6px] bg-card/90 px-3 py-1.5 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border backdrop-blur-sm"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
