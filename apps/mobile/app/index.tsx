import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { computeFlip, computeRecipes, money, nf } from '@kupec/core';
import { rowKey, useMarket } from '../lib/market';
import { MarketScreen } from '../components/MarketScreen';
import { theme } from '../lib/theme';

export default function Overview() {
  const router = useRouter();
  const { rows, items, isFav, toggleFav } = useMarket();
  const [budget, setBudget] = useState('');
  const cap = Number(budget) || Infinity;

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0)),
    [rows],
  );

  // Лучшее по карману: перекуп по цене покупки, крафт по себестоимости.
  const flip = useMemo(
    () => computeFlip(rows).filter((f) => f.deal <= cap).sort((a, b) => b.score - a.score)[0],
    [rows, cap],
  );
  const craft = useMemo(
    () =>
      computeRecipes(items, { useChance: true, selfCraft: true })
        .filter((r) => (r.weekly ?? 0) > 0 && r.ch[1] >= 30 && r.cost <= cap)
        .sort((a, b) => (b.weekly ?? 0) - (a.weekly ?? 0))[0],
    [items, cap],
  );

  const header =
    rows.length === 0 ? null : (
      <View style={{ marginBottom: 8 }}>
        <View style={styles.headRow}>
          <Text style={styles.headTitle}>💡 С чего начать</Text>
          <View style={styles.budget}>
            <Text style={styles.budgetLabel}>бюджет</Text>
            <TextInput
              style={styles.budgetInput}
              keyboardType="numeric"
              placeholder="любой"
              placeholderTextColor={theme.muted}
              value={budget}
              onChangeText={setBudget}
            />
          </View>
        </View>

        {(flip || craft) && (
          <View style={{ gap: 8, marginBottom: 12 }}>
            {flip && (
              <ActionCard
                icon="💱"
                title="Перекуп"
                item={flip.name}
                profit={`+${money(flip.profit)}`}
                sub="со штуки"
                lines={[`Купи ≤ ${money(flip.deal)} → продай ~ ${money(flip.sell)}`, `Спрос ${flip.perDay.toFixed(0)}/день`]}
                onOpen={() => router.push('/flip')}
              />
            )}
            {craft && (
              <ActionCard
                icon="🔨"
                title="Крафт"
                item={craft.out}
                profit={money(craft.perHour)}
                sub="в час"
                lines={[`Профит ${money(craft.profit)}/крафт · себест. ${money(craft.cost)}`, `Шанс ${craft.ch[0]}–${craft.ch[1]}%`]}
                onOpen={() => router.push('/workshop')}
              />
            )}
          </View>
        )}

        <Text style={styles.secTitle}>📊 Самое ходовое на рынке</Text>
      </View>
    );

  return (
    <MarketScreen
      rows={sorted}
      keyFor={(r) => rowKey(r)}
      emptyHint="Нажми «Загрузить», чтобы получить данные рынка."
      header={header}
      renderRow={(item) => {
        const k = rowKey(item);
        const fav = isFav(k);
        return (
          <>
            <Pressable onPress={() => toggleFav(k)} hitSlop={8} style={{ marginRight: 8 }}>
              <Text style={{ fontSize: 18, color: fav ? theme.amber : theme.muted }}>
                {fav ? '★' : '☆'}
              </Text>
            </Pressable>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.money}>{money(item.turnover)}</Text>
              <Text style={styles.sub}>{nf(item.sold)} продано</Text>
            </View>
          </>
        );
      }}
    />
  );
}

function ActionCard({
  icon,
  title,
  item,
  profit,
  sub,
  lines,
  onOpen,
}: {
  icon: string;
  title: string;
  item: string;
  profit: string;
  sub: string;
  lines: string[];
  onOpen: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTag}>
          {icon} {title}
        </Text>
        <Text style={styles.open}>Открыть →</Text>
      </View>
      <Text style={styles.cardItem} numberOfLines={1}>
        {item}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={styles.cardProfit}>{profit}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      {lines.map((l, i) => (
        <Text key={i} style={styles.cardLine} numberOfLines={1}>
          {l}
        </Text>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { color: theme.txt, fontSize: 15, flex: 1 },
  money: { color: theme.green, fontWeight: '700', fontSize: 15 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  headTitle: { color: theme.txt, fontSize: 15, fontWeight: '700' },
  budget: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetLabel: { color: theme.muted, fontSize: 12 },
  budgetInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: theme.txt,
    minWidth: 90,
    textAlign: 'right',
    fontSize: 13,
  },
  card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 12, gap: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTag: { color: theme.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  open: { color: theme.accent2, fontSize: 12 },
  cardItem: { color: theme.txt, fontSize: 16, fontWeight: '700', marginTop: 2 },
  cardProfit: { color: theme.green, fontSize: 20, fontWeight: '800' },
  cardLine: { color: theme.muted, fontSize: 12, marginTop: 1 },
  secTitle: { color: theme.txt, fontSize: 14, fontWeight: '700' },
});
