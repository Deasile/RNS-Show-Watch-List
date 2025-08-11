# RNS Show Watch List - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Run the Application
- **Start web server**: `cd /path/to/repository && python3 -m http.server 8000` -- takes 2 seconds to start. NEVER CANCEL.
- **Alternative web servers**:
  - Node.js: `npx serve .` (if Node.js is available)
  - PHP: `php -S localhost:8000` (if PHP is available)
- **Access application**: Open `http://localhost:8000` in browser
- **Direct file access**: Simply open `index.html` in any modern web browser (works offline)

### Key Technologies
- **Frontend**: Pure HTML5, CSS3, vanilla JavaScript (no frameworks)
- **Data**: JSON file (`shows_data.json`) + localStorage for user modifications
- **Icons**: FontAwesome CDN
- **No build system required** - Static files only

### Data Analysis and Quality
- **Run data analysis**: `python3 analyze_data.py` -- takes 3 seconds. Provides detailed statistics on data quality.
- **Current dataset**: 71+ shows with various statuses and progress tracking
- **Data validation**: Script identifies missing metadata, duplicate entries, and data quality issues

## Validation

### Always Test These Core Scenarios After Making Changes
1. **Application loads correctly**:
   - Start web server
   - Navigate to application
   - Verify all 71+ shows display with proper styling
   - Confirm statistics show correct counts
   
2. **Search and filtering**:
   - Type in search box (e.g., "stone") - should filter in real-time
   - Use status filter dropdown - should update results immediately
   - Test sorting by name, progress, rating, status
   
3. **Episode tracking**:
   - Click `+` button on any show - episode count should increment
   - Verify progress bar updates automatically
   - Check if show auto-completes when reaching total episodes
   
4. **Add new shows**:
   - Click floating `+` button to open modal
   - Fill form with test data and submit
   - Verify new show appears in list with correct data
   
5. **Export functionality**:
   - Click "Export JSON" button - should download file immediately
   - Click "Export CSV" button - should download CSV format
   - Verify exported data includes all current modifications

### Manual Validation Requirements
- **ALWAYS** run through at least one complete end-to-end scenario after making changes
- **Screenshot testing**: Take screenshots of any UI changes to verify visual correctness
- **Data persistence**: Test that localStorage modifications persist across page reloads
- **Cross-browser**: Test on Chrome, Firefox, Safari if making CSS/JS changes

## Common Tasks

### Repository Structure
```
.
├── README.md                     # Comprehensive project documentation
├── index.html                   # Main application HTML
├── script.js                    # Application JavaScript (15KB)
├── styles.css                   # Application CSS (9KB)
├── shows_data.json              # Main data file (71+ shows, 22KB)
├── full_shows_data.json         # Extended dataset
├── analyze_data.py              # Data quality analysis tool
├── Copy of Watch List.xlsx      # Original Excel data source
├── DEBUGGING_REPORT.md          # Development debugging info
├── PROJECT_MANAGER_REPORT.md    # Project management details
└── .github/
    └── copilot-instructions.md  # This file
```

### Key File Locations
- **Main application**: `index.html` (entry point)
- **JavaScript logic**: `script.js` (all functionality)
- **Styling**: `styles.css` (responsive design)
- **Data source**: `shows_data.json` (primary dataset)
- **Analytics**: `analyze_data.py` (data quality tool)

### Frequent Operations

#### Making JavaScript Changes
1. Edit `script.js` for functionality changes
2. Refresh browser to see changes immediately (no build step)
3. Test core scenarios listed above
4. Check browser console for any errors

#### Making CSS Changes  
1. Edit `styles.css` for visual changes
2. Refresh browser to see changes immediately
3. Test responsive design on different screen sizes
4. Verify accessibility and color contrast

#### Data Modifications
1. **Live data**: Edit via application UI (persists in localStorage)
2. **Source data**: Edit `shows_data.json` directly for permanent changes
3. **Analysis**: Run `python3 analyze_data.py` to validate data quality
4. **Backup**: Export data regularly using application export feature

### Performance Expectations
- **Server startup**: 2 seconds maximum
- **Application load**: Instant (no build process)
- **Data loading**: Under 1 second for 71+ shows
- **Search/filter**: Real-time response
- **Export operations**: Immediate download

### Development Workflow
1. **Make changes** to HTML/CSS/JS files
2. **Refresh browser** to see changes (no compilation needed)
3. **Test functionality** using validation scenarios above
4. **Run data analysis** if modifying data structures
5. **Export test data** to verify export functionality works

## Troubleshooting

### Application Not Loading
1. Verify web server is running on correct port
2. Check browser console for JavaScript errors
3. Ensure `shows_data.json` exists and is valid JSON
4. Try opening `index.html` directly in browser

### Data Issues
1. Run `python3 analyze_data.py` to identify problems
2. Check localStorage for corrupted user modifications: Open browser DevTools → Application → Local Storage
3. Clear localStorage to reset to original data: `localStorage.clear()`
4. Validate JSON syntax in `shows_data.json`

### Styling Problems
1. Check for CSS syntax errors in browser DevTools
2. Verify FontAwesome CDN is accessible (internet required)
3. Test responsive design on different viewport sizes
4. Clear browser cache if styles appear stale

### Performance Issues
1. **Never an issue** - Application is optimized for instant loading
2. If slow: Check if data file has grown too large (>100MB would be problematic)
3. Ensure browser has sufficient memory for large datasets

## Critical Notes

- **No build system**: This is intentional - changes are immediately visible
- **No dependencies**: Pure web technologies only, works offline except for FontAwesome icons
- **Data persistence**: User modifications stored in browser localStorage, not in JSON file
- **Cross-platform**: Works on any device with a modern web browser
- **Zero installation**: Just open `index.html` or serve with any web server

Always test the complete user workflow from loading → searching → updating → exporting to ensure full functionality after any changes.