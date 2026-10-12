// Badge catalog (twin of server/src/badges.ts, plus art). Ids are stored on the server:
// never rename one. Topic master badges are per topic: "topic-master:<topicId>".

import type { IconName } from '../components/Icon';
import { getTopic, topicLabel } from './topics';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeInfo {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  tier: BadgeTier;
}

/** In the order shown on the profile. */
export const BADGES: BadgeInfo[] = [
  { id: 'first-exam', title: 'İlk deneme', description: 'İlk denemeni gir.', icon: 'clipboard-check', tier: 'bronze' },
  { id: 'streak-7', title: '7 günlük seri', description: '7 gün üst üste çalış.', icon: 'flame', tier: 'silver' },
  { id: 'streak-30', title: '30 günlük seri', description: '30 gün üst üste çalış.', icon: 'flame', tier: 'gold' },
  { id: 'questions-100', title: '100 soru', description: '100 soru çöz.', icon: 'layers', tier: 'silver' },
  { id: 'questions-500', title: '500 soru', description: '500 soru çöz.', icon: 'library', tier: 'gold' },
  { id: 'topic-master', title: 'Konu ustası', description: 'Bir konuda 10 doğru tekrar yap.', icon: 'graduation-cap', tier: 'gold' },
];

const byId = new Map(BADGES.map((b) => [b.id, b]));

/** Display info for an earned badge id (topic masters name their topic). */
export function badgeInfo(id: string): BadgeInfo {
  if (id.startsWith('topic-master:')) {
    const base = byId.get('topic-master')!;
    const topic = getTopic(id.slice('topic-master:'.length));
    return { ...base, id, description: topic ? `${topicLabel(topic)} konusunda 10 doğru tekrar.` : base.description };
  }
  return byId.get(id) ?? { id, title: id, description: '', icon: 'award', tier: 'bronze' };
}
