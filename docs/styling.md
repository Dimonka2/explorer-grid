# Styling Guide

Explorer Grid provides multiple ways to customize its appearance: CSS custom properties, class overrides, and complete style replacement.

## Quick Start

Import the default styles:

```ts
import 'vue-explorer-grid/styles'
```

Or import in CSS:

```css
@import 'vue-explorer-grid/styles';
```

## CSS Custom Properties

The easiest way to customize the look is via CSS custom properties. Set them on `.eg-root` or any parent element:

```css
.eg-root {
  /* Container focus ring */
  --eg-focus-ring-color: #0066cc;

  /* Item focus outline */
  --eg-focus-color: #0078d4;

  /* Selected item styling */
  --eg-selected-border: #0078d4;
  --eg-selected-bg: rgba(0, 120, 212, 0.3);

  /* Marquee (rubber-band) selection */
  --eg-marquee-border: #0066cc;
  --eg-marquee-bg: rgba(0, 102, 204, 0.1);

  /* Empty state text */
  --eg-empty-color: #666;
}
```

### Example: Dark Theme

```css
.dark .eg-root {
  --eg-focus-ring-color: #58a6ff;
  --eg-focus-color: #58a6ff;
  --eg-selected-border: #58a6ff;
  --eg-selected-bg: rgba(88, 166, 255, 0.2);
  --eg-marquee-border: #58a6ff;
  --eg-marquee-bg: rgba(88, 166, 255, 0.1);
  --eg-empty-color: #8b949e;
}
```

### Example: Custom Brand Colors

```css
.eg-root {
  --eg-focus-ring-color: #7c3aed;
  --eg-focus-color: #7c3aed;
  --eg-selected-border: #7c3aed;
  --eg-selected-bg: rgba(124, 58, 237, 0.2);
  --eg-marquee-border: #7c3aed;
  --eg-marquee-bg: rgba(124, 58, 237, 0.1);
}
```

## CSS Classes

### Container Classes

| Class | Description |
|-------|-------------|
| `.eg-wrapper` | Outer wrapper (flex container) |
| `.eg-root` | Main scrollable container |
| `.eg-scroll-container` | Inner container with full content height |

### Item Classes

| Class | Description |
|-------|-------------|
| `.eg-item` | Base item styling |
| `.eg-item--selected` | Applied to selected items |
| `.eg-item--focused` | Applied to the focused item |

### Other Classes

| Class | Description |
|-------|-------------|
| `.eg-marquee` | Marquee selection overlay |
| `.eg-empty` | Empty state container |
| `.eg-sr-only` | Screen reader only (visually hidden) |

## Overriding Styles

### Selection Indicator

The default selection uses a `box-shadow` ring and semi-transparent overlay:

```css
/* Change selection ring color */
.eg-item--selected {
  box-shadow: 0 0 0 3px #ff6600;  /* Orange ring */
}

/* Change to solid background without overlay */
.eg-item--selected {
  box-shadow: none;
  background-color: rgba(0, 120, 212, 0.2);
}

.eg-item--selected::before {
  display: none; /* Remove the overlay */
}
```

### Focus Indicator

The focus indicator also uses `box-shadow` for consistent styling:

```css
/* Thicker focus ring */
.eg-item--focused {
  box-shadow: 0 0 0 3px #60a5fa;
}

/* Combined focus + selected uses layered shadows */
.eg-item--focused.eg-item--selected {
  box-shadow: 0 0 0 2px #60a5fa, 0 0 0 4px #0078d4;
}

/* Focus ring only on keyboard navigation */
.eg-root:not(:focus-visible) .eg-item--focused {
  box-shadow: none;
}
```

### Marquee Style

```css
/* Dashed border marquee */
.eg-marquee {
  border: 2px dashed var(--eg-marquee-border);
  background: transparent;
}

/* Rounded marquee */
.eg-marquee {
  border-radius: 4px;
}
```

## Styling the Item Slot

Your item content is rendered inside `.eg-item`. The item container handles selection/focus states, so your content should be sized to fill the container:

```vue
<template #item="{ item, selected, focused }">
  <div class="my-item">
    <img :src="item.thumbnail" />
    <span>{{ item.name }}</span>
  </div>
</template>

<style>
.my-item {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-sizing: border-box;
}

.my-item img {
  max-width: 100%;
  max-height: 60%;
  object-fit: contain;
}
</style>
```

### Responding to Selection/Focus in Custom Items

If you want additional visual feedback inside your items:

```vue
<template #item="{ item, selected, focused }">
  <div
    class="my-item"
    :class="{
      'my-item--selected': selected,
      'my-item--focused': focused
    }"
  >
    {{ item.name }}
  </div>
</template>

<style>
.my-item--selected {
  font-weight: bold;
}

.my-item--focused {
  text-decoration: underline;
}
</style>
```

## Complete Style Replacement

If you prefer not to use the default styles at all, don't import them. Instead, provide your own styles for the required classes:

```css
/* Minimum required styles */
.eg-root {
  position: relative;
  overflow: auto;
  outline: none;
}

.eg-scroll-container {
  position: relative;
}

.eg-item {
  position: absolute;
  box-sizing: border-box;
}

.eg-marquee {
  position: absolute;
  pointer-events: none;
}

.eg-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## High Contrast Mode

The default styles include support for Windows High Contrast Mode using the `forced-colors` media query:

```css
@media (forced-colors: active) {
  .eg-item--selected {
    box-shadow: 0 0 0 3px Highlight;
    forced-color-adjust: none;
  }

  .eg-item--selected::before {
    background: Highlight;
    opacity: 0.2;
  }

  .eg-item--focused {
    box-shadow: 0 0 0 2px Highlight;
  }

  .eg-item--focused.eg-item--selected {
    box-shadow: 0 0 0 2px Highlight, 0 0 0 4px Highlight;
  }

  .eg-marquee {
    border: 2px solid Highlight;
    background: transparent;
  }
}
```

If you override styles, ensure you maintain high contrast mode support for accessibility.

## Z-Index Considerations

The default styles use these z-index values:

| Element | z-index | Purpose |
|---------|---------|---------|
| `.eg-item--focused` | `1` | Focused item above siblings |
| `.eg-item--selected::before` | `999` | Selection overlay above item content |
| `.eg-marquee` | `10` | Marquee above items |

If your items contain elements with high z-index values, you may need to adjust these.

## Performance Tips

1. **Avoid expensive selectors** in item styles - they apply to many elements
2. **Use `will-change: transform`** sparingly - it can increase memory usage
3. **Prefer transforms over layout-triggering properties** for animations
4. **Keep item DOM structure simple** - fewer elements = better scroll performance
