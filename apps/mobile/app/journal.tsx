import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { journalSummary, money, tradePnl, type Trade } from '@kupec/core';
import { useJournal } from '../lib/journal';
import { theme } from '../lib/theme';

export default function Journal() {
  const { trades, synced, addTrade, closeTrade, deleteTrade } = useJournal();
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [buy, setBuy] = useState('');
  const [closing, setClosing] = useState<Trade | null>(null);
  const [sell, setSell] = useState('');

  const summary = useMemo(() => journalSummary(trades), [trades]);

  const add = () => {
    const q = Number(qty) || 0;
    const b = Number(buy) || 0;
    if (!item.trim() || q <= 0 || b <= 0) return;
    addTrade({ item: item.trim(), qty: q, buy: b });
    setItem('');
    setQty('');
    setBuy('');
  };

  const confirmClose = () => {
    const s = Number(sell) || 0;
    if (closing && s > 0) closeTrade(closing.id, s);
    setClosing(null);
    setSell('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <Stat label="Открыто" value={String(summary.open)} sub={money(summary.invested)} />
        <Stat
          label="Реализовано"
          value={money(summary.realized)}
          color={summary.realized >= 0 ? theme.green : theme.red}
        />
        <Stat label="ROI" value={`${summary.roi.toFixed(0)}%`} color={theme.accent2} />
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Товар"
          placeholderTextColor={theme.muted}
          value={item}
          onChangeText={setItem}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Кол-во"
          placeholderTextColor={theme.muted}
          keyboardType="numeric"
          value={qty}
          onChangeText={setQty}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Цена"
          placeholderTextColor={theme.muted}
          keyboardType="numeric"
          value={buy}
          onChangeText={setBuy}
        />
        <Pressable style={styles.addBtn} onPress={add}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
      {!synced && <Text style={styles.localHint}>Локально. Войди в «Аккаунт» — синхронизируется.</Text>}

      <FlatList
        data={trades}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: t }) => {
          const p = tradePnl(t);
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {t.item}
                </Text>
                <Text style={styles.sub}>
                  {t.qty} шт · {money(t.buy)}
                  {t.sell != null ? ` → ${money(t.sell)}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {p.pnl == null ? (
                  <Text style={styles.open}>в рынке</Text>
                ) : (
                  <Text style={[styles.pnl, { color: p.pnl >= 0 ? theme.green : theme.red }]}>
                    {money(p.pnl)} · {p.roi!.toFixed(0)}%
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {p.open && (
                    <Pressable onPress={() => setClosing(t)}>
                      <Text style={styles.sell}>Продать</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => deleteTrade(t.id)}>
                    <Text style={styles.del}>Удалить</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Журнал пуст. Добавь сделку выше.</Text>}
      />

      <Modal visible={!!closing} transparent animationType="fade" onRequestClose={() => setClosing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Продать: {closing?.item}</Text>
            <TextInput
              style={styles.input}
              placeholder="Цена продажи за шт."
              placeholderTextColor={theme.muted}
              keyboardType="numeric"
              value={sell}
              onChangeText={setSell}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable style={[styles.modalBtn, styles.modalGhost]} onPress={() => setClosing(null)}>
                <Text style={styles.btnGhostText}>Отмена</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: theme.green }]} onPress={confirmClose}>
                <Text style={styles.addBtnText}>Закрыть сделку</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 12, gap: 10 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12 },
  statLabel: { color: theme.muted, fontSize: 11, textTransform: 'uppercase' },
  statValue: { color: theme.txt, fontSize: 18, fontWeight: '700', marginTop: 2 },
  statSub: { color: theme.muted, fontSize: 11, marginTop: 2 },
  form: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: theme.txt,
  },
  addBtn: { backgroundColor: theme.accent, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  localHint: { color: theme.muted, fontSize: 11 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    gap: 12,
  },
  name: { color: theme.txt, fontSize: 15 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  open: { color: theme.muted, fontSize: 13 },
  pnl: { fontWeight: '700', fontSize: 14 },
  sell: { color: theme.green, fontSize: 12, fontWeight: '600' },
  del: { color: theme.muted, fontSize: 12 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 32 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.line, padding: 16 },
  modalTitle: { color: theme.txt, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  modalGhost: { borderWidth: 1, borderColor: theme.line },
  btnGhostText: { color: theme.txt, fontWeight: '600' },
});
