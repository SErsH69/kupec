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

export { PATH_LABEL } from './labels';

export interface TabDef {
  key: string;
  label: string;
  icon: string;
  Component: ComponentType;
  /** Требует импортированных рыночных данных. */
  needsData?: boolean;
}

export const TABS: TabDef[] = [
  { key: 'overview', label: 'Топ выгодных', icon: '⭐', Component: OverviewTab, needsData: true },
  { key: 'fav', label: 'Избранное', icon: '🔖', Component: FavTab, needsData: true },
  { key: 'flip', label: 'Перекупка', icon: '💱', Component: FlipTab, needsData: true },
  { key: 'workshop', label: 'Мастерская', icon: '🔧', Component: CraftTab, needsData: true },
  { key: 'kitchen', label: 'Кухня', icon: '🍳', Component: KitchenTab, needsData: true },
  { key: 'farm', label: 'Что фармить', icon: '🌾', Component: FarmTab, needsData: true },
  { key: 'movers', label: 'Движения', icon: '📈', Component: MoversTab, needsData: true },
  { key: 'journal', label: 'Журнал сделок', icon: '📒', Component: JournalTab },
  { key: 'rlcars', label: 'RL авто', icon: '🏎️', Component: RLTab, needsData: true },
  { key: 'gov', label: 'Гос-цены', icon: '🏛️', Component: GovTab },
];
