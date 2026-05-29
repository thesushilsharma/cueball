import { CircleDot, Gauge } from "lucide-react";
import Link from "next/link";
import { GameTable } from "@/components/game-table";

const rules = [
  "Pocket a ball after the break to claim solids or stripes.",
  "Always strike your own group first; hitting the opponent's ball first is a foul.",
  "Clear every ball in your group before taking on the black 8-ball.",
  "Legally pocket the black ball last to win the frame.",
];

const stack = [
  "Next.js",
  "PixiJS renderer",
  "physics functions",
  "WASM-ready core",
];

export default function GamePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid min-h-dvh w-full max-w-7xl content-start gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-border border-b pb-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[8px] bg-card shadow-sm ring-1 ring-border">
              <CircleDot className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold text-sm">Cueball</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-[8px] bg-card px-3 py-2 font-mono text-muted-foreground text-xs ring-1 ring-border sm:flex">
            <Gauge className="size-4 text-primary" aria-hidden="true" />
            120 hz loop
          </div>
        </header>

        <main className="grid gap-5">
          <section className="grid gap-4 lg:grid-cols-[0.55fr_1fr] lg:items-end">
            <div>
              <p className="font-mono text-primary text-xs tracking-normal">
                PLAYABLE 8-BALL TABLE
              </p>
              <h1 className="mt-2 max-w-3xl font-semibold text-[clamp(2.15rem,5vw,4.25rem)] leading-[0.94] tracking-normal">
                Real table feel, PixiJS speed.
              </h1>
            </div>
            <p className="max-w-2xl text-muted-foreground text-sm leading-6 lg:justify-self-end">
              PixiJS handles the table rendering while the shared physics
              functions advance the balls through a fixed-step simulation. The
              core stays separated so it can move cleanly into WebAssembly,
              while the game follows the familiar 8-Ball flow: groups first,
              black ball last.
            </p>
          </section>

          <section id="table" className="grid gap-3">
            <GameTable />
          </section>

          <section className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="grid gap-2">
              <h2 className="font-mono text-primary text-xs tracking-normal">
                8-BALL RULES
              </h2>
              <ol className="grid gap-2 md:grid-cols-4">
                {rules.map((rule, index) => (
                  <li
                    className="grid grid-cols-[2rem_1fr] items-start gap-3 rounded-[8px] bg-card p-3 text-card-foreground text-sm leading-6 ring-1 ring-border"
                    key={rule}
                  >
                    <span className="font-mono text-primary text-xs">
                      0{index + 1}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
              {stack.map((item) => (
                <span
                  className="rounded-[6px] bg-card px-3 py-1.5 font-mono text-muted-foreground text-xs ring-1 ring-border"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}
