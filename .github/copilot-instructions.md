# RNS Show Watch List - GitHub Copilot Instructions

**Always follow these instructions first and only search for additional context if the information here is incomplete or found to be in error.**

## Project Overview
RNS Show Watch List is a static HTML/CSS/JavaScript web application for tracking anime and shows. It replaces an Excel-based system with a modern, responsive web interface featuring real-time search, filtering, progress tracking, and data export capabilities.

## Key Technologies
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Data**: JSON files with localStorage persistence
- **Icons**: Font Awesome (CDN)
- **Architecture**: Static web application (no build system required)

## Setup and Development

### Prerequisites
No special dependencies required. The application runs directly in any modern web browser.

### Quick Setup (VALIDATED - Works Every Time)
```bash
cd /path/to/RNS-Show-Watch-List
```

**Option 1: Direct Browser Access**
```bash
# Open index.html directly in browser
open index.html  # macOS
# or
xdg-open index.html  # Linux
# or just double-click index.html in file manager
```

**Option 2: Python HTTP Server (VALIDATED - Instant startup)**
```bash
python3 -m http.server 8000
# Navigate to http://localhost:8000
# TIMING: Starts instantly, loads in <1 second
```

**Option 3: Node.js Server (VALIDATED - Takes 10-15 seconds first run)**
```bash
npx serve . -p 8001
# Navigate to http://localhost:8001
# TIMING: First run takes 10-15 seconds (downloads serve package)
# Subsequent runs: <2 seconds
```

**Option 4: PHP Server (VALIDATED - Instant startup)**
```bash
php -S localhost:8002
# Navigate to http://localhost:8002
# TIMING: Starts instantly
```

### Data Analysis (VALIDATED)
```bash
python3 analyze_data.py
# TIMING: Completes in <0.1 seconds
# Analyzes shows_data.json for data quality issues
```

## Application Structure

### Core Files
- **`index.html`** - Main application page with responsive layout
- **`script.js`** - Application logic (search, filter, progress tracking)
- **`styles.css`** - Modern CSS with mobile-first responsive design
- **`shows_data.json`** - Show database (71 entries, some data quality issues)
- **`analyze_data.py`** - Data quality analysis script

### Data Structure
Each show entry contains:
```javascript
{
  "id": "unique-id",
  "name": "Show Name",
  "status": "Watching|Completed|Planned|On Hold|etc", // 17 different values currently
  "watched_episode": 0,
  "total_episodes": 12,
  "progress": 0,
  "rating": 0-5,
  "genre": "",
  "year": "",
  "link": "",
  "notes": ""
}
```

## Known Data Quality Issues (IMPORTANT)
- **Status Inconsistency**: 17 different status values instead of 5 standard ones
- **Missing Episode Data**: 91.5% of shows missing total_episodes
- **Missing Metadata**: 100% missing genre, year, link, notes
- **Data Quality Score**: 13.4/100

## Validation Scenarios

### ALWAYS Test These After Changes
1. **Search Functionality**: Search for "Dr. Stone" - should filter to 1 result
2. **Episode Increment**: Click + button next to any show - should update count and progress bar
3. **Export Feature**: Click "Export JSON" - should download file instantly
4. **Status Filter**: Change status dropdown - should filter results
5. **Mobile Responsive**: Resize browser to 375x667 - should display mobile layout
6. **Data Persistence**: Refresh page - changes should persist via localStorage

### Complete User Workflow Test
```bash
# 1. Start server and open application
python3 -m http.server 8000

# 2. Search for a show
# 3. Increment episode count using + button
# 4. Export data to verify changes
# 5. Clear search and verify changes persisted
# 6. Test mobile view by resizing browser
```

## Performance Characteristics (MEASURED)
- **Initial Load**: <1 second (71 shows, instant rendering)
- **Search Response**: Real-time (no delay)
- **Data Export**: Instant download
- **Episode Update**: Immediate visual feedback
- **Mobile Responsive**: Instant layout adjustment
- **Data Analysis**: 0.025 seconds for full quality report

## Development Workflow

### Making Changes
1. **ALWAYS** test in browser first before committing
2. **ALWAYS** verify mobile responsiveness (375px width minimum)
3. **ALWAYS** test core user scenarios after changes
4. **NO BUILD PROCESS** - changes are immediately visible on refresh

### Data Management
```bash
# Check data quality
python3 analyze_data.py

# Expected output shows current issues:
# - 17 unique status values (should be 5)
# - 91.5% missing episode data
# - Data quality score: 13.4/100
```

### Common Tasks

**Adding New Features**:
- Edit `script.js` for functionality
- Edit `styles.css` for styling
- Test immediately in browser
- No compilation or build step required

**Fixing Data Issues**:
- Analyze with `python3 analyze_data.py`
- Edit `shows_data.json` directly
- Refresh browser to see changes
- Consider status value standardization

**Testing Status Filter Issues**:
- Current filter only shows standard values (Watching, Current, Completed, Planned, On Hold)
- Actual data contains: "Watching 1", "/wd", "Adult", "Check 2", "Meh 01", etc.
- Many shows won't appear in filter results due to non-standard status values

## File Locations

### Frequently Modified Files
- `/script.js` - Main application logic
- `/styles.css` - Visual styling and responsive design
- `/shows_data.json` - Show database
- `/index.html` - Page structure and modals

### Documentation
- `/README.md` - User-facing documentation
- `/PROJECT_MANAGER_REPORT.md` - Detailed project analysis
- `/DEBUGGING_REPORT.md` - Technical analysis and recommendations

### Validation Tools
- `/analyze_data.py` - Data quality analysis (runs in <0.1 seconds)

## Browser Compatibility (VALIDATED)
- Chrome 60+ ✅
- Firefox 55+ ✅
- Safari 12+ ✅
- Edge 79+ ✅
- Mobile browsers ✅ (tested at 375x667)

## Critical Notes

### NEVER Cancel These Operations (All Complete Quickly)
- **Data Analysis**: 0.025 seconds - NEVER CANCEL
- **Server Startup**: <2 seconds for most servers - NEVER CANCEL
- **NPX Serve First Run**: 10-15 seconds download - NEVER CANCEL, wait for completion

### Data Persistence Behavior
- **localStorage**: Changes persist per domain/port
- **Fresh Data**: Each new server port starts with original data
- **Export**: Always reflects current localStorage state

### Mobile Testing Requirements
- **ALWAYS** test at 375px width minimum
- **ALWAYS** verify touch-friendly controls work
- **ALWAYS** check responsive grid layout

## Common Fixes

### Status Filter Issues
Problem: Filter shows limited results
Solution: Status values in data don't match filter options. Need to standardize status values or update filter options.

### Missing Episode Data
Problem: Shows display "Episodes: 0 / ?"
Solution: Research and populate missing total_episodes data, likely requires external API integration.

### Search Not Working
Problem: Search returns no results
Solution: Check JavaScript console for errors, verify shows_data.json loads correctly.

## Screenshot Reference
![Mobile Responsive Design](https://github.com/user-attachments/assets/ab5c690d-56cc-48be-a091-822da18b2e68)

The application features a modern responsive design that works seamlessly across desktop and mobile devices.