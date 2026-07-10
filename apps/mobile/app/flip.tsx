import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { computeFlip, money } from '@kupec/core';
import { useMarket } from '../lib/market';
import { MarketScreen } from '../components/MarketScreen';
import { theme } from '../lib/theme';

export default function Flip() {
  const { rows } = useMarket();
  const flips = useMemo(() => computeFlip(rows).sort((a, b) => b.score - a.score), [rows]);

  return (
    <MarketScreen
      rows={flips}
      keyFor={(r) => `${r._path}:${r.id}`}
      emptyHint="Загрузи рынок — покажу лоты для перекупа."
      renderRow={(r) => (
        <>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.sub}>
              бери ≤ {money(r.deal)} · продай {money(r.sell)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.profit}>{money(r.profit)}</Text>
            <Text style={styles.sub}>ROI {r.roi.toFixed(0)}%</Text>
          </View>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  name: { color: theme.txt, fontSize: 15 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  profit: { color: theme.green, fontWeight: '700', fontSize: 15 },
});
