import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { journalSummary, money, tradePnl, type Trade } from '@kupec/core';
import { useJournal } from '../lib/journal';
import { theme } from '../lib/theme';

export default function Journal() {
  const { trades, synced, addTrade, closeTrade, deleteTrade, scope, setScope, group } = useJournal();
  const [groupOpen, setGroupOpen] = useState(false);
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

      {synced && (
        <View style={styles.scopeRow}>
          {group && (
            <View style={styles.scopeSwitch}>
              <Pressable
                style={[styles.scopeBtn, scope === 'mine' && styles.scopeBtnOn]}
                onPress={() => setScope('mine')}
              >
                <Text style={[styles.scopeText, scope === 'mine' && styles.scopeTextOn]}>Мой</Text>
              </Pressable>
              <Pressable
                style={[styles.scopeBtn, scope === 'group' && styles.scopeBtnOn]}
                onPress={() => setScope('group')}
              >
                <Text style={[styles.scopeText, scope === 'group' && styles.scopeTextOn]} numberOfLines={1}>
                  👥 {group.name}
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable onPress={() => setGroupOpen(true)}>
            <Text style={styles.groupLink}>{group ? '👥 Группа' : '👥 Создать группу'}</Text>
          </Pressable>
        </View>
      )}

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
                {t.author && <Text style={styles.author}>{t.author}</Text>}
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

      <GroupModal visible={groupOpen} onClose={() => setGroupOpen(false)} />

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

/** Создание/вступление в группу и список участников. */
function GroupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { group, members, createGroup, joinGroup, leaveGroup } = useJournal();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) => {
    setError(null);
    fn().catch((e) => setError(e instanceof Error ? e.message : 'Не вышло'));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{group ? `Группа «${group.name}»` : 'Общий журнал'}</Text>

          {group ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.statLabel}>Код приглашения</Text>
              <Text style={styles.code}>{group.inviteCode}</Text>
              <Text style={styles.statLabel}>Участники ({members.length})</Text>
              {members.map((m) => (
                <Text key={m.id} style={styles.member}>
                  {m.email}
                  {m.id === group.ownerId ? '  · владелец' : ''}
                </Text>
              ))}
              <Pressable onPress={() => run(async () => { await leaveGroup(); onClose(); })}>
                <Text style={styles.del}>Выйти из группы</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={styles.sub}>
                Один журнал на нескольких игроков: видно, кто что скрафтил и продал.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Название своей группы"
                placeholderTextColor={theme.muted}
                value={name}
                onChangeText={setName}
              />
              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}
                onPress={() => name.trim() && run(async () => { await createGroup(name); })}
              >
                <Text style={styles.addBtnText}>Создать</Text>
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="Или код приглашения"
                placeholderTextColor={theme.muted}
                autoCapitalize="characters"
                value={code}
                onChangeText={setCode}
              />
              <Pressable
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => code.trim() && run(async () => { await joinGroup(code); })}
              >
                <Text style={styles.btnGhostText}>Вступить</Text>
              </Pressable>
            </View>
          )}

          {error && <Text style={[styles.del, { color: theme.red, marginTop: 8 }]}>{error}</Text>}

          <Pressable style={[styles.modalBtn, styles.modalGhost, { marginTop: 12 }]} onPress={onClose}>
            <Text style={styles.btnGhostText}>Закрыть</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeSwitch: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 2, flex: 1 },
  scopeBtn: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  scopeBtnOn: { backgroundColor: theme.line },
  scopeText: { color: theme.muted, fontSize: 12 },
  scopeTextOn: { color: theme.txt, fontWeight: '700' },
  groupLink: { color: theme.accent2, fontSize: 12 },
  author: { color: theme.muted, fontSize: 11, marginTop: 2 },
  code: { color: theme.txt, fontSize: 22, fontWeight: '700', letterSpacing: 4 },
  member: { color: theme.txt, fontSize: 13 },
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
