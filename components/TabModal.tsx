'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Tab, UserId } from '@/types'

interface Props {
  userId: UserId
  onClose: () => void
  onSaved?: () => void
  existingTab?: Tab
}

const MAX_NAME_LENGTH = 30

export default function TabModal({ userId, onClose, onSaved, existingTab }: Props) {
  const isEditing = !!existingTab
  const [name, setName] = useState(existingTab?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }

    setSaving(true)

    const { error: dbError } = isEditing
      ? await supabase.from('tabs').update({ name: name.trim() }).eq('id', existingTab!.id)
      : await supabase.from('tabs').insert({ user_id: userId, name: name.trim() })

    if (dbError) {
      setError('Failed to save. Please try again.')
      setSaving(false)
    } else {
      onSaved?.()
      onClose()
    }
  }

  const btnClass = userId === 'riham'
    ? 'bg-rose-500 hover:bg-rose-600 text-white'
    : 'bg-sky-500 hover:bg-sky-600 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">{isEditing ? 'Rename Tab' : 'New Tab'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Tab name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              placeholder="e.g. Math"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              maxLength={MAX_NAME_LENGTH}
              autoFocus
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${btnClass} disabled:opacity-60`}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Tab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
