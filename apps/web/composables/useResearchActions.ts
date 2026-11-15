import type { Announcement, ResearchLogEntry, TodayAction } from '~/types/research'

export function useResearchActions() {
  const actionState = useState<Record<string, string>>('research-action-state', () => ({}))

  function buildTodayActions(announcements: Announcement[], logs: ResearchLogEntry[], today = new Date().toISOString().slice(0, 10)): TodayAction[] {
    const logged = new Set(logs.map((item) => item.id))
    const actions: TodayAction[] = announcements
      .filter((item) => item.severity === 'high' && !logged.has(item.id))
      .slice(0, 3)
      .map((item) => ({ id: `news:${item.id}`, kind: 'verify-announcement', priority: 'urgent', title: `${item.issuer || item.code} · ${item.title}`, hint: '打开原文并加入研究日志', targetId: item.id }))
    logs
      .filter((item) => item.followUpDate && item.followUpDate <= today)
      .slice(0, 3)
      .forEach((item) => actions.push({ id: `log:${item.id}`, kind: 'review-log', priority: 'review', title: `${item.code || '未关联标的'} · ${item.title}`, hint: `复核日期 ${item.followUpDate}`, targetId: item.id }))
    return actions.filter((item) => !actionState.value[item.id])
  }

  function completeAction(id: string) {
    actionState.value = { ...actionState.value, [id]: new Date().toISOString() }
  }

  return { actionState, buildTodayActions, completeAction }
}
