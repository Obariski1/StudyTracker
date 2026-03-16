export interface StudySession {
  id: string;
  topicId: string | null;
  note: string;
  start: string;   // ISO string
  end: string;     // ISO string
  duration: number; // seconds
}
