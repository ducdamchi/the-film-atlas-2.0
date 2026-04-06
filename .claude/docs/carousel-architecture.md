# Carousel Architecture

A responsive, infinite-looping carousel with clone-based seamless wrapping. Supports variable items per slide based on screen width, handles odd-count item sets, and debounces rapid clicks. Built in React with pure CSS transforms.

---

## Component Overview

A typical implementation splits responsibility across three layers:

| Layer          | Role                                                  |
| -------------- | ----------------------------------------------------- |
| **Parent**     | Computes responsive layout metrics, passes props down |
| **Controller** | Owns navigation state and edge-case transition logic  |
| **Renderer**   | Renders clones + real slides, handles CSS transform   |

---

## Core Concept: Clone-Based Infinite Loop

The carousel maintains the illusion of infinite scrolling by placing **clone slides** on both ends of the real slides:

```
[ left clones (last N items) ] [ real slides ] [ right clones (first N items) ]
```

- The visible window starts at index `1` (first real slide), not `0`.
- When the user slides past the last real slide into the right clone, the carousel instantly (no transition) jumps to the real equivalent position.
- Same in reverse for the left clone.

### Why this works

CSS transitions animate the `translateX` movement. When you jump from the clone position back to the real position, you set `transition: none` first, move instantly, then re-enable transitions. The user never sees the jump.

---

## State Architecture

### In the Parent (computed, passed as props)

| State            | Type     | Description                                                |
| ---------------- | -------- | ---------------------------------------------------------- |
| `screenWidth`    | `number` | Tracks `window.innerWidth` via resize listener             |
| `itemsPerSlide`  | `number` | Items shown per slide, derived from responsive breakpoints |
| `numSlidesIndex` | `number` | Max slide index: `floor(total / itemsPerSlide) + 2 - 1`    |
| `oddItems`       | `number` | Remainder: `total % itemsPerSlide`                         |

### In the Controller (navigation state)

| State                            | Type      | Description                                                           |
| -------------------------------- | --------- | --------------------------------------------------------------------- |
| `carouselIndex`                  | `number`  | Current slide index (1-based; 0 and numSlidesIndex are clones)        |
| `isEdgeTransition`               | `boolean` | When `true`, disables CSS transition for instant position reset       |
| `slidesOffset`                   | `number`  | Fractional offset (`oddItems / itemsPerSlide`) for odd-count handling |
| `rightDisabled` / `leftDisabled` | `boolean` | Debounce flags to prevent click spam                                  |

### In the Renderer (render state)

| State     | Type             | Description                  |
| --------- | ---------------- | ---------------------------- |
| `hoverId` | `number \| null` | ID of currently hovered item |

---

## Key Formulas

### Number of slides index

```js
numSlidesIndex = Math.floor(numItems / itemsPerSlide) + 2 - 1;
//                                                     ^ 2 clone slides
//                                                             ^ convert count to max index
```

### CSS transform translation

```js
transform: `translateX(calc((${carouselIndex} + ${slidesOffset}) * -100%))`;
```

Each "slide unit" is 100% of the container width. Moving to index `n` shifts left by `n * 100%`. `slidesOffset` nudges by a fractional slide to compensate for odd-count remainders.

### Odd items offset

```js
slidesOffset = oddItems / itemsPerSlide;
// e.g. 7 items, 3 per slide → oddItems = 1 → offset = 0.333...
```

This fractional shift ensures the last partial slide lines up correctly.

### Responsive breakpoints

Define breakpoints appropriate to your design. For each breakpoint range, set `itemsPerSlide` to how many items should be visible at once. Example structure:

```js
if (screenWidth <= SM_BREAKPOINT)                          → itemsPerSlide = 1
if (screenWidth > SM_BREAKPOINT && < LG_BREAKPOINT)        → itemsPerSlide = 2
if (screenWidth >= LG_BREAKPOINT)                          → itemsPerSlide = 3
```

