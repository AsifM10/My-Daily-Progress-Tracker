export interface PlannedItem {
  id: string
  text: string
  done: boolean
  recur?: 'daily' | 'weekly' | null
  tag?: string | null
}

export interface LoggedItem {
  id: string
  text: string
  tag?: string | null
}

export interface DayRecord {
  date: string
  plan: PlannedItem[]
  did: LoggedItem[]
  note: string
}
