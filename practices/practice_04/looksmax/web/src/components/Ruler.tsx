import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

export type RulerTone = "winner" | "wrong" | "neutral"

const FILL: Record<RulerTone, string> = {
  winner: "bg-fresh",
  wrong: "bg-tomato",
  neutral: "bg-foreground/45",
}

// Линейка как у ростомера: полоса растёт до значения. Чем выше значение, тем дольше растёт,
// так что победитель добегает последним. value — от 0 до 1.
export function Ruler({ value, tone, delay = 0, className }: { value: number; tone: RulerTone; delay?: number; className?: string }) {
  const reduced = useReducedMotion()
  const width = `${Math.min(1, Math.max(0, value)) * 100}%`
  return (
    <div className={cn("relative h-3.5 overflow-hidden rounded-full bg-muted", className)} aria-hidden="true">
      <motion.div
        className={cn("h-full rounded-full", FILL[tone])}
        initial={{ width: reduced ? width : 0 }}
        animate={{ width }}
        transition={{ duration: reduced ? 0 : 0.5 + value * 1.1, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      />
      {[25, 50, 75].map((tick) => (
        <span key={tick} className="absolute top-0 h-full w-px bg-background/70" style={{ left: `${tick}%` }} />
      ))}
    </div>
  )
}
