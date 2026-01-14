import { ref } from 'vue'
import type { ItemId, MarqueeRect, UseMarqueeOptions, UseMarqueeReturn } from '../types'

// Edge auto-scroll configuration
const EDGE_THRESHOLD = 40 // pixels from edge to trigger scroll
const SCROLL_SPEED = 15 // pixels per frame

export function useMarquee(options: UseMarqueeOptions): UseMarqueeReturn {
  const { containerRef, getItemElements, getItemId, selection, enabled } = options

  const isActive = ref(false)
  const rect = ref<MarqueeRect | null>(null)
  const previouslySelected = new Set<ItemId>()

  // Auto-scroll state
  let scrollAnimationId: number | null = null
  let lastPointerEvent: PointerEvent | null = null

  // Track scroll offset reactively for rendering
  const scrollOffset = ref({ x: 0, y: 0 })

  const getContainerRect = (): DOMRect | null => {
    return containerRef.value?.getBoundingClientRect() ?? null
  }

  // Get marquee rect in screen coordinates for hit testing
  const getMarqueeDOMRect = (): DOMRect | null => {
    if (!rect.value || !containerRef.value) return null

    const containerRect = getContainerRect()
    if (!containerRect) return null

    // rect stores content coordinates, convert to screen coordinates
    const scrollLeft = containerRef.value.scrollLeft
    const scrollTop = containerRef.value.scrollTop

    const left = Math.min(rect.value.startX, rect.value.endX) - scrollLeft + containerRect.left
    const top = Math.min(rect.value.startY, rect.value.endY) - scrollTop + containerRect.top
    const width = Math.abs(rect.value.endX - rect.value.startX)
    const height = Math.abs(rect.value.endY - rect.value.startY)

    return new DOMRect(left, top, width, height)
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

  // Calculate scroll velocity based on pointer position near edges
  const getScrollVelocity = (e: PointerEvent): { x: number; y: number } => {
    const containerRect = getContainerRect()
    if (!containerRect) return { x: 0, y: 0 }

    let scrollX = 0
    let scrollY = 0

    const pointerX = e.clientX - containerRect.left
    const pointerY = e.clientY - containerRect.top

    // Check horizontal edges
    if (pointerX < EDGE_THRESHOLD) {
      scrollX = -SCROLL_SPEED * (1 - pointerX / EDGE_THRESHOLD)
    } else if (pointerX > containerRect.width - EDGE_THRESHOLD) {
      scrollX = SCROLL_SPEED * (1 - (containerRect.width - pointerX) / EDGE_THRESHOLD)
    }

    // Check vertical edges
    if (pointerY < EDGE_THRESHOLD) {
      scrollY = -SCROLL_SPEED * (1 - pointerY / EDGE_THRESHOLD)
    } else if (pointerY > containerRect.height - EDGE_THRESHOLD) {
      scrollY = SCROLL_SPEED * (1 - (containerRect.height - pointerY) / EDGE_THRESHOLD)
    }

    return { x: scrollX, y: scrollY }
  }

  const updateScrollOffset = () => {
    if (containerRef.value) {
      scrollOffset.value = {
        x: containerRef.value.scrollLeft,
        y: containerRef.value.scrollTop,
      }
    }
  }

  // Animation loop for edge auto-scroll
  const scrollLoop = () => {
    if (!isActive.value || !containerRef.value || !lastPointerEvent) {
      scrollAnimationId = null
      return
    }

    const velocity = getScrollVelocity(lastPointerEvent)

    if (velocity.x !== 0 || velocity.y !== 0) {
      containerRef.value.scrollLeft += velocity.x
      containerRef.value.scrollTop += velocity.y

      updateScrollOffset()

      // Update marquee end point to follow mouse in content coordinates
      if (rect.value) {
        const containerRect = getContainerRect()
        if (containerRect) {
          rect.value = {
            ...rect.value,
            endX: lastPointerEvent.clientX - containerRect.left + containerRef.value.scrollLeft,
            endY: lastPointerEvent.clientY - containerRect.top + containerRef.value.scrollTop,
          }
        }
      }

      updateSelection()
    }

    scrollAnimationId = requestAnimationFrame(scrollLoop)
  }

  const startAutoScroll = () => {
    if (scrollAnimationId === null) {
      scrollAnimationId = requestAnimationFrame(scrollLoop)
    }
  }

  const stopAutoScroll = () => {
    if (scrollAnimationId !== null) {
      cancelAnimationFrame(scrollAnimationId)
      scrollAnimationId = null
    }
    lastPointerEvent = null
  }

  const startMarquee = (e: PointerEvent) => {
    if (!enabled.value || !containerRef.value) return

    const containerRect = getContainerRect()
    if (!containerRect) return

    const scrollLeft = containerRef.value.scrollLeft
    const scrollTop = containerRef.value.scrollTop

    updateScrollOffset()

    // Store start position in content coordinates
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

    updateScrollOffset()

    // Update end position in content coordinates
    rect.value = {
      ...rect.value,
      endX: e.clientX - containerRect.left + scrollLeft,
      endY: e.clientY - containerRect.top + scrollTop,
    }

    // Store pointer event for auto-scroll
    lastPointerEvent = e

    // Start auto-scroll if near edges
    const velocity = getScrollVelocity(e)
    if (velocity.x !== 0 || velocity.y !== 0) {
      startAutoScroll()
    }

    updateSelection()
  }

  const endMarquee = (_e: PointerEvent) => {
    stopAutoScroll()
    isActive.value = false
    rect.value = null
    previouslySelected.clear()
  }

  return {
    isActive,
    rect,
    scrollOffset,
    startMarquee,
    updateMarquee,
    endMarquee,
  }
}
