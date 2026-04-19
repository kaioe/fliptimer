# Clock-first Mode Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** FlipTimer starts as a real clock (HH:MM:SS, ticking up) and switches to countdown timer (MM:SS) only when the user selects a preset and starts it.

**Architecture:** The existing `Fliptimer` class already supports both count-up (`isCountdown: false`) and count-down modes. The key change is: on page load, create the clock with an `hours + minutes + seconds` face in count-up mode, initialize it to the current time, and tick every second. When a preset is applied, rebuild the face to `minutes + seconds` in countdown mode. When the preset is cleared, rebuild back to clock mode.

**Tech Stack:** Vanilla JS (ES modules + jQuery), SCSS

---

## Current State

- `Fliptimer` created with `isCountdown: true`, `face: { minutes: {maxValue:59}, seconds: {maxValue:59} }`, `startTime: "05:05"`
- On init, starts ticking down from 05:05
- Idle wall clock mode (toolbar.js) activates after 10s inactivity, shows HH:MM, toolbar fades
- Selecting a preset sets `startTime` and calls `setToTime()`
- `comparableIntToMmSsString()` only handles 4-digit (MM:SS)

## Key Files

- `fliptimer.js` — entry point, creates Fliptimer instance
- `src/fliptimer-clock.js` — clock class (init, tick, face, dimensions)
- `src/toolbar.js` — play/pause/reset handlers, idle wall clock mode
- `src/presets-ui.js` — preset selection, `applyPreset()`, `#active-preset-clear`
- `fliptimer.scss` — layout, colon separator, active-preset styles

---

### Task 1: Add `rebuildFace()` method to Fliptimer

**Objective:** Allow dynamically switching between clock face (HH:MM:SS) and countdown face (MM:SS).

**Files:**
- Modify: `src/fliptimer-clock.js`

**Step 1:** Add `rebuildFace(opts)` method that stops the clock, empties container, merges new options (face, isCountdown, startTime, maxTime, minTime), and calls `init()` + `setDimensions()`.

```js
Fliptimer.prototype.rebuildFace = function (opts) {
    this.stop();
    this.cancelPrepCountdown && this.cancelPrepCountdown();
    $.extend(this.options, opts);
    this.digitSelectors = [];
    this.init();
};
```

Place it after `stop()` around line 237.

**Step 2:** Verify no existing code calls `init()` externally — only the constructor does. Confirm `rebuildFace` is safe to call.

---

### Task 2: Add `comparableIntToHhMmSsString()` helper

**Objective:** Convert a 6-digit int (e.g. 143052) back to "14:30:52" string for the clock face.

**Files:**
- Modify: `src/fliptimer-clock.js`

Add after `comparableIntToMmSsString` (line 24):

```js
/** Inverse of timeStringToComparableInt for 6-digit HH:MM:SS faces. */
export function comparableIntToHhMmSsString(t) {
    var n = Math.max(0, Math.min(235959, parseInt(String(t), 10) || 0));
    var s = String(n);
    while (s.length < 6) {
        s = "0" + s;
    }
    return s.slice(0, 2) + ":" + s.slice(2, 4) + ":" + s.slice(4, 6);
}
```

---

### Task 3: Initialize as clock mode in fliptimer.js

**Objective:** Create Fliptimer with HH:MM:SS face, set to current time, count-up mode.

**Files:**
- Modify: `fliptimer.js`

**Step 1:** Change the initial Fliptimer creation to clock mode:

```js
function getLocalTimeHhMmSsString() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    return (h < 10 ? "0" + h : String(h)) + ":" +
           (m < 10 ? "0" + m : String(m)) + ":" +
           (s < 10 ? "0" + s : String(s));
}

var clock = new Fliptimer({
    isCountdown: false,
    startTime: getLocalTimeHhMmSsString(),
    maxTime: "23:59:59",
    minTime: "00:00:00",
    tickDuration: 1000,
    containerElement: $(".countdown"),
    face: {
        hours: { maxValue: 23 },
        minutes: { maxValue: 59 },
        seconds: { maxValue: 59 },
    },
});
```

**Step 2:** Export `getLocalTimeHhMmSsString` from fliptimer-clock.js (or just define it in fliptimer.js). The toolbar already has a similar `getLocalTimeHhMmString()` — we can extract or duplicate.

**Step 3:** Remove `clock.stop()` call in toolbar.js line 425 (initFliptimerToolbar) since we want the clock to tick on load.

---

### Task 4: Update `applyPreset()` to switch to countdown face

**Objective:** When a preset is applied, rebuild the clock with MM:SS countdown face.

**Files:**
- Modify: `src/presets-ui.js`

**Step 1:** Update `applyPreset()`:

```js
function applyPreset(p) {
    if (typeof clock.exitIdleWallClockMode === "function") {
        clock.exitIdleWallClockMode(false);
    }
    clock.cancelPrepCountdown();
    var mmss = minutesToStartTime(p.minutes);
    clock.rebuildFace({
        isCountdown: true,
        startTime: mmss,
        maxTime: mmss,
        minTime: "00:00:00",
        tickDuration: FLIPTIMER_PREP_FLIP_MS + FLIPTIMER_COUNTDOWN_TICK_BUFFER_MS,
        face: {
            minutes: { maxValue: 59 },
            seconds: { maxValue: 59 },
        },
    });
    setActivePresetUi(p);
    refreshToolbar();
}
```

