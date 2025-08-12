# PC Layout Specialist Agent

## Current Mission: Fix PC Control 3 Positioning
**Status**: ACTIVE - Control 3 (watch button) still positioned too far right despite margin adjustments
**Target**: Move control 3 significantly left to group with controls 1 & 2

## Current PC Layout Analysis:
```css
.bottom-flex-controls {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: flex-start;
    margin-left: 90px;
    width: calc(100% - 110px);
    gap: 12px;
}
.bottom-flex-controls .watch-episode-btn,
.bottom-flex-controls .watch-episode-placeholder {
    margin-left: 0;  /* TRIED: 20px, 4px, 0 - NO MOVEMENT */
}
```

## Issue Analysis:
- Control 3 not responding to margin-left changes
- Possible flexbox override or inheritance issue
- May need flex-specific properties instead of margin

## Investigation Needed:
1. Check for conflicting flex properties
2. Examine watch button specific CSS rules
3. Look for width/flex-grow overrides
4. Test flex-shrink and flex-basis adjustments

## Specialist Focus:
- PC desktop layout only
- Flexbox positioning expertise
- Control 3 positioning priority
