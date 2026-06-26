'use client'

import { useEffect, useRef, useState } from 'react'
import { SmilePlus, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { User } from '@/types'

const MAX_CHARS = 80

const EMOJIS = [
  '❤️', '🔥', '😍', '😂', '🥹', '😮',
  '👏', '💪', '🎉', '✨', '💯', '🙏',
  '😭', '😢', '🤩', '🥰', '😘', '😊',
  '😅', '🤯', '💀', '👀', '🫶', '⭐',
]

interface Props {
  user: User
  isOwner: boolean
  isSleeping: boolean
  onSave: (text: string | null) => void
  onReact: (emoji: string | null) => void
}

export default function NoteWidget({ user, isOwner, isSleeping, onSave, onReact }: Props) {
  const hasNote = !!user.note
  const isRiham = user.id === 'riham'
  const myReaction = user.note_reaction ?? null

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [timeLabel, setTimeLabel] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!hasNote || !user.note_created_at) return
    const update = () => setTimeLabel(formatDistanceToNow(new Date(user.note_created_at!), { addSuffix: true }))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [hasNote, user.note_created_at])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  // Close picker when note disappears
  useEffect(() => {
    if (!hasNote) setShowPicker(false)
  }, [hasNote])

  function startEditing() {
    if (!isOwner) return
    setDraft(user.note ?? '')
    setEditing(true)
  }

  function handleSave() {
    onSave(draft.trim() || null)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') setEditing(false)
  }

  function handlePickEmoji(emoji: string) {
    onReact(myReaction === emoji ? null : emoji)
    setShowPicker(false)
  }

  const bubbleBg    = isSleeping ? 'bg-slate-700/70 border-slate-600'   : isRiham ? 'bg-rose-100 border-rose-200'  : 'bg-sky-100 border-sky-200'
  const textColor   = isSleeping ? 'text-slate-100'                      : isRiham ? 'text-rose-900'                : 'text-sky-900'
  const metaColor   = isSleeping ? 'text-slate-400'                      : isRiham ? 'text-rose-400'                : 'text-sky-400'
  const deleteColor = isSleeping ? 'text-slate-500 hover:text-red-400'   : isRiham ? 'text-rose-300 hover:text-red-400' : 'text-sky-300 hover:text-red-400'
  const addColor    = isSleeping ? 'text-slate-600 hover:text-slate-300' : isRiham ? 'text-rose-300 hover:text-rose-500' : 'text-sky-300 hover:text-sky-500'

  const inputBg = isSleeping
    ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-slate-500'
    : 'bg-white border-stone-200 text-stone-800 placeholder:text-stone-400 focus:ring-stone-300'
  const saveBtnClass = isSleeping
    ? 'bg-slate-600 hover:bg-slate-500 text-white'
    : isRiham ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          rows={2}
          maxLength={MAX_CHARS}
          className={`w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 ${inputBg}`}
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs tabular-nums ${isSleeping ? 'text-slate-500' : 'text-stone-400'}`}>{draft.length}/{MAX_CHARS}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className={`text-xs ${isSleeping ? 'text-slate-400 hover:text-slate-200' : 'text-stone-400 hover:text-stone-600'} transition-colors`}>Cancel</button>
            <button onClick={handleSave} className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${saveBtnClass}`}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  if (hasNote) {
    return (
      <div className="space-y-2">
        {/* Note bubble row */}
        <div className="flex items-start gap-2">
          <div
            onClick={isOwner ? startEditing : undefined}
            className={`inline-flex flex-col gap-0.5 rounded-2xl border px-3.5 py-2 max-w-[85%] ${bubbleBg} ${isOwner ? 'cursor-pointer hover:brightness-[0.97] transition-all' : ''}`}
          >
            <p className={`text-sm leading-snug ${textColor}`}>{user.note}</p>
            <span className={`text-xs ${metaColor}`}>{timeLabel}</span>
          </div>
          {isOwner && (
            <button onClick={() => onSave(null)} className={`mt-1.5 flex-shrink-0 transition-colors ${deleteColor}`} title="Delete note">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Reaction row — only for non-owner */}
        {!isOwner && (
          <div className="space-y-1.5 pl-1">
            {/* Existing reaction pill + react/change button */}
            <div className="flex items-center gap-2">
              {myReaction && (
                <span className={`text-base leading-none px-2 py-0.5 rounded-full border ${isSleeping ? 'bg-slate-700/60 border-slate-600' : 'bg-stone-50 border-stone-200'}`}>
                  {myReaction}
                </span>
              )}
              <button
                onClick={() => setShowPicker(v => !v)}
                className={`flex items-center gap-1 text-xs rounded-lg px-1.5 py-0.5 transition-colors ${
                  showPicker
                    ? isSleeping ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-600'
                    : isSleeping ? 'text-slate-600 hover:text-slate-300' : 'text-stone-300 hover:text-stone-500'
                }`}
                title={myReaction ? 'Change reaction' : 'React'}
              >
                <SmilePlus size={13} />
              </button>
              {myReaction && showPicker && (
                <button
                  onClick={() => { onReact(null); setShowPicker(false) }}
                  className={`text-xs transition-colors ${isSleeping ? 'text-slate-500 hover:text-red-400' : 'text-stone-400 hover:text-red-400'}`}
                >
                  Remove
                </button>
              )}
            </div>

            {/* Inline emoji picker — no floating/absolute positioning */}
            {showPicker && (
              <div className={`rounded-2xl border p-2 inline-block ${isSleeping ? 'bg-slate-800 border-slate-700' : 'bg-white border-stone-100'} shadow-sm`}>
                <div className="grid grid-cols-6 gap-0.5">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => handlePickEmoji(e)}
                      className={`w-9 h-9 flex items-center justify-center text-xl rounded-xl transition-colors ${
                        e === myReaction
                          ? isSleeping ? 'bg-slate-600' : 'bg-stone-100'
                          : isSleeping ? 'hover:bg-slate-700' : 'hover:bg-stone-100'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Owner sees the reaction from the other person (read-only) */}
        {isOwner && myReaction && (
          <div className="pl-1">
            <span className={`text-base leading-none px-2 py-0.5 rounded-full border ${isSleeping ? 'bg-slate-700/60 border-slate-600' : 'bg-stone-50 border-stone-200'}`}>
              {myReaction}
            </span>
          </div>
        )}
      </div>
    )
  }

  if (isOwner) {
    return (
      <button onClick={startEditing} className={`text-xs transition-colors ${addColor}`}>
        + Add a note…
      </button>
    )
  }

  return null
}
