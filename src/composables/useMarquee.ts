import { ref } from 'vue'
import type { ItemId, MarqueeRect, UseMarqueeOptions, UseMarqueeReturn } from '../types'

export function useMarquee(options: UseMarqueeOptions): UseMarqueeReturn {
  const { containerRef, getItemElements, getItemId, selection, enabled } = options

  const isActive = ref(false)
  const rect = ref<MarqueeRect | null>(null)
  const previouslySelected = new Set<ItemId>()

  const getContainerRect = (): DOMRect | null => {
    return containerRef.value?.getBoundingClientRect() ?? null
  }

  const getMarqueeDOMRect = (): DOMRect | null => {
    if (!rect.value || !containerRef.value) return null

    const containerRect = getContainerRect()
    if (!containerRect) return null

    const scrollLeft = containerRef.value.scrollLeft
    const scrollTop = containerRef.value.scrollTop

    const left = Math.min(rect.value.startX, rect.value.endX) - scrollLeft
    const top = Math.min(rect.value.startY, rect.value.endY) - scrollTop
    const right = Math.max(rect.value.startX, rect.value.endX) - scrollLeft
    const bottom = Math.max(rect.value.startY, rect.value.endY) - scrollTop

    return new DOMRect(
      left + containerRect.left,
      top + containerRect.top,
      right - left,
      bottom - top
    )
  }

  const rectsIntersect = (a: DOMRect, b: DOMRect): boolean => {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
  }

  const updateSelection = () => {
    const marqueeDOMRect = getMarqueeDOMRect()
    if (!marqueeDOMRect) return

    const itemElements = getItemElements()
    const intersectingIds = new Set<ItemId>()

    for (const el of itemElements) {
      const itemRect = el.getBoundingClientRect()
      if (rectsIntersect(marqueeDOMRect, itemRect)) {
        intersectingIds.add(getItemId(el))
      }
    }

    // Combine with previously selected items
    const newSelection = new Set(previouslySelected)
    for (const id of intersectingIds) {
      newSelection.add(id)
    }

    selection.selectRange(Array.from(newSelection))
  }

  const startMarquee = (e: PointerEvent) => {
    if (!enabled.value || !containerRef.value) return

    const containerRect = getContainerRect()
    if (!containerRect) return

    const scrollLeft = containerRef.value.scrollLeft
    const scrollTop = containerRef.value.scrollTop

    const x = e.clientX - containerRect.left + scrollLeft
    const y = e.clientY - containerRect.top + scrollTop

    // Store currently selected items if Ctrl/Cmd is held
    previouslySelected.clear()
    if (e.ctrlKey || e.metaKey) {
      for (const id of selection.selectedIds.value) {
        previouslySelected.add(id)
      }
    }

    rect.value = {
      startX: x,
      startY: y,
      endX: x,
      endY: y,
    }
    isActive.value = true
  }

  const updateMarquee = (e: PointerEvent) => {
    if (!isActive.value || !containerRef.value || !rect.value) return

    const containerRect = getContainerRect()
    if (!containerRect) return

    const scrollLeft = containerRef.value.scrollLeft
    const scrollTop = containerRef.value.scrollTop

    rect.value = {
      ...rect.value,
      endX: e.clientX - containerRect.left + scrollLeft,
      endY: e.clientY - containerRect.top + scrollTop,
    }

    updateSelection()
  }

  const endMarquee = (_e: PointerEvent) => {
    isActive.value = false
    rect.value = null
    previouslySelected.clear()
  }

  return {
    isActive,
    rect,
    startMarquee,
    updateMarquee,
    endMarquee,
  }
}
