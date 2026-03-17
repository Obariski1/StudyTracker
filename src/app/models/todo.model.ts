export interface Todo {
  id: string;
  title: string;
  description?: string;
  topicId: string | null;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