---

## Edge Case Logic (`handleEdgeCase`)

Called on every slide navigation. Handles the two boundary conditions:

### Sliding right → past the last slide (`newIndex === numSlidesIndex`)

**No odd items:**

```
wait [transition duration] → disable transition → jump to index 1
```

**With odd items, currently no offset:**

```
Set slidesOffset immediately → move to (numSlidesIndex - 1)
// This reveals the odd partial slide without a jump
```

**With odd items, already has offset (on last real slide):**

```
wait [transition duration] → clear offset → disable transition → jump to index 1
```

### Sliding left → past the first slide (`newIndex === 0`)

**No odd items:**

```
wait [transition duration] → disable transition → jump to (numSlidesIndex - 1)
```

**With odd items, currently no offset:**

```
wait [transition duration] → set slidesOffset → disable transition → jump to (numSlidesIndex - 1)
```

**With odd items, already has offset:**

```
Clear slidesOffset immediately → move to index 1
```

### Disabling CSS transition (`isEdgeTransition`)

```js
setEdgeTransition(true);
// Renderer reads this: transition = isEdgeTransition ? 'none' : 'transform [duration] ease-in-out'
setTimeout(() => setEdgeTransition(false), 300); // re-enable after brief moment
```

---

## Click Debounce

```js
function disableClickTemp(time_ms) {
  setRightDisabled(true);
  setLeftDisabled(true);
  setTimeout(() => {
    setRightDisabled(false);
    setLeftDisabled(false);
  }, time_ms);
}
// Called on every click with a duration matching or slightly exceeding the transition duration
// Prevents mid-animation double-clicks
```

---

## Clone Rendering

```jsx
{/* Left clones: last N real items */}
items.slice(-itemsPerSlide).map(item => ...)

{/* Real slides */}
items.map(item => ...)

{/* Right clones: first N real items */}
items.slice(0, itemsPerSlide).map(item => ...)
```

Each item gets `width: ${100 / itemsPerSlide}%` so N items fill the container exactly.

---

## Font / Content Scaling (Optional)

A `ResizeObserver` can watch the first item's container width and use it to scale content proportionally:

```js
fontSize: `${containerWidth * TITLE_SCALE_FACTOR}px`;
```

This keeps text or other sized content visually consistent across all breakpoints without media queries.

---

## Navigation State Persistence (Return from Detail Page)

When navigating to a detail page, pass the current carousel position via router state:

```js
state={{ currentIndex: carouselIndex, currentOffset: slidesOffset }}
```

On mount in the renderer, restore position without an animation:

```js
const { returnToIndex, returnToOffset } = location.state || {};
if (returnToIndex !== undefined) {
  // Disable transition, restore position, re-enable after brief moment
  container.style.transition = "none";
  setCarouselIndex(returnToIndex);
  setSlidesOffset(returnToOffset);
  setTimeout(() => {
    container.style.transition = "...";
  }, 100);
}
```

---

## Replication Checklist

To build this carousel in another project:

1. **Data**: Array of items to display.
2. **Parent**: Compute `itemsPerSlide`, `numSlidesIndex`, `oddItems` from data length and screen width.
3. **Controller**: Manage `carouselIndex` (start at 1), `isEdgeTransition`, `slidesOffset`, debounce flags.
4. **Renderer**: Render `[left clones][real items][right clones]` in a flex container.
5. **Transform**: `translateX(calc((index + offset) * -100%))` on the flex container.
6. **Transition**: `transform [duration] ease-in-out`, disabled when `isEdgeTransition = true`.
7. **Edge logic**: On boundary index, `setTimeout([duration])` → flip `isEdgeTransition` → jump to opposite real index.
8. **Odd handling**: When `total % itemsPerSlide ≠ 0`, use `slidesOffset` fractional shift on the last slide.
9. **Debounce**: Disable buttons for ~[transition duration + buffer]ms after each click.
