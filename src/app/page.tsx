import { ArrowRight, CircleDot, Gauge, Waves } from "lucide-react";
import { GithubLight } from "@/components/ui/svgs/githubLight";

const metrics = [
  { label: "simulation step", value: "120 hz" },
  { label: "render target", value: "60 fps" },
  { label: "physics core", value: "wasm" },
];

const stack = ["Next.js", "PixiJS", "WebAssembly", "Deterministic physics"];

export default function Home() {
  return (
    <div className="min-h-screen bg-muted text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-border border-b py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-[10px] bg-card shadow-sm ring-1 ring-border">
              <CircleDot
                className="size-4 text-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="font-semibold text-sm tracking-normal">Cueball</span>
          </div>
          <a
            href="https://github.com"
            className="inline-flex size-9 items-center justify-center rounded-[10px] bg-card text-foreground shadow-sm ring-1 ring-border transition hover:ring-ring/35 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            aria-label="Open GitHub"
          >
            <GithubLight className="size-4" aria-hidden="true" />
          </a>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)] lg:gap-14">
          <div className="max-w-3xl">
            <p className="mb-5 font-mono text-muted-foreground text-xs tracking-normal">
              HIGH-PERFORMANCE BILLIARDS SIMULATION
            </p>
            <h1 className="max-w-4xl text-pretty font-semibold text-[clamp(3rem,8vw,3.75rem)] leading-[0.98] tracking-normal">
              Precision pool physics in a glass-clear web stack.
            </h1>
            <p className="mt-6 max-w-2xl text-[0.95rem] text-muted-foreground leading-[1.55]">
              Cueball separates rendering from simulation, pairing a WASM
              physics core with a modern Next.js interface for smooth,
              repeatable play.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#simulation"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 font-semibold text-primary-foreground text-sm transition hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              >
                View simulation
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <div className="inline-flex h-12 items-center justify-center rounded-[10px] bg-card px-5 text-muted-foreground text-sm shadow-sm ring-1 ring-border">
                Alpha preview
              </div>
            </div>
          </div>

          <div
            id="simulation"
            className="rounded-[16px] bg-card p-4 shadow-sm ring-1 ring-border sm:p-6"
          >
            <div className="relative aspect-4/3 overflow-hidden rounded-[10px] bg-muted ring-1 ring-border">
              <div className="absolute inset-6 rounded-[10px] border border-border bg-card">
                <div className="absolute inset-4 rounded-[6px] border border-border/70" />
                <div className="absolute top-[28%] left-[24%] size-7 rounded-full bg-foreground shadow-[0_18px_30px_rgba(15,20,25,0.18)]" />
                <div className="absolute top-[45%] left-[49%] size-8 rounded-full bg-card shadow-[0_20px_32px_rgba(15,20,25,0.16)] ring-1 ring-border" />
                <div className="absolute right-[22%] bottom-[24%] size-6 rounded-full bg-muted-foreground" />
                <div className="absolute top-[15%] right-[18%] size-5 rounded-full border border-border bg-muted" />
                <div className="absolute top-[49%] left-[54%] h-px w-[30%] origin-left rotate-[-22deg] bg-primary" />
              </div>
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-[6px] bg-card px-3 py-2 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border">
                <Waves className="size-3.5" aria-hidden="true" />
                stable trajectory
              </div>
              <div className="absolute right-4 bottom-4 flex items-center gap-2 rounded-[6px] bg-card px-3 py-2 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border">
                <Gauge className="size-3.5" aria-hidden="true" />
                0.8 ms step
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[10px] bg-muted p-4">
                  <div className="font-mono text-muted-foreground text-xs tracking-normal">
                    {metric.label}
                  </div>
                  <div className="mt-2 font-semibold text-2xl">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="grid gap-3 border-border border-t py-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-muted-foreground text-sm">
            Built for clean separation between rendering, simulation, and input.
          </p>
          <div className="flex flex-wrap gap-2">
            {stack.map((item) => (
              <span
                key={item}
                className="rounded-[6px] bg-card px-3 py-1.5 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border"
              >
                {item}
              </span>
            ))}
          </div>
        </footer>
      </section>
    </div>
  );
}
