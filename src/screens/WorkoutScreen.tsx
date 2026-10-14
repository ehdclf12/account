import { useState } from 'react'
import NavButton from '@/components/NavButton'
import { useWorkoutLogs, useWorkoutProgram } from '@/hooks/useWorkout'
import { useToday } from '@/components/workout/useToday'
import SetupForm from '@/components/workout/SetupForm'
import TodayTab from '@/components/workout/TodayTab'
import WeekTab from '@/components/workout/WeekTab'
import HistoryTab from '@/components/workout/HistoryTab'

type Tab = 'today' | 'week' | 'history'
const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: '오늘' }, { key: 'week', label: '주간' }, { key: 'history', label: '기록' },
]

export default function WorkoutScreen() {
  const prog = useWorkoutProgram()
  const logsQ = useWorkoutLogs()
  const [tab, setTab] = useState<Tab>('today')
  const [regenerating, setRegenerating] = useState(false)
  const today = useToday()
  const logs = logsQ.data ?? []

  function startRegenerate() {
    if (!confirm('현재 루틴과 바꾼 종목은 사라지고 새로 만들어져요. 지난 기록은 남아요.')) return
    setRegenerating(true)
  }

  let body
  if (prog.isPending || logsQ.isPending) {
    body = <p className="text-sub text-sm">불러오는 중…</p>
  } else if (prog.isError || logsQ.isError) {
    body = (
      <div className="bg-card rounded-2xl p-6 text-center space-y-3">
        <p className="text-sub text-sm">운동 정보를 불러오지 못했어요.</p>
        <button onClick={() => { void prog.refetch(); void logsQ.refetch() }}
          className="min-h-[44px] px-4 rounded-xl bg-surface text-ink text-sm font-medium active:opacity-70">다시 시도</button>
      </div>
    )
  } else if (!prog.data) {
    body = <SetupForm />
  } else if (regenerating) {
    body = <SetupForm regenerate initial={prog.data.settings}
      onDone={() => { setRegenerating(false); setTab('today') }} onCancel={() => setRegenerating(false)} />
  } else {
    const { program, settings } = prog.data
    body = (
      <>
        <div role="tablist" className="grid grid-cols-3 gap-1 bg-card rounded-2xl p-1">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`min-h-[44px] rounded-xl text-sm font-bold active:opacity-70 ${tab === t.key ? 'bg-surface text-ink' : 'text-sub'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'today' && <TodayTab program={program} logs={logs} today={today} />}
        {tab === 'week' && <WeekTab program={program} settings={settings} logs={logs} today={today} onRegenerate={startRegenerate} />}
        {tab === 'history' && <HistoryTab logs={logs} />}
      </>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Workout</h1>
        <NavButton to="/" label="Home" />
      </div>
      {body}
    </div>
  )
}
