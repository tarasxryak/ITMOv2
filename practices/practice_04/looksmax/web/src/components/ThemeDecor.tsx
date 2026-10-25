import { useProfile } from "@/hooks/useProfile"

// Лепестки считаются без Math.random: расстановка одна и та же при каждой загрузке.
const PETALS = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  size: 11 + ((i * 7) % 13),
  duration: 12 + ((i * 5) % 9),
  delay: -((i * 3) % 15),
  drift: ((i * 29) % 90) - 45,
}))

// Декор тем, который нельзя сделать одним CSS. Неон cyberpunk целиком в index.css.
export function ThemeDecor() {
  const theme = useProfile((p) => p.theme)
  if (theme !== "sakura") return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden motion-reduce:hidden">
      {PETALS.map((petal, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${petal.x}%`,
            width: petal.size,
            height: petal.size * 0.75,
            animationDuration: `${petal.duration}s`,
            animationDelay: `${petal.delay}s`,
            ["--drift" as string]: `${petal.drift}vw`,
          }}
        />
      ))}
    </div>
  )
}
