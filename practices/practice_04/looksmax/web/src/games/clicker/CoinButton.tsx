import { useRef, useState, type MouseEvent } from "react"
import { shekelsWord } from "@/lib/format"

type Popup = { id: number; x: number; y: number; value: number }

// Большая монета: клик отвечает всплывающим «+N» там, где нажали. Это ответ на действие, а не фоновая анимация.
export function CoinButton({ power, onClick }: { power: number; onClick: () => void }) {
  const [popups, setPopups] = useState<Popup[]>([])
  const nextId = useRef(0)
  const wrapper = useRef<HTMLDivElement>(null)

  const handle = (event: MouseEvent<HTMLButtonElement>) => {
    onClick()
    const rect = wrapper.current!.getBoundingClientRect()
    // Клик с клавиатуры приходит без координат мыши (detail === 0): всплываем из центра.
    const keyboard = event.detail === 0
    const id = nextId.current++
    const popup = {
      id,
      x: keyboard ? rect.width / 2 : event.clientX - rect.left,
      y: keyboard ? rect.height / 2 : event.clientY - rect.top,
      value: power,
    }
    setPopups((current) => [...current.slice(-14), popup])
    setTimeout(() => setPopups((current) => current.filter((p) => p.id !== id)), 800)
  }

  return (
    <div ref={wrapper} className="relative mx-auto w-fit select-none">
      <button type="button" onClick={handle} className="coin-button" aria-label={`Кликнуть: +${power} ${shekelsWord(power)}`}>
        <span aria-hidden="true">₪</span>
      </button>
      {popups.map((popup) => (
        <span
          key={popup.id}
          aria-hidden="true"
          className="coin-popup pointer-events-none absolute font-display text-2xl font-extrabold text-foreground"
          style={{ left: popup.x, top: popup.y }}
        >
          +{popup.value}
        </span>
      ))}
    </div>
  )
}
