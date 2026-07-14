import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { money, nf } from '@kupec/core';
import { rowKey, useMarket } from '../lib/market';
import { MarketScreen } from '../components/MarketScreen';
import { theme } from '../lib/theme';

export default function Overview() {
  const { rows, isFav, toggleFav } = useMarket();
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0)),
    [rows],
  );

  return (
    <MarketScreen
      rows={sorted}
      keyFor={(r) => rowKey(r)}
      emptyHint="Нажми «Загрузить», чтобы получить данные рынка."
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

const styles = StyleSheet.create({
  name: { color: theme.txt, fontSize: 15, flex: 1 },
  money: { color: theme.green, fontWeight: '700', fontSize: 15 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
});
