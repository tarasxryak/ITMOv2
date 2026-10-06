import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HINT_COST } from "@/lib/game"
import { KCAL_CAP, MAX_PER_CATEGORY, POOL_SIZE } from "@/lib/basket"

export type Mode = "duel" | "basket" | "clicker"

export function RulesDialog({ mode }: { mode: Mode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Как играть">
          <CircleHelp aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">
            {{ duel: "Как играть в дуэль", basket: "Как играть в корзину", clicker: "Как играть в кликер" }[mode]}
          </DialogTitle>
          <DialogDescription>
            {{
              duel: "Десять раундов, в каждом три случайных товара ВкусВилла из разных категорий.",
              basket: `Тебе дают ${POOL_SIZE} случайных товаров и бюджет. Нужно набрать корзину с максимумом белка.`,
              clicker: "Криптошекели общие для всех игр: заработал в одной, потратил в другой.",
            }[mode]}
          </DialogDescription>
        </DialogHeader>
        {mode === "clicker" ? (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Каждый клик по монете даёт криптошекели. Улучшение «Сила клика» добавляет по одному за клик.</li>
            <li>Автокликеры дают криптошекели каждую секунду, пока открыта страница. Каждая следующая копия дороже предыдущей на 15 %.</li>
            <li>За криптошекели покупаются темы сайта: Сакура и Cyberpunk. Купленная тема включается сразу.</li>
            <li>Прогресс и темы хранятся в этом браузере.</li>
          </ul>
        ) : mode === "duel" ? (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Выбери товар, в котором больше белка на калорию. Скор = белки × 4 / ккал: доля калорий, которая приходится на белок.</li>
            <li>Победитель в раунде один: его скор выше второго места минимум на 0,03.</li>
            <li>Верный ответ даёт 10 криптошекелей, а начиная с третьего верного подряд ещё 5 за каждый.</li>
            <li>Подсказка за {HINT_COST} криптошекелей убирает один неверный вариант. Баланс в минус не уходит.</li>
            <li>В конце ты получаешь ранг от sub3 до true adam и корзину из своих выборов.</li>
          </ul>
        ) : (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Каждый товар можно взять один раз, не больше {MAX_PER_CATEGORY} из одной категории: десять куриных грудок не получится.</li>
            <li>Весовой товар, например курица, берётся порцией 500 г.</li>
            <li>Корзина не должна выходить за бюджет и за {KCAL_CAP} ккал.</li>
            <li>Лучшую корзину находит полный перебор. Твой результат — доля её белка, а ранг считается по той же лестнице, что и в дуэли.</li>
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
