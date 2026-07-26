import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useIdentity } from '@/App'
import { useTimeGoals, useUpdateGoal, useQuote, useSetQuote } from '@/hooks/useTimeGoals'
import { checklistProgress } from '@/lib/archive'
import TimeGoalSheet from '@/components/TimeGoalSheet'
import type { ChecklistEntry, TimeGoal } from '@/types'

const QUOTE_MAX = 60
const SUB_MAX = 40

export default function TimeGoals() {
  const { data: goals = [] } = useTimeGoals()
  const { data: quote = '' } = useQuote()
  const upd = useUpdateGoal()
  const setQuote = useSetQuote()
  const qc = useQueryClient()
  const who = useIdentity()

  const [editMode, setEditMode] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [editingGoal, setEditingGoal] = useState<TimeGoal | null>(null)
  const [quoteDraft, setQuoteDraft] = useState<string | null>(null)   // null = 편집 안 함
  const [sub, setSub] = useState<{ id: string; text: string } | null>(null)  // 서브목표 추가 입력

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  // 서브목표는 체크리스트를 통째로 저장한다(아카이브 패턴과 동일)
  async function saveChecklist(g: TimeGoal, checklist: ChecklistEntry[]) {
    try { await upd.mutateAsync({ id: g.id, checklist }) } catch { /* 전역 토스트 */ }
  }
  // 연속 탭 시 렌더 시점 스냅샷(g)이 아니라 캐시의 최신 값을 기준으로 checklist를
  // 파생시킨다. useUpdateGoal의 onMutate가 캐시를 즉시 갱신하므로, 두 번째 탭은
  // 첫 번째 탭의 낙관적 결과 위에서 계산된다.
  function freshGoal(g: TimeGoal): TimeGoal {
    return qc.getQueryData<TimeGoal[]>(['time_goals', who])?.find((x) => x.id === g.id) ?? g
  }
  function toggleSub(g: TimeGoal, i: number) {
    const cur = freshGoal(g)
    void saveChecklist(cur, cur.checklist.map((c, idx) => (idx === i ? { ...c, done: !c.done } : c)))
  }
  function deleteSub(g: TimeGoal, i: number) {
    const cur = freshGoal(g)
    void saveChecklist(cur, cur.checklist.filter((_, idx) => idx !== i))
  }
  function addSub(g: TimeGoal) {
    const t = sub?.id === g.id ? sub.text.trim() : ''
    if (!t) return
    const cur = freshGoal(g)
    void saveChecklist(cur, [...cur.checklist, { text: t, done: false }])
    setSub({ id: g.id, text: '' })
  }

  async function saveQuote() {
    try { await setQuote.mutateAsync((quoteDraft ?? '').trim()); setQuoteDraft(null) }
    catch { /* 전역 토스트 */ }
  }

  return (
    <div className="bg-card rounded-2xl p-4 space-y-4">
      {/* 명언 */}
      {quoteDraft !== null ? (
        <div className="flex items-center gap-2">
          <input value={quoteDraft} maxLength={QUOTE_MAX} autoFocus
            onChange={(e) => setQuoteDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveQuote()}
            placeholder="나만의 명언을 적어보세요"
            className="flex-1 bg-surface rounded-xl px-3 py-2 outline-none text-ink text-sm" />
          <button onClick={saveQuote} className="text-brand text-sm font-bold px-1">저장</button>
          <button onClick={() => setQuoteDraft(null)} className="text-sub text-sm px-1">취소</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm italic min-w-0 truncate ${quote ? 'text-ink' : 'text-sub/60'}`}>
            {quote ? `“${quote}”` : '나만의 명언을 적어보세요'}
          </p>
          {editMode && (
            <button onClick={() => setQuoteDraft(quote)} aria-label="명언 수정"
              className="text-sub text-sm shrink-0 active:opacity-60">✎</button>
          )}
        </div>
      )}

      <div className="border-t border-line" />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-ink">목표</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditMode((v) => !v)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${editMode ? 'bg-ink text-bg' : 'bg-surface text-sub'}`}>
            {editMode ? '완료' : '편집'}
          </button>
          <button onClick={() => setAdding(true)} aria-label="목표 추가"
            className="text-ink text-2xl leading-none w-8 h-8 flex items-center justify-center active:opacity-60">+</button>
        </div>
      </div>

      {/* 목표 리스트 */}
      {goals.length === 0 ? (
        <p className="text-sub text-sm text-center py-4">세우고 싶은 목표를 적어보세요</p>
      ) : (
        <div className="space-y-2.5">
          {goals.map((g) => {
            const { done, total } = checklistProgress(g.checklist)
            const open = expanded.has(g.id)
            const pct = total ? Math.round((done / total) * 100) : 0
            return (
              <div key={g.id} className="bg-surface rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleExpand(g.id)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left active:opacity-70">
                    <span className="text-sub text-xs w-3 shrink-0">{open ? '▾' : '▸'}</span>
                    <span className="text-ink font-medium truncate">{g.title}</span>
                  </button>
                  {total > 0 && <span className="text-sub text-xs shrink-0">{done}/{total}</span>}
                  {editMode && (
                    <button onClick={() => setEditingGoal(g)} aria-label={`${g.title} 수정`}
                      className="text-sub text-sm shrink-0 active:opacity-60">✎</button>
                  )}
                </div>
                {total > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {open && (
                  <div className="mt-3 space-y-2">
                    {g.checklist.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button onClick={() => toggleSub(g, i)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left active:opacity-70">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${c.done ? 'bg-brand text-white' : 'bg-card text-transparent border border-sub/30'}`}>✓</span>
                          <span className={`text-sm truncate ${c.done ? 'text-sub line-through' : 'text-ink'}`}>{c.text}</span>
                        </button>
                        {editMode && (
                          <button onClick={() => deleteSub(g, i)} aria-label={`${c.text} 삭제`}
                            className="text-sub text-sm shrink-0 active:opacity-60">×</button>
                        )}
                      </div>
                    ))}
                    {editMode && (
                      <div className="flex items-center gap-2">
                        <input value={sub?.id === g.id ? sub.text : ''} maxLength={SUB_MAX}
                          onChange={(e) => setSub({ id: g.id, text: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && addSub(g)}
                          placeholder="+ 서브목표 추가"
                          className="flex-1 bg-card rounded-lg px-3 py-1.5 outline-none text-ink text-sm" />
                        <button onClick={() => addSub(g)} className="text-brand text-sm font-bold px-1">추가</button>
                      </div>
                    )}
                    {g.checklist.length === 0 && !editMode && (
                      <p className="text-sub/60 text-xs">아직 서브목표가 없어요</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {adding && <TimeGoalSheet open onClose={() => setAdding(false)} nextOrder={goals.length} />}
      {editingGoal && <TimeGoalSheet open onClose={() => setEditingGoal(null)} editing={editingGoal} nextOrder={goals.length} />}
    </div>
  )
}
