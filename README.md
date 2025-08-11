# RNS Show Watch List

A modern, responsive web-based show tracker that replaces the Excel-based system for better performance and usability.

## 🚀 Features

### Core Functionality
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **🔍 Real-time Search** - Instantly search through your show collection
- **🎯 Advanced Filtering** - Filter by status (Watching, Completed, Planned, etc.)
- **📊 Smart Sorting** - Sort by name, progress, rating, or status
- **⭐ Rating System** - Rate shows with 1-5 stars
- **📈 Progress Tracking** - Visual progress bars and episode counters
- **💾 Local Storage** - All changes persist locally in your browser
- **📤 Export Options** - Export your data as JSON or CSV

### User Experience
- **⚡ Fast Loading** - No Excel formula calculations, instant loading
- **🎨 Modern UI** - Beautiful gradient design with smooth animations
- **📱 Mobile Optimized** - Touch-friendly controls for mobile devices
- **🌙 Visual Indicators** - Color-coded status badges and progress bars
- **➕ Easy Management** - Quick episode increment/decrement buttons

### Statistics Dashboard
- Total show count
- Currently watching count
- Completed show count
- Average progress percentage

## 🛠️ Setup Instructions

### Method 1: Simple Setup (Recommended)
1. Download or clone this repository
2. Open `index.html` in any modern web browser
3. That's it! The app will automatically load your show data

### Method 2: Local Web Server (For development)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```
Then open `http://localhost:8000` in your browser.

## 📊 Data Migration

Your show data has been automatically converted from the Excel file to `shows_data.json`. The conversion includes:

- **Show Names** - Extracted from "Anime Name" column
- **Status** - Current watching status
- **Progress** - Watched episodes vs total episodes
- **Links** - External links to watch shows (where available)

## 🎮 Usage Guide

### Adding Shows
1. Click the **floating "+" button** in the bottom right
2. Fill in the show details:
   - Name (required)
   - Status (Planned, Watching, Completed, On Hold)
   - Total episodes
   - Watched episodes
   - Rating (1-5 stars)
3. Click "Add Show"

### Managing Existing Shows
- **Update Episodes**: Use the +/- buttons next to episode counts
- **Rate Shows**: Click on the stars to set ratings
- **Auto-complete**: Shows automatically mark as "Completed" when you reach total episodes

### Searching and Filtering
- **Search**: Type in the search box to filter by show name
- **Filter by Status**: Use the status dropdown to show only specific statuses
- **Sort**: Choose how to sort your shows (name, progress, rating, status)

### Viewing Options
- **Grid View**: Card layout (default)
- **List View**: Compact table layout
- Toggle between views using the view button

### Data Export
- **Export JSON**: Download your complete data as JSON file
- **Export CSV**: Download as CSV for Excel/spreadsheet programs

## 🔧 Technical Details

### Technologies Used
- **HTML5** - Modern semantic markup
- **CSS3** - Flexbox/Grid layouts, CSS animations, responsive design
- **Vanilla JavaScript** - No frameworks, fast and lightweight
- **JSON** - Structured data storage
- **Local Storage** - Browser-based persistence

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance
- **Instant Loading** - No server dependencies
- **Efficient Rendering** - Virtual DOM-like updates
- **Local Storage** - Changes persist without server calls
- **Responsive** - Optimized for all screen sizes

## 📱 Mobile Features

- Touch-friendly buttons and controls
- Swipe-optimized card layout
- Mobile-responsive grid system
- Optimized typography for small screens
- Floating action button for easy access

## 🔒 Privacy & Data

- **100% Local** - All data stays in your browser
- **No Server Required** - Works completely offline
- **Your Data** - No tracking, no analytics, no external requests
- **Backup Friendly** - Export your data anytime

## 🚀 Performance Benefits vs Excel

| Feature | Excel Version | Web Version |
|---------|---------------|-------------|
| **Loading Time** | 5-10 seconds | Instant |
| **Search Speed** | Slow | Real-time |
| **Mobile Support** | Poor | Excellent |
| **Offline Access** | Requires Excel | Works offline |
| **Cross-platform** | Windows/Mac only | Any device |
| **Version Control** | Difficult | Git-friendly |
| **Sharing** | Email attachments | Share URL |

## 🔧 Customization

### Adding New Status Types
Edit the `statusFilter` options in `index.html`:
```html
<option value="Your Status">Your Status</option>
```

### Changing Colors
Modify the CSS variables in `styles.css`:
```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
}
```

### Adding New Features
The modular JavaScript structure makes it easy to add new features:
- Search filters
- Additional sorting options
- New export formats
- Integration with external APIs

## 🐛 Troubleshooting

### Shows Not Loading
1. Ensure `shows_data.json` is in the same directory as `index.html`
2. Check browser console for errors (F12)
3. Try refreshing the page

### Changes Not Saving
1. Check if localStorage is enabled in your browser
2. Try clearing browser cache
3. Ensure you're not in private/incognito mode

### Mobile Issues
1. Ensure viewport meta tag is present
2. Check for JavaScript errors on mobile
3. Test on different mobile browsers

## 🤝 Contributing

Feel free to contribute improvements:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple devices/browsers
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

**Enjoy your new show tracking experience!** 🎉

*No more waiting for Excel to load - track your shows with speed and style.*