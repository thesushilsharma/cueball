import { ArrowLeft, Gauge } from "lucide-react";
import Link from "next/link";
import { GameRulesDrawer } from "@/components/game-rules-drawer";
import { GameTable } from "@/components/game-table";

const howToPlay =
  "Drag from the cue ball, pull back for power, read the gold and colored paths, then release to shoot.";

const rules = [
  "Pocket a ball after the break to claim solids or stripes.",
  "Strike your own group first — hitting the opponent's ball first is a foul.",
  "Clear your group before the black 8-ball.",
  "Pocket the 8-ball last to win.",
] as const;

export default function GamePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-border/60 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="interactive-press inline-flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 text-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-muted">
              <ArrowLeft className="size-4 text-muted-foreground" aria-hidden />
            </span>
            <span className="font-medium">Cueball</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 font-mono text-muted-foreground text-xs sm:inline-flex">
              <Gauge className="size-3.5 text-primary" aria-hidden />
              120 hz
            </span>
            <GameRulesDrawer rules={rules} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">8-Ball</h1>
          <p className="max-w-xl text-muted-foreground text-sm leading-6">
            {howToPlay}
          </p>
        </div>

        <section className="min-w-0 flex-1" id="table">
          <GameTable />
        </section>
      </main>
    </div>
  );
}
