# Examples

## Basic Usage

The simplest implementation with default settings:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ExplorerGrid } from 'vue-explorer-grid'
import 'vue-explorer-grid/styles'

interface FileItem {
  id: number
  name: string
  type: 'file' | 'folder'
}

const items = ref<FileItem[]>([
  { id: 1, name: 'Documents', type: 'folder' },
  { id: 2, name: 'Photos', type: 'folder' },
  { id: 3, name: 'report.pdf', type: 'file' },
  { id: 4, name: 'photo.jpg', type: 'file' },
])

const selectedIds = ref<Set<number>>(new Set())
</script>

<template>
  <ExplorerGrid
    v-model:selectedIds="selectedIds"
    :items="items"
    :get-id="(item) => item.id"
    :get-label="(item) => item.name"
    style="height: 400px"
  >
    <template #item="{ item }">
      <div class="file-item">
        <span class="icon">{{ item.type === 'folder' ? '📁' : '📄' }}</span>
        <span class="name">{{ item.name }}</span>
      </div>
    </template>
  </ExplorerGrid>
</template>

<style>
.file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 8px;
}

.file-item .icon {
  font-size: 32px;
}

.file-item .name {
  font-size: 12px;
  text-align: center;
  word-break: break-word;
}
</style>
```

---

## Image Gallery

A media gallery with thumbnails:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ExplorerGrid } from 'vue-explorer-grid'
import 'vue-explorer-grid/styles'

interface Photo {
  id: string
  url: string
  thumbnail: string
  title: string
}

const photos = ref<Photo[]>([
  { id: '1', url: '/photos/1.jpg', thumbnail: '/thumbs/1.jpg', title: 'Sunset' },
  { id: '2', url: '/photos/2.jpg', thumbnail: '/thumbs/2.jpg', title: 'Mountains' },
  // ... more photos
])

const selectedIds = ref<Set<string>>(new Set())

const handleOpen = (id: string, photo: Photo) => {
  // Open lightbox or navigate to photo
  window.open(photo.url)
}

const handleContextMenu = (e: MouseEvent, selection: Set<string>) => {
  e.preventDefault()
  // Show custom context menu with options like:
  // - Download selected
  // - Add to album
  // - Delete
}
</script>

<template>
  <ExplorerGrid
    v-model:selectedIds="selectedIds"
    :items="photos"
    :get-id="(p) => p.id"
    :get-label="(p) => p.title"
    :item-width="150"
    :item-height="150"
    :gap="4"
    aria-label="Photo gallery"
    @open="handleOpen"
    @contextmenu="handleContextMenu"
  >
    <template #item="{ item, selected }">
      <div class="photo-item">
        <img :src="item.thumbnail" :alt="item.title" loading="lazy" />
        <div v-if="selected" class="check-badge">✓</div>
      </div>
    </template>
  </ExplorerGrid>
</template>

<style>
.photo-item {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.check-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: #0078d4;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
</style>
```

---

## Asset Browser

A file browser with icons and metadata:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ExplorerGrid } from 'vue-explorer-grid'
import 'vue-explorer-grid/styles'

interface Asset {
  id: string
  name: string
  type: 'image' | 'video' | 'audio' | 'document' | 'archive'
  size: number
  modified: Date
}

const assets = ref<Asset[]>([/* ... */])
const selectedIds = ref<Set<string>>(new Set())
const focusedId = ref<string | null>(null)

// Computed selection info for status bar
const selectionInfo = computed(() => {
  if (selectedIds.value.size === 0) return 'No items selected'
  if (selectedIds.value.size === 1) {
    const asset = assets.value.find(a => selectedIds.value.has(a.id))
    return asset ? `${asset.name} - ${formatSize(asset.size)}` : ''
  }
  const totalSize = assets.value
    .filter(a => selectedIds.value.has(a.id))
    .reduce((sum, a) => sum + a.size, 0)
  return `${selectedIds.value.size} items selected (${formatSize(totalSize)})`
})

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const iconMap = {
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  document: '📄',
  archive: '📦',
}
</script>

<template>
  <div class="asset-browser">
    <ExplorerGrid
      v-model:selectedIds="selectedIds"
      v-model:focusedId="focusedId"
      :items="assets"
      :get-id="(a) => a.id"
      :get-label="(a) => a.name"
      :item-width="100"
      :item-height="90"
      aria-label="Asset browser"
      class="asset-grid"
    >
      <template #item="{ item }">
        <div class="asset-item">
          <span class="asset-icon">{{ iconMap[item.type] }}</span>
          <span class="asset-name">{{ item.name }}</span>
        </div>
      </template>

      <template #empty>
        <div class="empty-folder">
          <span>📂</span>
          <p>This folder is empty</p>
        </div>
      </template>
    </ExplorerGrid>

    <div class="status-bar">{{ selectionInfo }}</div>
  </div>
</template>

<style>
.asset-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.asset-grid {
  flex: 1;
  min-height: 0;
}

.asset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 4px;
}

.asset-icon {
  font-size: 28px;
}

