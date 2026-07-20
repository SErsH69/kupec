import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  computeGoal,
  findRealty,
  maxLevel,
  mergePlans,
  money,
  REALTIES,
  upgradePlan,
  UPGRADE_LABEL,
  type GoalItemResult,
  type UpgradeKind,
} from '@kupec/core';
import { useMarket } from '../lib/market';
import { theme } from '../lib/theme';

/**
 * Цели: проекты прокачки. Что нужно, сколько уже есть, где брать дешевле
 * (рынок или крафт) и сколько осталось вложить. Всё поверх core/computeGoal.
 */
export default function Goals() {
  const { goals, rows, addGoal, addGoalWithItems, removeGoal, setGoalItem, removeGoalItem } = useMarket();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [houseOpen, setHouseOpen] = useState(false);

  useEffect(() => {
    if (goals.length === 0) setActiveId(null);
    else if (!goals.some((g) => g.id === activeId)) setActiveId(goals[0]!.id);
  }, [goals, activeId]);

  const goal = goals.find((g) => g.id === activeId) ?? null;
  const result = useMemo(() => (goal ? computeGoal(goal, rows) : null), [goal, rows]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {goals.map((g) => (
          <Pressable
            key={g.id}
            style={[styles.tab, g.id === activeId && styles.tabOn]}
            onPress={() => setActiveId(g.id)}
          >
            <Text style={[styles.tabText, g.id === activeId && styles.tabTextOn]}>{g.name}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.tab, styles.tabAdd]} onPress={() => setHouseOpen(true)}>
          <Text style={styles.addBtnText}>🏠 Прокачка дома</Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setNewOpen(true)}>
          <Text style={styles.tabText}>+ Пустой</Text>
        </Pressable>
      </ScrollView>

      {!goal || !result ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Пока нет проектов</Text>
          <Text style={styles.sub}>
            Проект — список материалов под задачу: прокачать дом, собрать на машину. Посчитаем, чего
            не хватает, где дешевле — рынок или крафт — и сколько ещё вложить.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => setHouseOpen(true)}>
            <Text style={styles.addBtnText}>🏠 Посчитать прокачку дома</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="Готово" value={`${Math.round(result.progress * 100)}%`} sub={`${result.totalHave}/${result.totalNeed} шт`} />
            <Stat label="Осталось" value={money(result.remainingCost)} color={theme.accent2} />
            <Stat label="Целиком" value={money(result.totalCost)} />
          </View>

          <View style={styles.barBg}>
            <View
              style={[
                styles.bar,
                { width: `${Math.round(result.progress * 100)}%`, backgroundColor: result.done ? theme.green : theme.accent },
              ]}
            />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={() => setItemOpen(true)}>
              <Text style={styles.addBtnText}>+ Материал</Text>
            </Pressable>
            <Pressable onPress={() => removeGoal(goal.id)}>
              <Text style={styles.del}>Удалить проект</Text>
            </Pressable>
          </View>

          <FlatList
            data={result.items}
            keyExtractor={(i) => i.name}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <ItemRow
                it={item}
                onHave={(have) => setGoalItem(goal.id, { name: item.name, need: item.need, have })}
                onRemove={() => removeGoalItem(goal.id, item.name)}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyList}>Добавь материалы проекта.</Text>}
          />
        </>
      )}

      <NameModal
        visible={newOpen}
        title="Новый проект"
        placeholder="Напр. Прокачка дома"
        onClose={() => setNewOpen(false)}
        onSave={(n) => {
          addGoal(n);
          setNewOpen(false);
        }}
      />

      <HouseUpgradeModal
        visible={houseOpen}
        onClose={() => setHouseOpen(false)}
        onCreate={(name, items) => {
          addGoalWithItems(name, items);
          setHouseOpen(false);
        }}
      />

      {goal && (
        <ItemModal
          visible={itemOpen}
          onClose={() => setItemOpen(false)}
          onSave={(it) => {
            setGoalItem(goal.id, it);
            setItemOpen(false);
          }}
        />
      )}
    </View>
  );
}

