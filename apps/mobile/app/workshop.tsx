import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { computeRecipes, money } from '@kupec/core';
import { useMarket } from '../lib/market';
import { MarketScreen } from '../components/MarketScreen';
import { theme } from '../lib/theme';

export default function Workshop() {
  const { items } = useMarket();
  // Только рецепты с известной ценой выхода; по прибыли за час.
  const recipes = useMemo(
    () =>
      computeRecipes(items)
        .filter((r) => !r.outUnknown && r.profit != null)
        .sort((a, b) => (b.perHour ?? 0) - (a.perHour ?? 0)),
    [items],
  );

  return (
    <MarketScreen
      rows={recipes}
      keyFor={(r) => r.out}
      emptyHint="Загрузи рынок — посчитаю выгоду крафта."
      renderRow={(r) => (
        <>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {r.out}
            </Text>
            <Text style={styles.sub}>
              себест. {money(r.cost)} · {money(r.perHour)}/ч
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.profit, { color: (r.profit ?? 0) >= 0 ? theme.green : theme.red }]}>
              {money(r.profit)}
            </Text>
            <Text style={styles.sub}>ROI {r.roi != null ? r.roi.toFixed(0) + '%' : '—'}</Text>
          </View>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  name: { color: theme.txt, fontSize: 15 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  profit: { fontWeight: '700', fontSize: 15 },
});
