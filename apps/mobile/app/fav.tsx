import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { money, sellAdvice, targetHit, type MarketRow, type TargetType } from '@kupec/core';
import { rowKey, useMarket } from '../lib/market';
import { theme } from '../lib/theme';

export default function Fav() {
  const { favRows } = useMarket();

  if (favRows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 40 }}>🔖</Text>
        <Text style={styles.emptyTitle}>Избранное пусто</Text>
        <Text style={styles.emptyText}>
          Отметь ★ товары во вкладке «Топ» (свои на продажу, материалы на дом) и задай ценовую цель —
          тут увидишь, когда рынок её достиг.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favRows}
        keyExtractor={(r) => rowKey(r)}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item }) => <FavCard row={item} />}
      />
    </View>
  );
}

function FavCard({ row }: { row: MarketRow }) {
  const { getTarget, setTarget, toggleFav } = useMarket();
  const key = rowKey(row);
  const target = getTarget(key);
  const hit = target ? targetHit(row, target) : false;
  const advice = sellAdvice(row.avg, row.min, row.max);

  // Тип цели хранится локально, чтобы выбор «купить/продать» не терялся до ввода цены.
  const [type, setType] = useState<TargetType>(target?.type ?? 'buy');
  const setPrice = (price: number) => setTarget(key, price > 0 ? { price, type } : null);
  const pickType = (t: TargetType) => {
    setType(t);
    if (target && target.price > 0) setTarget(key, { price: target.price, type: t });
  };

  return (
    <View style={[styles.card, hit && styles.cardHit]}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable onPress={() => toggleFav(key)} hitSlop={8}>
              <Text style={{ color: theme.amber, fontSize: 16 }}>★</Text>
            </Pressable>
            <Text style={styles.name} numberOfLines={1}>
              {row.name}
            </Text>
          </View>
          <Text style={styles.sub}>
            {money(row.min)} – {money(row.max)}
            {advice ? ` · продавать ~${money(advice.fair)}` : ''}
          </Text>
        </View>
        <Text style={styles.price}>{money(row.avg)}</Text>
      </View>

      <View style={styles.targetRow}>
        <View style={styles.seg}>
          <Pressable onPress={() => pickType('buy')} style={[styles.segBtn, type === 'buy' && styles.segActive]}>
            <Text style={type === 'buy' ? styles.segTextActive : styles.segText}>купить ≤</Text>
          </Pressable>
          <Pressable onPress={() => pickType('sell')} style={[styles.segBtn, type === 'sell' && styles.segActive]}>
            <Text style={type === 'sell' ? styles.segTextActive : styles.segText}>продать ≥</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          placeholder="цена цели"
          placeholderTextColor={theme.muted}
          keyboardType="numeric"
          value={target?.price ? String(target.price) : ''}
          onChangeText={(t) => setPrice(Number(t) || 0)}
        />
        {hit && (
          <Text style={styles.hit}>🎯 достигнута</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  empty: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: theme.txt, fontSize: 18, fontWeight: '700' },
  emptyText: { color: theme.muted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.line, padding: 14, gap: 12 },
  cardHit: { borderColor: theme.green },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { color: theme.txt, fontSize: 15, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 12, marginTop: 4 },
  price: { color: theme.txt, fontSize: 18, fontWeight: '700' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 12 },
  seg: { flexDirection: 'row', backgroundColor: theme.bg, borderRadius: 8, padding: 2 },
  segBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  segActive: { backgroundColor: theme.surface2 },
  segText: { color: theme.muted, fontSize: 12 },
  segTextActive: { color: theme.txt, fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, color: theme.txt, width: 96 },
  hit: { color: theme.green, fontSize: 12, fontWeight: '700' },
});
