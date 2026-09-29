import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { buildUniformLayout } from '../layout/gridLayout'
import type { GridLayout } from '../types'

export interface UseUniformLayoutOptions {
  /** The items, or just their count. */
  items: MaybeRefOrGetter<readonly unknown[] | number>
  columnCount: MaybeRefOrGetter<number>
  /** Item height in px (default 1: page sizes are then row counts). */
  rowHeight?: MaybeRefOrGetter<number>
  gap?: MaybeRefOrGetter<number>
}

/** A reactive uniform (section-less) layout, for driving the composables directly. */
export function useUniformLayout(options: UseUniformLayoutOptions): ComputedRef<GridLayout> {
  return computed(() => {
    const items = toValue(options.items)
    const count = typeof items === 'number' ? items : items.length
    return buildUniformLayout(
      count,
      toValue(options.columnCount),
      toValue(options.rowHeight ?? 1),
      toValue(options.gap ?? 0)
    )
  })
}
