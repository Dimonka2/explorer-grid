<script setup lang="ts">
import { ref, computed } from 'vue'
import { ExplorerGrid } from '../src'
import type { GridSection, ItemId, SectionKey } from '../src'

// "Photos by month": a sectioned grid over 50k photos, newest first.
// The consumer orders the items; the grid only finds where each month's run
// starts and ends (sections spec §1 / G-D1).

interface Photo {
  id: number
  name: string
  taken: Date
  color: string
}

type GroupBy = 'month' | 'year'

const photoCount = ref(50_000)
const groupBy = ref<GroupBy>('month')
const sticky = ref(true)
const headerHeight = ref(36)
const itemSize = ref(110)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']

// Deterministic pseudo-random month sizes (1..~400 photos) so sections vary,
// including single-item months and partial last rows.
const photos = computed<Photo[]>(() => {
  const out: Photo[] = []
  let seed = 7
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  let year = 2024
  let month = 11
  while (out.length < photoCount.value) {
    const size = rand() < 0.1 ? 1 + Math.floor(rand() * 3) : Math.floor(rand() * 400) + 1
    for (let i = 0; i < size && out.length < photoCount.value; i++) {
      const day = 28 - Math.floor((i / size) * 27)
      const id = out.length + 1
      out.push({
        id,
        name: `IMG_${String(id).padStart(5, '0')}`,
        taken: new Date(year, month, day),
        color: COLORS[id % COLORS.length],
      })
    }
    month--
    if (month < 0) {
      month = 11
      year--
    }
  }
  return out
})

const sectionKey = computed(() =>
  groupBy.value === 'month'
    ? (p: Photo): SectionKey => p.taken.getFullYear() * 100 + p.taken.getMonth()
    : (p: Photo): SectionKey => p.taken.getFullYear()
)

const titleOf = (key: SectionKey) => {
  const k = Number(key)
  return groupBy.value === 'month' ? `${MONTHS[k % 100]} ${Math.floor(k / 100)}` : String(k)
}
const sectionLabel = (section: GridSection) => `${titleOf(section.key)}, ${section.count} items`

const selectedIds = ref<Set<ItemId>>(new Set())
const focusedId = ref<ItemId | null>(null)
const collapsed = ref<Set<SectionKey>>(new Set())
const lastToggle = ref('')

type GridRef = {
  getSections: () => GridSection[]
  scrollToSection: (key: SectionKey) => void
  focusById: (id: ItemId) => void
}
const grid = ref<GridRef | null>(null)

const collapseAll = () => {
  collapsed.value = new Set(grid.value?.getSections().map((s) => s.key) ?? [])
}
const expandAll = () => {
  collapsed.value = new Set()
}
const jumpToYear = (year: number) => {
  const section = grid.value?.getSections().find((s) =>
    groupBy.value === 'year' ? s.key === year : Math.floor(Number(s.key) / 100) === year
  )
  if (section) grid.value?.scrollToSection(section.key)
}
const revealLast = () => grid.value?.focusById(photos.value.length)

const onToggle = (key: SectionKey, isCollapsed: boolean) => {
  lastToggle.value = `${titleOf(key)} ${isCollapsed ? 'collapsed' : 'expanded'}`
}

const years = computed(() => {
  const set = new Set<number>()
  for (const s of grid.value?.getSections() ?? []) set.add(groupBy.value === 'year' ? Number(s.key) : Math.floor(Number(s.key) / 100))
  return [...set]
})
</script>