function ItemRow({
  it,
  onHave,
  onRemove,
}: {
  it: GoalItemResult;
  onHave: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.row, it.done && { opacity: 0.6 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {it.done ? '✓ ' : ''}
          {it.name}
        </Text>
        <Text style={styles.sub}>
          осталось {it.left} из {it.need} ·{' '}
          {it.via === 'craft' ? 'крафт' : it.via === 'buy' ? 'рынок' : 'нет цены'}
          {it.unit != null ? ` ${money(it.unit)}/шт` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.lineCost}>{it.lineCost != null ? money(it.lineCost) : '—'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            style={styles.haveInput}
            keyboardType="numeric"
            value={String(it.have)}
            onChangeText={(v) => onHave(Math.max(0, Number(v) || 0))}
          />
          <Pressable onPress={onRemove}>
            <Text style={styles.del}>✕</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ---------------- прокачка дома ---------------- */

const KINDS: UpgradeKind[] = ['workshop', 'kitchen', 'pantry', 'garage'];

/** Мастер прокачки: номер дома → уровни → материалы → проект. */
function HouseUpgradeModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, items: { name: string; need: number; have: number }[]) => void;
}) {
  const [type, setType] = useState<'house' | 'apartment'>('house');
  const [num, setNum] = useState('');
  const [picker, setPicker] = useState(false);
  const [from, setFrom] = useState<Record<UpgradeKind, number>>({ workshop: 0, kitchen: 1, pantry: 1, garage: 1 });
  const [to, setTo] = useState<Record<UpgradeKind, number>>({ workshop: 0, kitchen: 1, pantry: 1, garage: 1 });

  const realty = useMemo(() => {
    const n = Number(num);
    return n > 0 ? findRealty(n, type) : undefined;
  }, [num, type]);

  const kinds = type === 'apartment' ? (['kitchen', 'pantry'] as UpgradeKind[]) : KINDS;
  const plans = useMemo(
    () => kinds.map((k) => upgradePlan(k, from[k], to[k], realty?.garageSlots)).filter((p) => p.steps.length > 0),
    [kinds, from, to, realty],
  );
  const total = useMemo(() => mergePlans(plans), [plans]);

  // Дома без роялти, дороже — выше.
  const noRoyalty = useMemo(
    () =>
      REALTIES.filter((r) => r.type === type && r.royaltyCoins === 0)
        .sort((a, b) => b.gosPrice - a.gosPrice)
        .slice(0, 30),
    [type],
  );

  const create = () => {
    if (!total.materials.length) return;
    const label = realty ? `${type === 'house' ? 'Дом' : 'Квартира'} #${realty.num}` : 'Прокачка';
    onCreate(`${label} — прокачка`, total.materials.map((m) => ({ name: m.name, need: m.qty, have: 0 })));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modal, { maxHeight: '90%' }]}>
          <Text style={styles.modalTitle}>Прокачка дома</Text>

          <ScrollView style={{ maxHeight: 460 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable
                style={[styles.tab, type === 'house' && styles.tabOn]}
                onPress={() => setType('house')}
              >
                <Text style={[styles.tabText, type === 'house' && styles.tabTextOn]}>🏠 Дом</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, type === 'apartment' && styles.tabOn]}
                onPress={() => setType('apartment')}
              >
                <Text style={[styles.tabText, type === 'apartment' && styles.tabTextOn]}>🏢 Кв.</Text>
              </Pressable>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Номер"
                placeholderTextColor={theme.muted}
                keyboardType="numeric"
                value={num}
                onChangeText={setNum}
              />
            </View>

            <Pressable onPress={() => setPicker((v) => !v)} style={{ marginTop: 8 }}>
              <Text style={styles.link}>{picker ? 'Скрыть подбор' : '🔎 Подобрать дом без роялти'}</Text>
            </Pressable>

            {picker && (
              <View style={styles.picker}>
                {noRoyalty.map((r) => (
                  <Pressable
                    key={r.num}
                    style={styles.pickRow}
                    onPress={() => {
                      setNum(String(r.num));
                      setPicker(false);
                    }}
                  >
                    <Text style={styles.name}>#{r.num}</Text>
                    <Text style={styles.sub}>
                      {money(r.gosPrice)} · {r.garageSlots} гар · {r.storageKg} кг
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {num !== '' && !realty && <Text style={styles.warn}>Такого номера нет в каталоге.</Text>}

            {realty && (
              <View style={styles.info}>
                <Text style={styles.sub}>Гос-цена {money(realty.gosPrice)} · за день {money(realty.rentPerDay)}</Text>
                <Text style={styles.sub}>
                  Роялти{' '}
                  <Text style={{ color: realty.royaltyCoins > 0 ? theme.amber : theme.green }}>
                    {realty.royaltyCoins > 0 ? `${realty.royaltyCoins} коинов` : 'нет'}
                  </Text>
                  {'  '}· гараж {realty.garageSlots} · кладовка {realty.storageKg} кг
                </Text>
              </View>
            )}

            {realty &&
              kinds.map((k) => {
                const max = maxLevel(k, realty.garageSlots);
                const min = k === 'workshop' ? 0 : 1;
                return (
                  <View key={k} style={styles.lvlRow}>
                    <Text style={[styles.name, { width: 96 }]}>{UPGRADE_LABEL[k]}</Text>
                    <LevelPick
                      min={min}
                      max={max}
                      value={from[k]}
                      onChange={(v) => {
                        setFrom((p) => ({ ...p, [k]: v }));
                        setTo((p) => ({ ...p, [k]: Math.max(p[k], v) }));
                      }}
                    />
                    <Text style={styles.sub}>→</Text>
                    <LevelPick min={from[k]} max={max} value={to[k]} onChange={(v) => setTo((p) => ({ ...p, [k]: v }))} />
                  </View>
                );
              })}

            {plans.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.name}>
                  Нужно: {money(total.money)} · {total.hours} ч
                </Text>
                {total.materials.map((m) => (
                  <View key={m.name} style={styles.matRow}>
                    <Text style={[styles.sub, { flex: 1 }]} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.lineCost}>{m.qty} шт</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable style={[styles.modalBtn, styles.modalGhost]} onPress={onClose}>
              <Text style={styles.btnGhostText}>Отмена</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, { backgroundColor: theme.accent }]} onPress={create}>
              <Text style={styles.addBtnText}>Создать проект</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Выбор уровня стрелками — компактнее селекта на мобильном. */
function LevelPick({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={8}>
        <Text style={styles.stepBtn}>−</Text>
      </Pressable>
      <Text style={styles.stepVal}>{value === 0 ? 'нет' : value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={8}>
        <Text style={styles.stepBtn}>+</Text>
      </Pressable>
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

function NameModal({
  visible,
  title,
  placeholder,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={theme.muted}
            value={name}
            onChangeText={setName}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable style={[styles.modalBtn, styles.modalGhost]} onPress={onClose}>
              <Text style={styles.btnGhostText}>Отмена</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                if (name.trim()) {
                  onSave(name);
                  setName('');
                }
              }}
            >
              <Text style={styles.addBtnText}>Создать</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ItemModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (it: { name: string; need: number; have: number }) => void;
}) {
  const [name, setName] = useState('');
  const [need, setNeed] = useState('');
  const [have, setHave] = useState('');

  const submit = () => {
    const n = Number(need) || 0;
    if (!name.trim() || n <= 0) return;
    onSave({ name: name.trim(), need: n, have: Number(have) || 0 });
    setName('');
    setNeed('');
    setHave('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Материал в проект</Text>
          <TextInput
            style={styles.input}
            placeholder="Название материала"
            placeholderTextColor={theme.muted}
            value={name}
            onChangeText={setName}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Нужно"
              placeholderTextColor={theme.muted}
              keyboardType="numeric"
              value={need}
              onChangeText={setNeed}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Уже есть"
              placeholderTextColor={theme.muted}
              keyboardType="numeric"
              value={have}
              onChangeText={setHave}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable style={[styles.modalBtn, styles.modalGhost]} onPress={onClose}>
              <Text style={styles.btnGhostText}>Отмена</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, { backgroundColor: theme.accent }]} onPress={submit}>
              <Text style={styles.addBtnText}>Добавить</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 12, gap: 10 },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabs: { gap: 8, paddingRight: 12, alignItems: 'center' },
  tab: { backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  tabOn: { backgroundColor: theme.line },
  tabAdd: { backgroundColor: theme.accent },
  tabText: { color: theme.muted, fontSize: 13 },
  tabTextOn: { color: theme.txt, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12 },
  statLabel: { color: theme.muted, fontSize: 11, textTransform: 'uppercase' },
  statValue: { color: theme.txt, fontSize: 17, fontWeight: '700', marginTop: 2 },
  statSub: { color: theme.muted, fontSize: 11, marginTop: 2 },
  barBg: { height: 8, backgroundColor: theme.surface, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  primaryBtn: { backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
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
  lineCost: { color: theme.txt, fontWeight: '700', fontSize: 14 },
  haveInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: theme.txt,
    minWidth: 56,
    textAlign: 'right',
  },
  del: { color: theme.muted, fontSize: 12 },
  link: { color: theme.accent2, fontSize: 13 },
  warn: { color: theme.amber, fontSize: 12, marginTop: 8 },
  info: { marginTop: 10, gap: 2 },
  picker: { marginTop: 8, borderWidth: 1, borderColor: theme.line, borderRadius: 10, overflow: 'hidden' },
  pickRow: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.line },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  matRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  stepBtn: { color: theme.accent2, fontSize: 17, fontWeight: '700' },
  stepVal: { color: theme.txt, fontSize: 14, minWidth: 30, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  emptyTitle: { color: theme.txt, fontSize: 17, fontWeight: '700' },
  emptyList: { color: theme.muted, textAlign: 'center', marginTop: 32 },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: theme.txt,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.line, padding: 16 },
  modalTitle: { color: theme.txt, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  modalGhost: { borderWidth: 1, borderColor: theme.line },
  btnGhostText: { color: theme.txt, fontWeight: '600' },
});
