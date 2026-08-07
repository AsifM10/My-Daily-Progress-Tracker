export interface PlannedItem {
  id: string
  text: string
  done: boolean
}

export interface LoggedItem {
  id: string
  text: string
}

export interface DayRecord {
  date: string
  plan: PlannedItem[]
  did: LoggedItem[]
  note: string
}
