# ScrollSequence

**Smooth, light-weight, performance-optimized image sequence scrolling, do that like Apple!**

ScrollSequence allows you to create high-performance frame-by-frame scroll animations (like Apple & Sony) using HTML5 Canvas. It's framework-agnostic, responsive, and designed for speed.

## Features

- **High Performance**: Uses HTML5 Canvas for high fps rendering, avoiding heavy DOM reflows.
- **Responsive Breakpoints**: Load different image sequences for each breakpoint you provide to save bandwidth & fit better your UI.
- **Smart Buffering**: Choose between `eager` loading (all frames at once) or `lazy` loading (load on scroll position) to optimize initial load time and avoid bottlenecks.
- **Flexible Fit**: Draw your frames as you want with `cover` or `contain` fit.
- **Scroll Trigger**: Scroll trigger support for smooth scrolling experience, and reuse the GSAP scroll trigger configs.
- **Reduced Motion**: Respects user's `prefers-reduced-motion` settings automatically with a `<img />` simple tag as fallback.
- **Framework Agnostic**: Core library written in pure TypeScript, with official wrappers for **React**, **Vue**, and **JS**.

## Packages

| Package | Description | Size | Version |
|---------|-------------|------|---------|
| [`@scroll-sequence/core`](./packages/core) | The core logic engine | ![size](https://img.shields.io/bundlephobia/minzip/@scroll-sequence/core) | ![npm](https://img.shields.io/npm/v/@scroll-sequence/core) |
| [`@scroll-sequence/vanilla`](./packages/vanilla) | Wrapper for Vanilla JS | ![size](https://img.shields.io/bundlephobia/minzip/@scroll-sequence/vanilla) | ![npm](https://img.shields.io/npm/v/@scroll-sequence/vanilla) |
| [`@scroll-sequence/react`](./packages/react) | Wrapper for React | ![size](https://img.shields.io/bundlephobia/minzip/@scroll-sequence/react) | ![npm](https://img.shields.io/npm/v/@scroll-sequence/react) |
| [`@scroll-sequence/vue`](./packages/vue) | Wrapper for Vue | ![size](https://img.shields.io/bundlephobia/minzip/@scroll-sequence/vue) | ![npm](https://img.shields.io/npm/v/@scroll-sequence/vue) |

## 🛠 Installation

Using your preferred package manager:

```bash
# JS
npm install @scroll-sequence/vanilla

# React
npm install @scroll-sequence/react

# Vue
npm install @scroll-sequence/vue


```
HTML
```html 
<script src="https://unpkg.com/@scroll-sequence/vanilla@latest/dist/scroll-sequence.min.js"></script>
``` 

## Quick Start

### Vanilla JS

```html
<script src="https://unpkg.com/@scroll-sequence/vanilla@latest/dist/scroll-sequence.min.js"></script>
<!-- ... -->

<!-- ...Setup your DOM -->
<div id="sequence-container" class="scroll-sequence container">
  <canvas id="sequence-canvas" class="scroll-sequence canvas"></canvas>
</div>

<!-- ... -->
<!-- your JS -->
<script>
const sequence = new ScrollSequence({
  container: document.querySelector('#sequence-container'),
  canvas: document.querySelector('#sequence-canvas'),
  assetsConfig: [
    {
      name: 'hero',
      url: '/assets/images',
      frameFirstId: 1,
      frameLastId: 200,
      frameDigits: 4,
      frameSuffix: '.jpg'
    }
  ],
  scrollConfig: {
    scrub: true,
    start: 'top top'
  }
});

// Clean up when dont need it anymore
// sequence.destroy();
</script>
```

### React

```tsx
import { ScrollSequence } from '@scroll-sequence/react';


const assets = [
  {
    name: 'hero-sequence',
    url: '/assets/sequence',
    frameDigits: 4,
    frameFirstId: 1,
    frameLastId: 200,
    frameSuffix: '.jpg'
  }
];

export default function Hero() {
  return (
    <div style={{ height: '300vh' }}>
      <ScrollSequence
        assetsConfig={assets}
        drawMode="cover"
        scrollConfig={{
          start: 'top top',
          end: 'bottom bottom',
          scrub: true
        }}
      />
    </div>
  );
}
```

### Vue

```vue
<script setup>
import { ScrollSequence } from '@scroll-sequence/vue';

const assets = [{
  name: 'hero-sequence',
  url: '/assets/sequence',
  frameDigits: 4,
  frameLastId: 200
}];
</script>

<template>
  <div style="height: 300vh">
    <ScrollSequence 
      :assetsConfig="assets" 
      drawMode="cover"
    />
  </div>
</template>
```

## Responsive Breakpoints

Load smaller images for mobile devices to improve performance:

```ts
const assets = [
  // Mobile: 0px - 768px
  {
    name: 'mobile-seq',
    url: '/assets/mobile',
    breakpointMin: 0,
    breakpointMax: 768,
    frameLastId: 100
  },
  // Desktop: 769px+
  {
    name: 'desktop-seq',
    url: '/assets/desktop',
    breakpointMin: 769,
    frameLastId: 150
  }
];
```
## Attributes
|     Option    |     Type    |       Default       |   Description                  |
| ------------- | ----------- | ------------------- | ------------------------------ |
| `assetsConfig` | `Array`       | `[]`                  | Array of asset configurations  |
| `drawMode`      | `String`      | `'cover'`             | `'cover'` or `'contain'`           |
| `scrollConfig`  | `Object`      | `{}`                  | Scroll trigger configuration   |
| `networkPolicy` | `adaptive \| fallback-only` |`adaptive` | Not yet implemented


### Assets Configuration Object (`assetsConfig`)

Each object within the `assetsConfig` array defines a sequence of images and supports the following properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | **Required** | Unique identifier for the asset sequence. |
| `url` | `string` | **Required** | Base URL path where frames are located. |
| `frameFirstId` | `number` | `1` | The index of the first frame. |
| `frameLastId` | `number` | **Required** | The index of the final frame in the sequence. |
| `frameDigits` | `number` | `4` | Number of digits for zero-padding (e.g., `4` → `0001.jpg`). |
| `frameSuffix` | `string` | **Required** | File extension (e.g., `.jpg`, `.png`, `.webp`). |
| `framePrefix` | `string` | ` ` | String prepended to the frame filename. |
| `breakpointMin` | `number` | - | Minimum viewport width (px) to display this asset. |
| `breakpointMax` | `number` | - | Maximum viewport width (px) to display this asset. |
| `frameFallback` | `string \| number` | - | Frame number or image URL to show before load. |
| `renderCanvas` | `boolean` | `true` | Whether to render the sequence on the canvas. |

## Loading Configuration (`loadingConfig`)

You can control how frames are loaded (e.g., eager vs lazy, retry logic) using the `loadingConfig` prop.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `loadingMode` | `'eager' \| 'lazy'` | `'lazy'` | `'eager'` loads all immediately; `'lazy'` waits for trigger. |
| `maxRetries` | `number` | `3` | Attempts to retry failed frames. |
| `retryDelay` | `number` | `200` | Delay (ms) between retries. |
| `preloadCount` | `number` | (calculated) | Number of frames to force-load initially to be always ahead of the current scroll position of the users. |

### Loading Strategy
1.  **Sequential (Passive)**: Initial & progressive loading happens one-by-one to save bandwidth.
2.  **Parallel (Active)**: Scrubbing/lazy-loading requests neighbors in parallel for speed.
3.  **Resilience**: Auto-retries failed frames (3 attempts by default).

## License

This project is licensed under the [MIT License](LICENSE).

by [Mehmed Kurtic](https://github.com/mkurtic).
