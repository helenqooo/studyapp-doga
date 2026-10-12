// Badge catalog. The app keeps a twin with icons and art (app/src/data/badges.ts); ids are
// stored in profiles.badges, so never rename one.

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-exam', title: 'İlk deneme', description: 'İlk denemeni girdin.' },
  { id: 'streak-7', title: '7 günlük seri', description: '7 gün üst üste çalıştın.' },
  { id: 'streak-30', title: '30 günlük seri', description: '30 gün üst üste çalıştın.' },
  { id: 'questions-100', title: '100 soru', description: '100 soru çözdün.' },
  { id: 'questions-500', title: '500 soru', description: '500 soru çözdün.' },
  { id: 'topic-master', title: 'Konu ustası', description: 'Bir konuda 10 doğru tekrar yaptın.' },
];

export const BADGE_IDS = new Set(BADGES.map((b) => b.id));

/** Topic master badges are per topic: "topic-master:<topicId>". */
export const topicMasterId = (topicId: string) => `topic-master:${topicId}`;
