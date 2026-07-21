import type { ComponentType } from 'react';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { FavTab } from '../components/tabs/FavTab';
import { FlipTab } from '../components/tabs/FlipTab';
import { CraftTab } from '../components/tabs/CraftTab';
import { KitchenTab } from '../components/tabs/KitchenTab';
import { MoversTab } from '../components/tabs/MoversTab';
import { FarmTab } from '../components/tabs/FarmTab';
import { RLTab } from '../components/tabs/RLTab';
import { GovTab } from '../components/tabs/GovTab';
import { JournalTab } from '../components/tabs/JournalTab';
import { GoalsTab } from '../components/tabs/GoalsTab';
import { AccountTab } from '../components/tabs/AccountTab';
import { FeaturePromo, GoalsMock, JournalMock } from '../components/FeaturePromo';

export { PATH_LABEL } from './labels';

export interface TabDef {
  key: string;
  label: string;
  icon: string;
  Component: ComponentType;
  /** Требует импортированных рыночных данных. */
  needsData?: boolean;
  /** Требует входа в аккаунт (личные данные). */
  needsAuth?: boolean;
  /**
   * Группа в меню: 'market' — аналитика по публичным данным (всем),
   * 'personal' — личные данные пользователя (накапливаются, будущий Pro).
   */
  group?: 'market' | 'personal';
  /** Не показывать в списке навигации (доступ через отдельную кнопку). */
  hidden?: boolean;
  /** Промо-экран для неавторизованных (вместо общей карточки «Войдите»). */
  Promo?: ComponentType<{ onLogin: () => void }>;
}

/** Промо «Цели». */
function GoalsPromo({ onLogin }: { onLogin: () => void }) {
  return (
    <FeaturePromo
      icon="🎯"
      title="Цели — проекты прокачки"
      subtitle="Собери список материалов под задачу (прокачать дом, собрать на тачку) — посчитаем, чего не хватает, где брать дешевле и сколько ещё вложить."
      steps={[
        { n: 1, title: 'Выбери дом или задачу', text: 'Номер дома — подтянем требования по уровням из каталога.' },
        { n: 2, title: 'Смотри, где дешевле', text: 'По каждому материалу: купить на рынке или скрафтить самому.' },
        { n: 3, title: 'Веди прогресс', text: 'Отмечай собранное — остаток и стоимость считаются сами.' },
      ]}
      mock={<GoalsMock />}
      onLogin={onLogin}
    />
  );
}

/** Промо «Журнал сделок». */
function JournalPromo({ onLogin }: { onLogin: () => void }) {
  return (
    <FeaturePromo
      icon="📒"
      title="Журнал сделок с P&L"
      subtitle="Записывай перекуп и крафт — сколько вложил, сколько выручил. P&L, ROI и «сейчас в продаже» считаются автоматически."
      steps={[
        { n: 1, title: 'Добавь сделку', text: 'Перекуп или крафт: материалы, скрафчено, выставлено.' },
        { n: 2, title: 'Отмечай продажи', text: 'Частичные продажи, выручка — прибыль пересчитается.' },
        { n: 3, title: 'Веди общий журнал', text: 'Заведи группу — семья/банда ведёт журнал вместе.' },
      ]}
      mock={<JournalMock />}
      onLogin={onLogin}
    />
  );
}

export const TABS: TabDef[] = [
  { key: 'overview', label: 'Топ выгодных', icon: '⭐', Component: OverviewTab, needsData: true },
  { key: 'fav', label: 'Избранное', icon: '🔖', Component: FavTab, needsData: true },
  { key: 'flip', label: 'Перекупка', icon: '💱', Component: FlipTab, needsData: true },
  { key: 'workshop', label: 'Мастерская', icon: '🔧', Component: CraftTab, needsData: true },
  { key: 'kitchen', label: 'Кухня', icon: '🍳', Component: KitchenTab, needsData: true },
  { key: 'farm', label: 'Что фармить', icon: '🌾', Component: FarmTab, needsData: true },
  { key: 'movers', label: 'Движения', icon: '📈', Component: MoversTab, needsData: true },
  { key: 'rlcars', label: 'RL авто', icon: '🏎️', Component: RLTab, needsData: true },
  { key: 'gov', label: 'Гос-цены', icon: '🏛️', Component: GovTab },
  // Личное — данные пользователя, отделены в меню. Требуют входа (промо для гостей).
  { key: 'goals', label: 'Цели', icon: '🎯', Component: GoalsTab, needsData: true, needsAuth: true, group: 'personal', Promo: GoalsPromo },
  { key: 'journal', label: 'Журнал сделок', icon: '📒', Component: JournalTab, needsAuth: true, group: 'personal', Promo: JournalPromo },
  // Кабинет — доступен через блок аккаунта внизу, не в списке навигации.
  { key: 'account', label: 'Кабинет', icon: '⚙️', Component: AccountTab, needsAuth: true, group: 'personal', hidden: true },
];
