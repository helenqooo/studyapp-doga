import { SUBJECTS_BY_EXAM, TOPICS, topicLabel } from '../topics';

/** Shared by every prompt/schema that classifies into the topic list. */
export const ALL_SUBJECTS = [...SUBJECTS_BY_EXAM.TYT, ...SUBJECTS_BY_EXAM.AYT];

export const TOPIC_IDS = TOPICS.map((t) => t.id);

/** One line per topic: "id — exam · subject · topic › subtopic". */
export const TOPIC_LIST = TOPICS.map((t) => `${t.id} — ${t.exam} · ${t.subject} · ${topicLabel(t)}`).join('\n');
