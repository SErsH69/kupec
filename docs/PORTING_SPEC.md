# Спецификация переноса логики прототипа → `@kupec/core`

Карта расчётной логики `majestic_market_dashboard.html`. Все расчёты — чистые
функции без DOM/localStorage: состояние (настройки, кэш, история) передаётся
параметрами. Опорный документ для портирования; сверять формулы по нему.

## Общие константы

```
PERIOD_DAYS = 30                 // период статистики API (line 296)
CFG.BASE = 'https://api.majestic-files.net/v1/ext/marketplace'
CFG.KEY  = 'idKx6eoh4ugY05h1dkQYtjVvMsVCeGets6'   // x-api-key
CFG.LANG = 'ru'
PATHS = ['items','vehicles','houses','apartments','warehouses','offices','clothes']
```

## 1. Парсинг API → строки (`parse`, `enrich`, `num` — line 374–410)

Ответ: `{code,status,result}` **или** сразу тело. В теле — метаданные
(`serverName, serverId, lastUpdated, periodDays`) и **один массив** статистики
(первый `Array.isArray` среди ключей). Каждый элемент — сырьё с эвристическими
ключами:

- `id`: первый ключ на `id` (≠`serverId`); иначе `o.model ?? o.id`; иначе для
  одежды `'c_'+[component,drawable,texture,gender].join('_')`; иначе name/`JSON.stringify`.
- `name`: первый ключ на `name` (≠`serverName`); иначе `'#'+id`.
- `total = num(o,'totalCount','count','listed','total')`
- `sold  = num(o,'soldCount','sold','salesCount')`
- `avg   = num(o,'averagePrice','avgPrice','avg','price')`
- `min   = num(o,'minPrice','min')`, `max = num(o,'maxPrice','max')`

`num(o,...keys)` — первый ключ, где `o[k]!=null && !isNaN` → `Number`; иначе `null`.

**enrich (производные):**
```
sellRate  = total>0 ? sold/total*100 : null
turnover  = (sold!=null && avg!=null) ? sold*avg : null
spreadPct = (min>0 && max!=null) ? (max-min)/min*100 : null
perDay    = sold!=null ? sold/PERIOD_DAYS : null
```

**Импорт/детект (`ingestText`/`detectPath`/`storeJson`):** если объект содержит
ключ из `PATHS` — каждый парсится отдельным разделом. Иначе `detectPath` снимает
суффикс `Statistics` и мапит через
`STAT2PATH = {item:'items',vehicle:'vehicles',house:'houses',apartment:'apartments',warehouse:'warehouses',office:'offices',clothes:'clothes',clothing:'clothes'}`.
Кэш-ключ везде — `` `${path}@${serverId}` ``.

Крайние случаи: нет массива → `rows=[]`; отсутствующие поля → `null` (не 0).

## 2. `sellAdvice(avg,min,max)` (line 297)

```
if avg==null || !(avg>0) return null
fair = round(avg)
fast = round( (min!=null && min>avg*0.3) ? min : avg*0.85 )
top  = (max!=null && max>avg) ? round(max) : fair
```

## 3. Мастерская / крафт (`RECIPES`, `bestUnitCost`, `computeRecipes` — line 704/765/786)

`Recipe = {lvl, out, qmin, qmax, money, sec, ch:[min%,max%], ing:[[name,qty]…]}` (~47 шт).
Опции: `wsUseChance, wsSelfCraft, wsHours(20), wsTax(0), wsBudget(0)`.

**bestUnitCost(name)** — рекурсивная себестоимость единицы, `stack:Set` рвёт циклы:
```
market = idx[name]?.avg ?? null
rc = recipeByOut[name]
if rc && !stack.has(name):
    sum = Σ ing[n,q]: bestUnitCost(n).cost * q      // любой cost==null → craft=null
    craft = ok ? (sum + rc.money) / ((qmin+qmax)/2) : null
cost = (market!=null && craft!=null) ? min(market,craft) : (market ?? craft)
return {cost, market, craft}
```

**computeRecipes** (по рецепту):
```
outQty  = (qmin+qmax)/2
succ    = wsUseChance ? ((ch[0]+ch[1])/2)/100 : 1     // СРЕДНИЙ шанс, не max!
revenue = outAvg!=null ? outAvg*outQty*succ*(1-wsTax/100) : null
cost    = ingCost + rc.money                          // ingCost: см. self-craft ниже
profit  = revenue-cost;  roi = cost>0 ? profit/cost*100 : null
perHour = profit / (sec/3600)
maxCraftsTime = wsHours*3600/sec
effCrafts = (outSold!=null && outSold/outQty < maxCraftsTime) ? outSold/outQty : maxCraftsTime
weekly = profit*effCrafts;  daily = weekly/7
maxByBudget  = wsBudget>0 && cost>0 ? floor(wsBudget/cost) : Infinity
budgetCrafts = min(effCrafts, maxByBudget)
```
ingCost по ингредиенту: `unit = (wsSelfCraft && self!=null && (market==null||self<market)) ? self : market`.

Ручной крафт в таблицах (`applyCraft`, line 514): `margin=avg-cost; roi=cost>0?margin/cost*100:null; exp=sold!=null?margin*sold:null`.

## 4. Перекупка / flip (`computeFlip`, `flipScore` — line 974/969)

