import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { money, nf } from '@kupec/core';
import { useMarket } from '../lib/market';
import { MarketScreen } from '../components/MarketScreen';
import { theme } from '../lib/theme';

export default function Overview() {
  const { rows } = useMarket();
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0)),
    [rows],
  );

  return (
    <MarketScreen
      rows={sorted}
      keyFor={(r) => `${r._path}:${r.id}`}
      emptyHint="Нажми «Загрузить», чтобы получить данные рынка."
      renderRow={(item) => (
        <>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.money}>{money(item.turnover)}</Text>
            <Text style={styles.sub}>{nf(item.sold)} продано</Text>
          </View>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  name: { color: theme.txt, fontSize: 15, flex: 1 },
  money: { color: theme.green, fontWeight: '700', fontSize: 15 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
});
