# @apfel-sequence/core

## 0.2.0

### Minor Changes

- Added progressive fallback image loading and noscript accessibility support

## 0.1.3

### Patch Changes

- **perf: diff-based `updateConfig` to avoid full engine teardown on unrelated prop changes**

  Previously, any call to `updateConfig` triggered a full teardown and reinit of all subsystems (frame loader, scroll engine, breakpoint manager), even when only an unrelated prop like `alt` or `drawMode` changed. This caused all in-flight network requests to be aborted and the first frame to reload unnecessarily.

  `updateConfig` now diffs what actually changed before deciding what to rebuild:

  - **`assetsConfig` / `networkPolicy` / DOM refs changed** → full teardown and reinit (structural change, unavoidable)
  - **`scrollConfig` changed** → only `ScrollEngine` is rebuilt; cached frames are preserved
  - **`drawMode` changed** → direct setter call on `CanvasRender`, no subsystem rebuilt
  - **`alt` / `clearCacheOnBreakpointChange`** → field update only, zero subsystem impact

  **React wrapper**: `scrollConfig` and `loadingConfig` are now stabilized with `useMemo` (keyed on primitive field values), preventing spurious `updateConfig` calls when a parent re-renders with a new inline object reference that has identical values. `clearCacheOnBreakpointChange` was also missing from the reactive update path — now included.

  **Additional fixes:**

  - `CanvasRender` caches the 2D context at construction time instead of calling `getContext('2d')` on every scroll tick
  - Removed dead code: unused `lastError` variable in retry loop, dead `stat` allocation in retry failure path, unused `markers` parameter in `initLazyLoading`, dead `cssYOffset`/`yOffset` constants in `scaleToContain`, unused `dpr` parameters in `scaleToCover` and `scaleToContain`

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- Initial beta release 0.1.0

## 1.1.2

### Patch Changes

- Added validation check for `assetsConfig` to ensure it is provided and is an array. Throws a descriptive error if missing.

## 1.1.1

### Patch Changes

- fix: use correct ESM import for ScrollTrigger to prevent bundling issues in external builds

## 1.1.0

### Minor Changes

- fix: fix component props and strictly type playground data definitions

## 1.0.1

### Patch Changes

- Fix module resolution by using .mjs for ESM build and correcting type definitions.

## 1.0.0

### Major Changes

- 5b7b7ca: Initial stable release (v1.0.0). Feature complete core with wrappers.