.asset-name {
  font-size: 11px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.empty-folder {
  text-align: center;
  color: #666;
}

.empty-folder span {
  font-size: 48px;
}

.status-bar {
  padding: 4px 8px;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  font-size: 12px;
}
</style>
```

---

## Single Selection Mode

For cases where only one item can be selected (like a picker):

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { ExplorerGrid } from 'vue-explorer-grid'

const items = ref([/* ... */])
const selectedIds = ref<Set<number>>(new Set())

// Extract single selected item
watch(selectedIds, (ids) => {
  if (ids.size > 0) {
    const selectedId = [...ids][0]
    console.log('Selected:', selectedId)
  }
})
</script>

<template>
  <ExplorerGrid
    v-model:selectedIds="selectedIds"
    :items="items"
    :get-id="(item) => item.id"
    selection-mode="single"
    :marquee-enabled="false"
  >
    <template #item="{ item }">
      {{ item.name }}
    </template>
  </ExplorerGrid>
</template>
```

---

## Controlled Selection

Managing selection externally:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ExplorerGrid } from 'vue-explorer-grid'

const items = ref([/* ... */])
const selectedIds = ref<Set<number>>(new Set())
const gridRef = ref()

const selectAll = () => {
  gridRef.value?.selectAll()
}

const clearSelection = () => {
  gridRef.value?.clearSelection()
}

const selectByType = (type: string) => {
  const ids = items.value
    .filter(item => item.type === type)
    .map(item => item.id)
  selectedIds.value = new Set(ids)
}
</script>

<template>
  <div class="toolbar">
    <button @click="selectAll">Select All</button>
    <button @click="clearSelection">Clear</button>
    <button @click="selectByType('image')">Select Images</button>
  </div>

  <ExplorerGrid
    ref="gridRef"
    v-model:selectedIds="selectedIds"
    :items="items"
    :get-id="(item) => item.id"
  >
    <template #item="{ item }">{{ item.name }}</template>
  </ExplorerGrid>
</template>
```

---

## Dynamic Items

Handling items that change (search, filter, pagination):

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ExplorerGrid } from 'vue-explorer-grid'

const allItems = ref([/* ... */])
const searchQuery = ref('')
const selectedIds = ref<Set<number>>(new Set())

// Filtered items
const items = computed(() => {
  if (!searchQuery.value) return allItems.value
  const query = searchQuery.value.toLowerCase()
  return allItems.value.filter(item =>
    item.name.toLowerCase().includes(query)
  )
})

// Note: Selection is automatically pruned when items change
// If a selected item is filtered out, it's removed from selection
</script>

<template>
  <input v-model="searchQuery" placeholder="Search..." />

  <ExplorerGrid
    v-model:selectedIds="selectedIds"
    :items="items"
    :get-id="(item) => item.id"
    :get-label="(item) => item.name"
  >
    <template #item="{ item }">{{ item.name }}</template>

    <template #empty>
      <div v-if="searchQuery">
        No items match "{{ searchQuery }}"
      </div>
      <div v-else>
        No items
      </div>
    </template>
  </ExplorerGrid>
</template>
```

---

## Headless Usage

Using composables directly for full control:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExplorerGrid } from 'vue-explorer-grid'

interface Item {
  id: number
  name: string
}

const items = ref<Item[]>([/* ... */])
const containerRef = ref<HTMLElement>()
const containerWidth = ref(800)

const columnCount = computed(() =>
  Math.floor(containerWidth.value / 110) // 100px items + 10px gap
)

const grid = useExplorerGrid({
  items,
  getId: (item) => item.id,
  getLabel: (item) => item.name,
  columnCount,
  selectionMode: 'multiple',
  onOpen: (id, item) => console.log('Open:', item.name),
  onSelectionChange: (ids) => console.log('Selected:', ids.size),
})

// Custom hit testing
const hitTest = (e: PointerEvent) => {
  const target = e.target as HTMLElement
  const itemEl = target.closest('[data-item-id]')
  if (itemEl) {
    const id = Number(itemEl.getAttribute('data-item-id'))
    const index = grid.getIndexById(id)
    return { type: 'item' as const, itemId: id, index }
  }
  return { type: 'empty' as const }
}

const onPointerDown = (e: PointerEvent) => {
  grid.handlePointerDown(e, hitTest(e))
}
</script>

<template>
  <div
    ref="containerRef"
    tabindex="0"
    @keydown="grid.handleKeydown"
    @pointerdown="onPointerDown"
  >
    <div
      v-for="item in items"
      :key="item.id"
      :data-item-id="item.id"
      :class="{
        selected: grid.isSelected(item.id),
        focused: grid.focusedId.value === item.id
      }"
    >
      {{ item.name }}
    </div>
  </div>
</template>
```

---

## With Virtual Scrolling Only

If you only need virtualization without selection features:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVirtualGrid } from 'vue-explorer-grid'

const items = ref([/* large array */])
const containerRef = ref<HTMLElement>()
const containerHeight = ref(600)
const columnCount = ref(5)

const virtual = useVirtualGrid({
  containerRef,
  containerHeight,
  items,
  columnCount,
  rowHeight: 100,
  gap: 8,
  overscan: 3,
})
</script>

<template>
  <div ref="containerRef" class="container">
    <div :style="{ height: `${virtual.totalHeight.value}px` }">
      <template v-for="row in virtual.virtualRows.value" :key="row.index">
        <div
          v-for="vItem in row.items"
          :key="vItem.index"
          :style="{
            position: 'absolute',
            top: `${row.start}px`,
            left: `${vItem.columnIndex * 108}px`,
            width: '100px',
            height: '100px',
          }"
        >
          {{ items[vItem.index].name }}
        </div>
      </template>
    </div>
  </div>
</template>
```