<template>
  <div class="playground">
    <header class="header">
      <h1>Photos by month <a href="#" class="back">&larr; uniform grid</a></h1>
      <div class="controls">
        <label>
          Photos:
          <input v-model.number="photoCount" type="number" min="0" max="200000" step="1000" />
        </label>
        <label>
          Group by:
          <select v-model="groupBy" @change="expandAll">
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>
        <label><input v-model="sticky" type="checkbox" /> Sticky headers</label>
        <label>
          Header height:
          <input v-model.number="headerHeight" type="number" min="20" max="80" step="4" />
        </label>
        <label>
          Item size:
          <input v-model.number="itemSize" type="number" min="50" max="300" step="10" />
        </label>
        <button @click="collapseAll">Collapse all</button>
        <button @click="expandAll">Expand all</button>
        <button @click="revealLast">Reveal last photo</button>
        <label>
          Jump to:
          <select @change="jumpToYear(Number(($event.target as HTMLSelectElement).value))">
            <option value="" disabled selected>year</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </label>
      </div>
    </header>

    <div class="status-bar">
      <span>{{ photos.length }} photos</span>
      <span>{{ selectedIds.size }} selected</span>
      <span>Focused: {{ focusedId ?? 'none' }}</span>
      <span>{{ collapsed.size }} collapsed</span>
      <span v-if="lastToggle">{{ lastToggle }}</span>
    </div>

    <main class="grid-container">
      <ExplorerGrid
        ref="grid"
        v-model:selectedIds="selectedIds"
        v-model:focusedId="focusedId"
        v-model:collapsedSections="collapsed"
        :items="photos"
        :get-id="(p: Photo) => p.id"
        :get-label="(p: Photo) => p.name"
        :section-key="sectionKey"
        :section-header-height="headerHeight"
        :sticky-section-headers="sticky"
        :get-section-label="sectionLabel"
        :item-width="itemSize"
        :item-height="itemSize"
        :gap="6"
        aria-label="Photos"
        @section-toggle="onToggle"
      >
        <template #section-header="{ section, collapsed: isCollapsed, selectedCount, sticky: pinned, toggle, selectSection }">
          <div class="month-header" :class="{ pinned }">
            <button type="button" tabindex="-1" class="chevron" @click="toggle">
              {{ isCollapsed ? '&#9656;' : '&#9662;' }}
            </button>
            <span class="month-title">{{ titleOf(section.key) }}</span>
            <span class="month-count">{{ section.count }}</span>
            <button
              type="button"
              tabindex="-1"
              class="select-all"
              :class="{ all: selectedCount === section.count, some: selectedCount > 0 && selectedCount < section.count }"
              @click="selectSection(selectedCount === section.count ? 'remove' : 'add')"
            >
              {{ selectedCount === section.count ? 'Deselect' : 'Select' }} month
              <template v-if="selectedCount">({{ selectedCount }})</template>
            </button>
          </div>
        </template>

        <template #item="{ item, selected, focused }">
          <div class="photo" :style="{ backgroundColor: (item as Photo).color }" :class="{ selected, focused }">
            <span>{{ (item as Photo).name }}</span>
            <small>{{ (item as Photo).taken.toLocaleDateString() }}</small>
          </div>
        </template>
      </ExplorerGrid>
    </main>

    <footer class="footer">
      <p>
        <strong>Sections:</strong> Numpad - / + collapse / expand the focused photo's month. Arrows skip headers and
        collapsed months; Shift ranges skip collapsed months; Ctrl+A selects everything, collapsed included.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.playground {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #ddd;
}

.header h1 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.back {
  margin-left: 1rem;
  font-size: 0.875rem;
  font-weight: 400;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.controls input[type='number'] {
  width: 80px;
}

.status-bar {
  display: flex;
  gap: 2rem;
  padding: 0.5rem 1rem;
  background: #eee;
  border-bottom: 1px solid #ddd;
  font-size: 0.875rem;
  color: #666;
}

.grid-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 1rem;
}

.grid-container :deep(.eg-root) {
  height: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.grid-container :deep(.eg-section-header) {
  padding: 0;
  background: #fafafa;
}

.month-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  height: 100%;
  padding: 0 0.5rem;
  font-size: 0.875rem;
}

.month-header.pinned {
  background: #f0f4ff;
}

.chevron {
  border: 0;
  background: transparent;
  cursor: pointer;
  width: 1.5rem;
}

.month-title {
  font-weight: 600;
}

.month-count {
  color: #888;
}

.select-all {
  margin-left: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  cursor: pointer;
}

.select-all.some {
  border-color: #60a5fa;
}

.select-all.all {
  background: #0078d4;
  border-color: #0078d4;
  color: white;
}

.photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  color: white;
  font-size: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.footer {
  padding: 0.75rem 1rem;
  background: #333;
  color: #ccc;
  font-size: 0.75rem;
}

.footer p {
  margin: 0.25rem 0;
}

.footer strong {
  color: white;
}
</style>
