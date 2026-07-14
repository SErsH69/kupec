import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { getNotifyStatus, requestNotifyPermission, type NotifyStatus } from '../lib/notifications';
import { theme } from '../lib/theme';

/** Кнопка включения уведомлений о достижении ценовой цели. */
export function NotifyButton() {
  const [status, setStatus] = useState<NotifyStatus>('default');

  useEffect(() => {
    getNotifyStatus().then(setStatus).catch(() => {});
  }, []);

  if (status === 'unsupported') return null;
  const granted = status === 'granted';

  const enable = () => {
    if (granted) return;
    requestNotifyPermission().then((ok) => setStatus(ok ? 'granted' : 'denied'));
  };

  return (
    <Pressable onPress={enable} style={[styles.btn, granted && styles.on]}>
      <Text style={[styles.text, granted && styles.textOn]}>
        {granted ? '🔔 Уведомления включены' : '🔕 Включить уведомления о цели'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },
  on: { borderColor: theme.green },
  text: { color: theme.txt, fontWeight: '600' },
  textOn: { color: theme.green },
});