Need to import `FLIPTIMER_PREP_FLIP_MS` and `FLIPTIMER_COUNTDOWN_TICK_BUFFER_MS` in presets-ui.js (check if already imported).

---

### Task 5: Update `#active-preset-clear` to switch back to clock mode

**Objective:** When user clears the active preset, rebuild clock face and start ticking current time.

**Files:**
- Modify: `src/presets-ui.js`

**Step 1:** Update the clear handler:

```js
$("#active-preset-clear").on("click", function () {
    clock.cancelPrepCountdown();
    if (typeof clock.exitIdleWallClockMode === "function") {
        clock.exitIdleWallClockMode(true);
    }
    setActivePresetUi(null);
    // Rebuild as clock
    clock.rebuildFace({
        isCountdown: false,
        startTime: getLocalTimeHhMmSsString(),
        maxTime: "23:59:59",
        minTime: "00:00:00",
        tickDuration: 1000,
        face: {
            hours: { maxValue: 23 },
            minutes: { maxValue: 59 },
            seconds: { maxValue: 59 },
        },
    });
    refreshToolbar();
});
```

---

### Task 6: Update reset button for dual mode

**Objective:** Reset button behavior depends on mode: in countdown, reset to preset time; in clock, do nothing (or sync to current time).

**Files:**
- Modify: `src/toolbar.js`

**Step 1:** Update the reset handler:

```js
$reset.on("click", function () {
    cancelPrepCountdown();
    exitIdleWallClockMode(false);
    clock.stop();
    if (clock.options.isCountdown) {
        clock.setToTime(clock.options.startTime);
    } else {
        // In clock mode, just sync to current time
        clock.setToTime(getLocalTimeHhMmSsString());
        clock.start(true);
    }
    refresh();
});
```

---

### Task 7: Simplify idle wall clock mode

**Objective:** The existing idle wall clock mode (10s inactivity → show HH:MM, fade toolbar) is redundant when the app starts as a clock. Remove or disable it.

**Files:**
- Modify: `src/toolbar.js`

**Step 1:** Remove or no-op the idle wall clock poll. Since we now always show a clock when no timer is active, the idle mode is unnecessary. The simplest approach: make `enterIdleWallClockMode()` always return early, or remove the `pollIdleWallClock` interval.

Actually — keep the idle mode for countdown pause state (when user pauses a timer, after 10s show wall clock with toolbar faded). Just don't trigger it on initial load since the clock is already showing.

The current logic already handles this: `enterIdleWallClockMode()` checks `clock.tickInterval !== false || clock.prepCountdownActive` — when clock is ticking (as a real clock), `tickInterval !== false` is true, so idle mode won't activate. Good — no change needed here.

But wait: when clock is ticking as a real clock, `tickInterval` IS false initially because `initFliptimerToolbar` calls `clock.stop()` on line 425. We need to NOT stop the clock in task 3.

---

### Task 8: Update `tryRestoreActivePresetFromStorage` for dual mode

**Objective:** On page refresh, if a preset was active, restore countdown mode; otherwise show clock.

**Files:**
- Modify: `src/presets-ui.js`

The existing `tryRestoreActivePresetFromStorage()` calls `applyPreset()` which (after task 4) will call `rebuildFace()` to switch to countdown. If no active preset, the clock stays in clock mode. This should work without changes.

But need to verify: `applyPreset` currently calls `clock.stop()` + `clock.options.startTime = mmss` + `clock.setToTime(mmss)`. After task 4, it calls `rebuildFace()` which handles everything. Good.

---

### Task 9: Update `countdown-complete` handler

**Objective:** When countdown finishes, switch back to clock mode (or stay at 00:00 and wait for user action).

**Decision needed:** After timer reaches 00:00, should it:
- (a) Stay at 00:00, play finish sound, wait for user to clear/start new timer
- (b) Auto-switch back to clock after a delay

Recommendation: (a) — stay at 00:00. The active preset remains shown. User can clear it to go back to clock, or start again. This matches the current behavior and is least surprising.

No code change needed for task 9 — current `fliptimer:countdown-complete` handler just plays sound and refreshes toolbar.

---

### Task 10: Handle `setDimensions()` after face rebuild

**Objective:** After `rebuildFace()`, `setDimensions()` must be called to recalculate card sizes for the new face (3 columns vs 2 columns).

**Files:**
- Modify: `src/fliptimer-clock.js`

**Step 1:** In `rebuildFace()`, call `setDimensions()` after `init()`:

```js
Fliptimer.prototype.rebuildFace = function (opts) {
    this.stop();
    if (typeof this.cancelPrepCountdown === "function") {
        this.cancelPrepCountdown();
    }
    $.extend(this.options, opts);
    this.digitSelectors = [];
    this.init();
    this.setDimensions();
};
```

Note: `init()` already calls `setDimensions()` internally, so this double-call is harmless but ensures the correct dimensions.

