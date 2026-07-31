export interface Topic {
  id: string;
  name: string;
  desc: string;
  color: string;
  isLectureType?: boolean;
  semester?: string | null;
}
