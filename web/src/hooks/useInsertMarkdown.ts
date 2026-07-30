import { useCallback } from 'react'

export function useInsertMarkdown(textareaRef: React.RefObject<HTMLTextAreaElement | null>) {
  return useCallback((before: string, after = '', placeholder?: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const selected = ta.value.substring(start, end) || placeholder || ''
    const next = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end)
    ta.value = next
    ta.selectionStart = start + before.length
    ta.selectionEnd = start + before.length + selected.length
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }, [textareaRef])
}