---

### Task 11: Update colon separator for 3-column clock face

**Objective:** The CSS colon separator uses `:nth-child(2n+2)` to place colons between digit pairs. With 3 columns (HH:MM:SS), colons should appear after column 1 (hours) and column 3 (minutes). Verify the existing CSS handles this.

**Files:**
- Check: `fliptimer.scss`

The current CSS:
```scss
ul.flip:nth-child(2n + 2) {
    margin-right: 0.14em;
    &:not(:last-child)::after {
        @extend %colon-separator;
    }
}
```

With 3 `ul.flip` children (hours-ten, hours-one, minutes-ten, minutes-one, seconds-ten, seconds-one = 6 elements), `:nth-child(2n+2)` targets the 2nd, 4th, 6th elements. With `:not(:last-child)`, that's 2nd and 4th. This puts a colon after the 2nd element (hours-one → after hours) and 4th (minutes-one → after minutes). That's correct for HH:MM:SS!

Wait — the face structure creates one `<ul>` per segment group column. With `face: { hours, minutes, seconds }`:
- hours creates: `fliptimer-hours-ten` (maxValue=2 → 3 items), `fliptimer-hours-one` (10 items)  
- minutes creates: `fliptimer-minutes-ten` (6 items), `fliptimer-minutes-one` (10 items)
- seconds creates: `fliptimer-seconds-ten` (6 items), `fliptimer-seconds-one` (10 items)

That's 6 `<ul>` children. `:nth-child(2n+2)` = 2nd, 4th = after hours-one and minutes-one. With `:not(:last-child)` = 2nd and 4th (6th is last). Two colons placed correctly.

For the countdown face (minutes, seconds) = 4 `<ul>` children. `:nth-child(2n+2)` = 2nd, 4th. With `:not(:last-child)` = 2nd only. One colon placed correctly.

No CSS change needed.

---

### Task 12: Handle `fliptimer-ready` class after face rebuild

**Objective:** The `.fliptimer-ready` class (opacity transition) was added after initial setup. After `rebuildFace()`, the countdown already has `.fliptimer-ready` so it should remain visible.

No change needed — `.countdown` retains its classes through `rebuildFace()` since we only empty its children, not the element itself.

---

### Task 13: Update `getLocalTimeHhMmSsString` — avoid duplication

**Objective:** Both toolbar.js and fliptimer.js need `getLocalTimeHhMmSsString`. Extract to a shared location.

**Files:**
- Modify: `src/fliptimer-clock.js` (export it)
- Modify: `src/toolbar.js` (import it)
- Modify: `fliptimer.js` (import it)

**Step 1:** Move `getLocalTimeHhMmString` from toolbar.js to fliptimer-clock.js, extend to include seconds:

In `src/fliptimer-clock.js`, add:
```js
export function getLocalTimeHhMmSsString() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    return (h < 10 ? "0" + h : String(h)) + ":" +
           (m < 10 ? "0" + m : String(m)) + ":" +
           (s < 10 ? "0" + s : String(s));
}
```

**Step 2:** In toolbar.js, replace local `getLocalTimeHhMmString` with imported `getLocalTimeHhMmSsString`. The idle wall clock still only needs HH:MM, so extract just the HH:MM part where needed (or use `.slice(0, 5)`).

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/fliptimer-clock.js` | Add `rebuildFace()`, add `getLocalTimeHhMmSsString()`, add `comparableIntToHhMmSsString()` |
| `fliptimer.js` | Init as clock mode (HH:MM:SS face, current time), import helpers |
| `src/toolbar.js` | Import shared time helper, update reset handler, remove `clock.stop()` on init |
| `src/presets-ui.js` | Update `applyPreset()` to use `rebuildFace()`, update clear handler to rebuild clock, import helpers |

## Risks & Open Questions

1. **Hours ten digit**: `hours: { maxValue: 23 }` creates `hours-ten` with `ceil(23/10) = 3` ticks (0, 1, 2). `hours-one` has 10 ticks (0-9). For 24-hour display, hours go 00-23. The ten column has digits 0, 1, 2 and one column has 0-9. When hours roll from 23→00, the ten digit needs to go from 2→0 (wrapping). Verify `doTick()` handles this correctly for count-up mode. It uses `isMaxTimeReached()` (23:59:59) → `resetDigits()`. This should work.

2. **Tick accuracy**: The clock ticks every 1000ms via `setInterval`. Over time it may drift from real time. Consider periodically syncing to `Date` on each tick (or every N ticks). For a first pass, `setInterval(fn, 1000)` is acceptable — drift is ~1s per few minutes, barely noticeable on a flip clock.

3. **CSS dimensions**: The 6-column clock face (HH:MM:SS) is wider than the 4-column countdown (MM:SS). Verify the layout handles both widths without overflow on narrow screens. The existing `max-width: min(100vw - safe-area - 16px, 100%)` on `.container` should handle this.

4. **Flip animation on second change**: Every second, the seconds digit flips. This is the expected behavior for a flip clock. The 0.5s animation + 0.5s delay means each flip takes 1s, matching the 1s tick interval. Verify this looks smooth.