Опции: `flipMinDemand(5), flipTax(0)`. Кандидаты:
```
min!=null && avg!=null && avg>min
  && min >= max(100, avg*0.05)
  && (sold||0) >= minDemand
```
Расчёт:
```
perDay = perDay ?? (sold||0)/PERIOD_DAYS
deal   = round(max(min, avg*0.6))          // дно, но не глубже −40% от средней
jack   = round(min)
profit = round(avg*(1-flipTax/100) - deal)
margin = avg>0 ? profit/avg*100 : 0
roi    = deal>0 ? profit/deal*100 : 0
score  = perDay * max(0,profit)
```
Финальный фильтр `profit>0`.

## 5. Кухня (`KITCHEN_RECIPES`, `computeKitchen` — line 1126/1127)

`KitchenRecipe = {id, name, lvl, kLvl, fac, ms, exp, m, ing:[[name,amt,src]…]}` (~67).
Опции: `kitOut(10), kitTax(0)`. Блюдо сопоставляется **по id** (`byId`), ингредиенты **по имени** (`byName`).
```
ingCost = Σ ing[n,amt]: byName[n]?.avg * amt         // avg==null → в unknown[]
revenue = dishPrice!=null ? dishPrice*kitOut*(1-kitTax/100) : null   // dishPrice=byId[id].avg
profit  = revenue - ingCost
perHour = profit / (ms/3600000)
```
Без шанса, выход фиксирован `kitOut`, себестоимость только рыночная (без самокрафта).

## 6. Движения / movers (`recordSnapshot`, `trendMap`, `renderMovers` — line 1773/1787/1413)

Снимок: `p = {'{path}:{id}': round(avg)}` для `avg>0 && id!=null`.
`mjhist[serverId] = [{d:'YYYY-MM-DD', p}]`, за сегодня — перезапись, максимум **30** снимков.
```
trendMap: cur=arr[last].p, prev=arr[last-1].p
  for k in cur: if prev[k]!=null && prev[k]!==0: m[k]=(cur[k]-prev[k])/prev[k]*100
```
`renderMovers`: нужно ≥2 снимка; `minMove(3)` %; отсекает `|pct|<minMove` и `cur<=0||prev<=0`.
up (pct>0, топ-40 ↓), down (pct<0, топ-40 ↑). `trendArrow`: `|t|<0.5→"→"`, иначе `▲/▼ round(|t|)%`.

## 7. Фарм (`farmType` — line 1055)

Классификатор сырья по имени: `/руда/→Руда`, `/бревно/→Дерево`, `/мясо/→Мясо/охота`,
`FISH||/рыб/→Рыба`, `CROPS→Урожай`, иначе `null`. Прибыли не считает — фильтр
`farmType!=null && avg>0`, сортировка по `turnover`.

## 8. RL-авто (`buildRL` — line 1231)

Справочники: `VEHNAMES[code]={g,i,gos}`, `VEHBYREAL[realLower]={g,gos}`,
`VEHMARKET[code]=realName`, `REAL_BRANDS` (~60), `VSPEC[code]={spd,trunk,fuel,cls,ft}`.
Собирает `{code,real,game,gos}` только для реальных брендов
(`realLower.startsWith(brand)`), `gos = VEHNAMES[code].gos ?? VEHBYREAL[realLower].gos ?? null`.
Опции `rlPay('cash')`, `rlSort(1)`. Формул нет — сопоставление и сортировка.

## 9. Бюджет (`renderBudget` — line 1371)

Жадный планировщик перекупа, `budgetVal(1000000)`:
```
cands = computeFlip().filter(deal>0 && profit>0).sort(roi ↓)
left=budget; for r in cands:
   if left<r.deal continue
   demCap = max(1, round(perDay*3));  afford = floor(left/deal)
   units  = min(afford, demCap);  if units<1 continue
   plan.push({...r, units, cost:units*deal, prof:units*profit})
   left-=cost; if left<1000 break
roiTot = invested>0 ? expProfit/invested*100 : 0
```

## 10. Справочные данные (вшиты снимком)

| Переменная | Формат | ~шт |
|---|---|---|
| `RECIPES` | `{lvl,out,qmin,qmax,money,sec,ch:[min,max],ing:[[name,qty]…]}` | 47 |
| `KITCHEN_RECIPES` | `{id,name,lvl,kLvl,fac,ms,exp,m,ing:[[name,amt,src]…]}` | 67 |
| `GOV_DATA` | строки `\n`, поля `\|`: `name\|cat\|min\|max\|pmin\|pmax` | 209 |
| `JOBS_DATA` | `name\|lvl\|legal\|ranks` (ranks через `/`) | 23 |
| `VEHNAMES/VEHBYREAL/VEHMARKET/VSPEC` | справочники транспорта | — |
| `FISH/CROPS/VEG/FRUIT/GROCERY` | `Set<string>` классификаторов | — |

## Самое хрупкое при переносе

1. **Средний, а не максимальный шанс**: `succ=(ch[0]+ch[1])/2/100`.
2. Рекурсия `bestUnitCost` с защитой циклов через `stack:Set`.
3. `deal = max(min, avg*0.6)` во flip.
4. Отсечка `cur>0 && prev>0` в movers.
5. Кухня: блюдо — по `id`, ингредиенты — по `name`.
