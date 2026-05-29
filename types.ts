
export interface Student {
  id: string;
  name: string;
  avatar: string;
  grade: string;
  gpa: number;
  credits: number;
  status: 'Active' | 'Pending' | 'Expired';
}

export interface UserProfile {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'admin' | null;
  is_blocked: boolean;
  access_enabled: boolean;
  is_demo?: boolean;
  document_number: string | null;
  tour_completed: boolean;
  status: 'active' | 'inactive';
  ai_gems: number;
  cohort?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  name: string;
  modules: number;
  quizzes: number;
  progress: number;
  icon: string;
  color: string;
  lastUpdate?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  read: boolean;
}

export interface Payment {
  id: string;
  user_id: string;
  concept: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
  payment_method?: string;
  transaction_id?: string;
}

export interface NewsEntry {
  id: string;
  title: string;
  category: 'Académico' | 'Evento' | 'Administrativo';
  summary: string;
  content: string;
  date: string;
  image: string;
}

export interface RegistrationForm {
  fullName: string;
  documentId: string;
  documentIssuanceDate: string;
  documentIssuancePlace: string;
  email: string;
  phone: string;
  targetGrade: string;
  previousSchool: string;
}
