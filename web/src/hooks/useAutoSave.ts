import { useEffect } from 'react'
import { UseMutationResult } from '@tanstack/react-query'

export function useAutoSave<TData = void>(
  isDirty: boolean,
  selectedNoteId: string | null,
  draftTitle: string,
  draftContent: string,
  saveMutation: UseMutationResult<TData, Error, { title?: string; body?: string }, unknown>,
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void,
) {
  useEffect(() => {
    if (!isDirty || !selectedNoteId) return
    setSaveStatus('unsaved')
    const timer = setTimeout(() => {
      setSaveStatus('saving')
      saveMutation.mutate({ title: draftTitle, body: draftContent })
    }, 2000)
    return () => clearTimeout(timer)
  }, [draftTitle, draftContent, isDirty, selectedNoteId, saveMutation, setSaveStatus])
}
