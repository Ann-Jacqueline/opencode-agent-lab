export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  cadence: "daily" | "weekly";
  createdAt: string;
}

export interface Completion {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}
