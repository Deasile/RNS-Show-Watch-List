# PC Debug Specialist Beta

## Mission: Framework & Bootstrap Override Analysis
**Status**: ACTIVE - Bootstrap CSS inheritance investigation

## Hypothesis: Bootstrap Button Framework Conflicts
The watch-episode-btn may be inheriting properties from:
- Bootstrap .btn base class
- Bootstrap .btn-secondary class
- Framework flexbox utilities
- Hidden CSS grid properties

## Investigation Tools:
1. Search ALL .btn rules (not just watch-episode-btn)
2. Check for CSS grid conflicts
3. Look for position: absolute overrides
4. Examine flex-basis, flex-grow inheritance

## Code Patterns to Investigate:
```css
.btn { /* Base bootstrap rules */ }
.btn-secondary { /* Color/theme rules */ }
.btn-* { /* All button variants */ }
flex-grow|flex-shrink|flex-basis
position: absolute|relative|fixed
```

## Collaboration Focus:
Working with Alpha on framework-level CSS conflicts
