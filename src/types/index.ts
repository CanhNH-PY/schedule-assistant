export type Priority = 'high' | 'medium' | 'low'

export interface DailyTask {
  id: number
  title: string
  priority: Priority
  notify_time: string   // "HH:MM"
  is_active: number     // 1 | 0
  created_at: string
  repeat_type: 'daily' | 'weekly' | 'monthly'
  repeat_days: string   // "1,2,3,4,5,6,7" (1=Mon)
  repeat_dates: string | null  // "1,15" for monthly
  completed_at?: string | null
}

export interface DailyTaskLog {
  id: number
  task_id: number
  log_date: string      // "YYYY-MM-DD"
  completed_at: string | null
  notif_count: number
}

export interface StrategicTask {
  id: number
  title: string
  priority: Priority
  deadline: string      // "YYYY-MM-DD"
  progress: number      // 0–100
  created_at: string
}

export interface StudyItem {
  id: number
  category: 'professional' | 'language' | 'other'
  parent_id: number | null
  title: string
  progress: number
  notify_time: string | null
  notify_days: string   // "1,2,3,4,5,6,7"
}

export interface WorkSession {
  id: number
  session_date: string  // "YYYY-MM-DD"
  start_time: string    // "HH:MM"
  end_time: string | null
  total_minutes: number | null
}

export interface Holiday {
  name: string
  date: string          // "YYYY-MM-DD"
  days_off: number
}

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; label: string }> = {
  high:   { bg: '#FEE2E2', text: '#991B1B', label: 'Cao' },
  medium: { bg: '#FEF3C7', text: '#92400E', label: 'Trung bình' },
  low:    { bg: '#DCFCE7', text: '#166534', label: 'Thấp' },
}
