"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type GameRulesDrawerProps = {
  rules: readonly string[];
};

export function GameRulesDrawer({ rules }: GameRulesDrawerProps) {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button className="normal-case tracking-normal" size="sm" variant="outline">
          <BookOpen aria-hidden="true" />
          Rules
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full max-h-dvh">
        <DrawerHeader className="border-border/60 border-b">
          <DrawerTitle>8-Ball rules</DrawerTitle>
          <DrawerDescription>
            Quick reference while you play this table.
          </DrawerDescription>
        </DrawerHeader>

        <ol className="flex-1 space-y-4 overflow-y-auto px-4 py-5 text-sm leading-6">
          {rules.map((rule, index) => (
            <li className="flex gap-3" key={rule}>
              <span className="font-mono text-primary text-xs tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground">{rule}</span>
            </li>
          ))}
        </ol>

        <DrawerFooter className="border-border/60 border-t">
          <DrawerClose asChild>
            <Button
              className="interactive-press w-full normal-case tracking-normal"
              variant="outline"
            >
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
