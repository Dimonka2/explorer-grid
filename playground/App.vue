<script setup lang="ts">
import { ref, computed } from 'vue'
import { ExplorerGrid } from '../src'
import type { ItemId, SelectionMode } from '../src'

// Demo items
interface DemoItem {
  id: number
  name: string
  color: string
}

const itemCount = ref(1000)
const itemWidth = ref(120)
const itemHeight = ref(100)
const gap = ref(8)
const selectionMode = ref<SelectionMode>('multiple')

const items = computed<DemoItem[]>(() => {
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']
  return Array.from({ length: itemCount.value }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    color: colors[i % colors.length],
  }))
})

const getId = (item: DemoItem): ItemId => item.id
const getLabel = (item: DemoItem): string => item.name

const selectedIds = ref<Set<ItemId>>(new Set())
const focusedId = ref<ItemId | null>(null)

const handleOpen = (id: ItemId, item: DemoItem) => {
  console.log('Open:', id, item)
  alert(`Opened: ${item.name}`)
}

const handleSelectionChange = (ids: Set<ItemId>) => {
  console.log('Selection changed:', ids.size, 'items')
}

const handleFocusChange = (id: ItemId | null) => {
  console.log('Focus changed:', id)
}

const handleContextMenu = (e: MouseEvent, selection: Set<ItemId>) => {
  e.preventDefault()
  console.log('Context menu:', selection.size, 'items selected')
}
</script>

<template>
  <div class="playground">
    <header class="header">
      <h1>Explorer Grid Playground</h1>
      <div class="controls">
        <label>
          Items:
          <input v-model.number="itemCount" type="number" min="0" max="100000" step="100" />
        </label>
        <label>
          Width:
          <input v-model.number="itemWidth" type="number" min="50" max="300" step="10" />
        </label>
        <label>
          Height:
          <input v-model.number="itemHeight" type="number" min="50" max="300" step="10" />
        </label>
        <label>
          Gap:
          <input v-model.number="gap" type="number" min="0" max="32" step="4" />
        </label>
        <label>
          Mode:
          <select v-model="selectionMode">
            <option value="none">None</option>
            <option value="single">Single</option>
            <option value="multiple">Multiple</option>
          </select>
        </label>
      </div>
    </header>

    <div class="status-bar">
      <span>{{ items.length }} items</span>
      <span>{{ selectedIds.size }} selected</span>
      <span>Focused: {{ focusedId ?? 'none' }}</span>
    </div>

    <main class="grid-container">
      <ExplorerGrid
        v-model:selectedIds="selectedIds"
        v-model:focusedId="focusedId"
        :items="items"
        :get-id="getId"
        :get-label="getLabel"
        :item-width="itemWidth"
        :item-height="itemHeight"
        :gap="gap"
        :selection-mode="selectionMode"
        @open="handleOpen"
        @selection-change="handleSelectionChange"
        @focus-change="handleFocusChange"
        @contextmenu="handleContextMenu"
      >
        <template #item="{ item, selected, focused }">
          <div
            class="demo-item"
            :style="{ backgroundColor: (item as DemoItem).color }"
            :class="{ selected, focused }"
          >
            <span class="demo-item-name">{{ (item as DemoItem).name }}</span>
          </div>
        </template>

        <template #empty>
          <div class="empty-state">
            <p>No items to display</p>
            <p>Increase the item count above</p>
          </div>
        </template>
      </ExplorerGrid>
    </main>

    <footer class="footer">
      <p>
        <strong>Keyboard:</strong> Arrows (navigate), Shift+Arrow (extend selection), Ctrl+Arrow (move focus),
        Space (toggle), Enter (open), Ctrl+A (select all), Escape (clear)
      </p>
      <p>
        <strong>Mouse:</strong> Click (select), Ctrl+Click (toggle), Shift+Click (range), Drag empty space (marquee)
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

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.controls input,
.controls select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.875rem;
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
  overflow: hidden;
  padding: 1rem;
}

.grid-container :deep(.eg-root) {
  height: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.demo-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.demo-item-name {
  text-align: center;
  word-break: break-word;
  padding: 0.25rem;
}

.empty-state {
  text-align: center;
  color: #999;
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
