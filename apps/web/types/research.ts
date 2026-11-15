export type ImpactLevel = 'high' | 'medium' | 'low'

export interface Announcement {
  id: string
  code: string
  issuer: string
  title: string
  body: string
  eventType: string
  severity: ImpactLevel
  source: string
  publishedAt: string
  url: string
  parserStatus: string
}

export interface ResearchLogEntry {
  id: string
  code: string
  title: string
  eventType: string
  source: string
  url: string
  thesis: string
  risk: string
  followUpDate: string
  createdAt: string
}

export interface TodayAction {
  id: string
  kind: 'verify-announcement' | 'review-log'
  priority: 'urgent' | 'review'
  title: string
  hint: string
  targetId: string
}
