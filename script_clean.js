// Global variables
let allShows = [];
let filteredShows = [];
let isGridView = true;

// 🔍 DIAGNOSTIC ERROR TRACKING - Lightweight version
let diagnosticLog = [];
let diagnosticMode = window.location.search.includes('diagnostic=true');

function logDiagnostic(action, showId, error = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        action: action,
        showId: showId,
        error: error ? error.toString() : null,
        stack: error ? error.stack : null
    };
    
    diagnosticLog.push(entry);
    
    if (diagnosticMode) {
        console.log(`🔍 DIAGNOSTIC [${action}]:`, entry);
    }
    
    // Keep only last 100 entries
    if (diagnosticLog.length > 100) {
        diagnosticLog = diagnosticLog.slice(-100);
    }
}

// Simple extension error monitoring (non-invasive)
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        event.reason.message.includes('Could not establish connection')) {
        console.warn('🔍 EXTENSION ERROR DETECTED:', event.reason.message);
        logDiagnostic('extension_error_detected', 'unknown', event.reason);
    }
});

// Initialize DOM elements with null checks
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Application starting...');
    logDiagnostic('dom_ready', 'app');
    
    // Initialize elements with proper null checks
    window.searchInput = document.getElementById('searchInput');
    window.statusFilter = document.getElementById('statusFilter');
    window.sortBy = document.getElementById('sortBy');
    window.toggleView = document.getElementById('toggleView');
    window.showsContainer = document.getElementById('showsContainer');
    window.addShowBtn = document.getElementById('addShowBtn');
    window.addShowModal = document.getElementById('addShowModal');
    
    // Check if required elements exist
    if (!showsContainer) {
        console.error('❌ Critical element missing: showsContainer');
        logDiagnostic('missing_element', 'showsContainer');
        return;
    }
    
    if (!searchInput) {
        console.error('❌ Critical element missing: searchInput');
        logDiagnostic('missing_element', 'searchInput');
        return;
    }
    
    // Load data
    loadShows();
    setupEventListeners();
    setupKeyboardShortcuts();
    
    console.log('🎯 Application initialized');
});

// Data loading
async function loadShows() {
    logDiagnostic('load_shows_start', 'app');
    
    try {
        const response = await fetch('shows_data.json');
        const data = await response.json();
        allShows = data;
        filteredShows = [...allShows];
        
        logDiagnostic('load_shows_success', 'app');
        displayShows();
        updateAnalytics();
        setupShowCardListeners();
    } catch (error) {
        logDiagnostic('load_shows_error', 'app', error);
        console.error('Error loading shows:', error);
        showNotification('Error loading shows data', 'error');
    }
}

// Event listeners setup with null checks
function setupEventListeners() {
    logDiagnostic('setup_listeners_start', 'app');
    
    // Search
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Filters
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilter);
    }
    
    if (sortBy) {
        sortBy.addEventListener('change', handleSort);
    }
    
    // View toggle
    if (toggleView) {
        toggleView.addEventListener('click', handleViewToggle);
    }
    
    // Export buttons
    const exportJsonBtn = document.getElementById('exportJson');
    const exportCsvBtn = document.getElementById('exportCsv');
    
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportToJson);
    }
    
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCsv);
    }
    
    // Add show
    if (addShowBtn) {
        addShowBtn.addEventListener('click', openAddShowModal);
    }
    
    // Modal close
    if (addShowModal) {
        window.addEventListener('click', function(event) {
            if (event.target === addShowModal) {
                closeModal();
            }
        });
    }
    
    logDiagnostic('setup_listeners_complete', 'app');
}

// Setup show card event listeners with diagnostic tracking
function setupShowCardListeners() {
    logDiagnostic('setupShowCardListeners_start', 'all');
    
    try {
        // Episode controls with diagnostic wrapping
        document.querySelectorAll('.episode-btn').forEach(btn => {
            try {
                const wrappedHandler = function(event) {
                    const showId = event.target.dataset.showId || 'unknown';
                    logDiagnostic('episode_btn_click', showId);
                    
                    try {
                        return handleEpisodeUpdate.call(this, event);
                    } catch (error) {
                        logDiagnostic('episode_btn_error', showId, error);
                        if (error.message && error.message.includes('Could not establish connection')) {
                            console.warn('🔍 EXTENSION ERROR in episode button:', error.message);
                            return; // Suppress extension errors
                        }
                        throw error; // Re-throw non-extension errors
                    }
                };
                
                btn.addEventListener('click', wrappedHandler);
                logDiagnostic('episode_btn_listener_added', btn.dataset.showId || 'unknown');
            } catch (error) {
                logDiagnostic('episode_btn_setup_error', 'unknown', error);
                console.warn('Episode button listener error:', error);
            }
        });
        
        // Star ratings with diagnostic wrapping
        document.querySelectorAll('.star-rating i').forEach(star => {
            try {
                const wrappedHandler = function(event) {
                    const showId = event.target.closest('.star-rating').dataset.showId || 'unknown';
                    logDiagnostic('star_rating_click', showId);
                    
                    try {
                        return handleRatingUpdate.call(this, event);
                    } catch (error) {
                        logDiagnostic('star_rating_error', showId, error);
                        if (error.message && error.message.includes('Could not establish connection')) {
                            console.warn('🔍 EXTENSION ERROR in star rating:', error.message);
                            return; // Suppress extension errors
                        }
                        throw error; // Re-throw non-extension errors
                    }
                };
                
                star.addEventListener('click', wrappedHandler);
                logDiagnostic('star_rating_listener_added', star.closest('.star-rating').dataset.showId || 'unknown');
            } catch (error) {
                logDiagnostic('star_rating_setup_error', 'unknown', error);
                console.warn('Star rating listener error:', error);
            }
        });
        
        // Status dropdowns with diagnostic wrapping  
        document.querySelectorAll('.status-dropdown').forEach(dropdown => {
            try {
                const wrappedHandler = function(event) {
                    const showId = event.target.dataset.showId || 'unknown';
                    logDiagnostic('status_dropdown_change', showId);
                    
                    try {
                        return handleStatusUpdate.call(this, event);
                    } catch (error) {
                        logDiagnostic('status_dropdown_error', showId, error);
                        if (error.message && error.message.includes('Could not establish connection')) {
                            console.warn('🔍 EXTENSION ERROR in status dropdown:', error.message);
                            return; // Suppress extension errors
                        }
                        throw error; // Re-throw non-extension errors
                    }
                };
                
                dropdown.addEventListener('change', wrappedHandler);
                logDiagnostic('status_dropdown_listener_added', dropdown.dataset.showId || 'unknown');
            } catch (error) {
                logDiagnostic('status_dropdown_setup_error', 'unknown', error);
                console.warn('Status dropdown listener error:', error);
            }
        });
        
        logDiagnostic('setupShowCardListeners_success', 'all');
    } catch (error) {
        logDiagnostic('setupShowCardListeners_error', 'all', error);
        console.warn('Overall event listener setup error:', error);
    }
}

// Enhanced search with multiple criteria
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        filteredShows = [...allShows];
        applyFiltersAndSort();
        return;
    }
    
    filteredShows = allShows.filter(show => {
        // Multi-field search
        const searchableText = [
            show.name,
            show.status,
            show.genre || '',
            show.year || '',
            show.notes || ''
        ].join(' ').toLowerCase();
        
        // Handle special search operators
        if (query.startsWith('rating:')) {
            const rating = parseInt(query.split(':')[1]);
            return show.rating === rating;
        }
        
        if (query.startsWith('status:')) {
            const status = query.split(':')[1];
            return show.status.toLowerCase().includes(status);
        }
        
        if (query.startsWith('progress:')) {
            const progressOp = query.split(':')[1];
            const progress = show.total_episodes > 0 ? 
                Math.round((show.watched_episode / show.total_episodes) * 100) : 0;
            
            if (progressOp.startsWith('>')) {
                return progress > parseInt(progressOp.substring(1));
            } else if (progressOp.startsWith('<')) {
                return progress < parseInt(progressOp.substring(1));
            } else {
                return progress === parseInt(progressOp);
            }
        }
        
        // Default text search
        return searchableText.includes(query);
    });
    
    applyFiltersAndSort();
}

function handleFilter() {
    const statusValue = statusFilter.value;
    
    if (!statusValue) {
        filteredShows = [...allShows];
    } else {
        filteredShows = allShows.filter(show => show.status === statusValue);
    }
    
    handleSearch(); // Apply search on top of filter
}

function handleSort() {
    const sortValue = sortBy.value;
    
    filteredShows.sort((a, b) => {
        switch (sortValue) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'rating':
                return b.rating - a.rating;
            case 'progress':
                const progressA = a.total_episodes > 0 ? (a.watched_episode / a.total_episodes) : 0;
                const progressB = b.total_episodes > 0 ? (b.watched_episode / b.total_episodes) : 0;
                return progressB - progressA;
            case 'status':
                return a.status.localeCompare(b.status);
            default:
                return 0;
        }
    });
    
    displayShows();
}

function applyFiltersAndSort() {
    handleSort();
}

function handleViewToggle() {
    logDiagnostic('view_toggle_start', 'app');
    
    try {
        if (!showsContainer || !toggleView) {
            console.error('❌ Cannot toggle view: missing elements');
            logDiagnostic('view_toggle_error', 'app', new Error('Missing required elements'));
            return;
        }
        
        isGridView = !isGridView;
        
        if (isGridView) {
            showsContainer.className = 'shows-grid';
            toggleView.innerHTML = '<i class="fas fa-list"></i> List View';
        } else {
            showsContainer.className = 'shows-list';
            toggleView.innerHTML = '<i class="fas fa-th"></i> Grid View';
        }
        
        displayShows();
        logDiagnostic('view_toggle_success', 'app');
    } catch (error) {
        logDiagnostic('view_toggle_error', 'app', error);
        console.error('View toggle error:', error);
    }
}

function createShowCard(show) {
    const statusClass = `status-${show.status.toLowerCase().replace(/\s+/g, '-')}`;
    const progressPercentage = show.total_episodes > 0 ? 
        Math.round((show.watched_episode / show.total_episodes) * 100) : 0;
    
    const starsHtml = Array.from({length: 5}, (_, i) => {
        const isFilled = i < show.rating;
        return `<i class="${isFilled ? 'fas' : 'far'} fa-star" data-rating="${i + 1}"></i>`;
    }).join('');

    return `
        <div class="show-card" data-id="${show.id}">
            <div class="show-header">
                <div class="show-title">${escapeHtml(show.name)}</div>
                <div class="show-status-container">
                    <select class="status-dropdown" 
                            id="status-dropdown-${show.id}" 
                            name="status-dropdown-${show.id}" 
                            data-show-id="${show.id}">
                        <option value="Watching" ${show.status === 'Watching' ? 'selected' : ''}>Watching</option>
                        <option value="Completed" ${show.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Planned" ${show.status === 'Planned' ? 'selected' : ''}>Planned</option>
                        <option value="On Hold" ${show.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                        <option value="Dropped" ${show.status === 'Dropped' ? 'selected' : ''}>Dropped</option>
                        <option value="Adult" ${show.status === 'Adult' ? 'selected' : ''}>Adult</option>
                        <option value="Check Later" ${show.status === 'Check Later' ? 'selected' : ''}>Check Later</option>
                    </select>
                    <div class="show-status ${statusClass}">${escapeHtml(show.status)}</div>
                </div>
            </div>
            <div class="show-body">
                <div class="show-progress">
                    <div class="progress-text">
                        <span>Progress</span>
                        <span>${progressPercentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>Episodes: ${show.watched_episode} / ${show.total_episodes || '?'}</span>
                    </div>
                </div>
                
                <div class="show-rating">
                    <div class="star-rating" data-show-id="${show.id}">
                        ${starsHtml}
                    </div>
                </div>
                
                <div class="show-actions">
                    <button class="episode-btn" data-show-id="${show.id}" data-action="decrease">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="episode-btn" data-show-id="${show.id}" data-action="increase">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function displayShows() {
    logDiagnostic('display_shows_start', 'app');
    
    if (!showsContainer) {
        console.error('❌ Cannot display shows: showsContainer element missing');
        logDiagnostic('display_shows_error', 'app', new Error('showsContainer element missing'));
        return;
    }
    
    if (filteredShows.length === 0) {
        showsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tv"></i>
                <h3>No shows found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    showsContainer.innerHTML = filteredShows.map(show => createShowCard(show)).join('');
    setupShowCardListeners();
    logDiagnostic('display_shows_complete', 'app');
}

function handleStatusUpdate(event) {
    const showId = parseInt(event.target.dataset.showId);
    const newStatus = event.target.value;
    
    logDiagnostic('status_update_start', showId);
    
    const show = allShows.find(s => s.id === showId);
    if (show) {
        show.status = newStatus;
        saveToLocalStorage();
        updateAnalytics();
        displayShows(); // Refresh display
        showNotification(`Updated "${show.name}" status to ${newStatus}`, 'success');
        logDiagnostic('status_update_success', showId);
    }
}

function handleRatingUpdate(event) {
    const rating = parseInt(event.target.dataset.rating);
    const showId = parseInt(event.target.closest('.star-rating').dataset.showId);
    
    logDiagnostic('rating_update_start', showId);
    
    const show = allShows.find(s => s.id === showId);
    if (show) {
        show.rating = rating;
        saveToLocalStorage();
        updateAnalytics();
        displayShows(); // Refresh display
        showNotification(`Updated "${show.name}" rating to ${rating} stars`, 'success');
        logDiagnostic('rating_update_success', showId);
    }
}

function handleEpisodeUpdate(event) {
    const showId = parseInt(event.target.dataset.showId);
    const action = event.target.dataset.action;
    
    logDiagnostic('episode_update_start', showId);
    
    const show = allShows.find(s => s.id === showId);
    if (show) {
        if (action === 'increase') {
            show.watched_episode = Math.min(show.watched_episode + 1, show.total_episodes || 9999);
        } else if (action === 'decrease') {
            show.watched_episode = Math.max(show.watched_episode - 1, 0);
        }
        
        saveToLocalStorage();
        updateAnalytics();
        displayShows(); // Refresh display
        showNotification(`Updated "${show.name}" episodes to ${show.watched_episode}`, 'success');
        logDiagnostic('episode_update_success', showId);
    }
}

function updateAnalytics() {
    const totalShows = allShows.length;
    const completedShows = allShows.filter(show => show.status === 'Completed').length;
    const currentlyWatching = allShows.filter(show => show.status === 'Watching').length;
    const totalEpisodes = allShows.reduce((sum, show) => sum + show.watched_episode, 0);
    const averageRating = allShows.length > 0 ? 
        (allShows.reduce((sum, show) => sum + show.rating, 0) / allShows.length).toFixed(1) : 0;
    
    // Safely update elements with null checks
    const totalShowsEl = document.getElementById('totalShows');
    const completedShowsEl = document.getElementById('completedShows');
    const currentlyWatchingEl = document.getElementById('currentlyWatching');
    const totalEpisodesEl = document.getElementById('totalEpisodes');
    const averageRatingEl = document.getElementById('averageRating');
    
    if (totalShowsEl) totalShowsEl.textContent = totalShows;
    if (completedShowsEl) completedShowsEl.textContent = completedShows;
    if (currentlyWatchingEl) currentlyWatchingEl.textContent = currentlyWatching;
    if (totalEpisodesEl) totalEpisodesEl.textContent = totalEpisodes;
    if (averageRatingEl) averageRatingEl.textContent = averageRating;
}

function saveToLocalStorage() {
    localStorage.setItem('showsData', JSON.stringify(allShows));
}

function openAddShowModal() {
    if (addShowModal) {
        addShowModal.style.display = 'block';
        const showNameEl = document.getElementById('showName');
        if (showNameEl) showNameEl.focus();
    }
}

function closeModal() {
    if (addShowModal) {
        addShowModal.style.display = 'none';
        const formEl = document.getElementById('addShowForm');
        if (formEl) formEl.reset();
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Focus search with /
        if (event.key === '/' && !event.ctrlKey && !event.altKey && searchInput) {
            event.preventDefault();
            searchInput.focus();
        }
        
        // Add new show with Ctrl+N
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            openAddShowModal();
        }
        
        // Toggle view with Ctrl+T
        if (event.ctrlKey && event.key === 't') {
            event.preventDefault();
            handleViewToggle();
        }
    });
}

function exportToJson() {
    const dataStr = JSON.stringify(allShows, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shows_data.json';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Shows exported to JSON', 'success');
}

function exportToCsv() {
    const headers = ['Name', 'Status', 'Rating', 'Watched Episodes', 'Total Episodes', 'Progress %'];
    const csvContent = [
        headers.join(','),
        ...allShows.map(show => {
            const progress = show.total_episodes > 0 ? 
                Math.round((show.watched_episode / show.total_episodes) * 100) : 0;
            return [
                `"${show.name}"`,
                show.status,
                show.rating,
                show.watched_episode,
                show.total_episodes || 0,
                progress
            ].join(',');
        })
    ].join('\n');
    
    const dataBlob = new Blob([csvContent], {type: 'text/csv'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shows_data.csv';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Shows exported to CSV', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 🔍 DIAGNOSTIC FUNCTIONS FOR ERROR TRACKING

function showDiagnosticLog() {
    const diagnosticWindow = window.open('', '_blank', 'width=800,height=600');
    const logHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>🔍 Show Interaction Diagnostic Log</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #00ff00; padding: 20px; }
        .error { color: #ff4444; font-weight: bold; }
        .success { color: #44ff44; }
        .info { color: #4444ff; }
        .entry { margin: 8px 0; padding: 8px; border-left: 3px solid #333; }
        .timestamp { color: #888; font-size: 0.9em; }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; }
        .stats { background: #2a2a2a; padding: 15px; margin: 20px 0; border-radius: 8px; }
        button { background: #333; color: #00ff00; border: 1px solid #00ff00; padding: 8px 16px; margin: 5px; cursor: pointer; }
        button:hover { background: #444; }
    </style>
</head>
<body>
    <h1>🔍 Show Interaction Diagnostic Log</h1>
    <div class="stats">
        <strong>Total Entries:</strong> ${diagnosticLog.length}<br>
        <strong>Error Count:</strong> ${diagnosticLog.filter(e => e.error).length}<br>
        <strong>Extension Errors:</strong> ${diagnosticLog.filter(e => e.error && e.error.includes('Could not establish connection')).length}<br>
        <strong>Diagnostic Mode:</strong> ${diagnosticMode ? 'ON' : 'OFF'}
    </div>
    <button onclick="location.reload()">Refresh</button>
    <button onclick="navigator.clipboard.writeText(document.body.innerText)">Copy Log</button>
    <hr>
    <div class="log">
        ${diagnosticLog.map(entry => `
            <div class="entry ${entry.error ? 'error' : 'success'}">
                <div class="timestamp">${entry.timestamp}</div>
                <strong>Action:</strong> ${entry.action}<br>
                <strong>Show ID:</strong> ${entry.showId}<br>
                ${entry.error ? `<strong>Error:</strong> ${entry.error}<br>` : ''}
                ${entry.stack ? `<details><summary>Stack Trace</summary><pre>${entry.stack}</pre></details>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    
    diagnosticWindow.document.write(logHtml);
    diagnosticWindow.document.close();
}

// Add diagnostic button to page
setTimeout(() => {
    const diagnosticBtn = document.createElement('button');
    diagnosticBtn.innerHTML = '<i class="fas fa-bug"></i>';
    diagnosticBtn.className = 'floating-btn';
    diagnosticBtn.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: #333;
        color: #ff6b35;
        border: 2px solid #ff6b35;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        z-index: 1000;
    `;
    
    diagnosticBtn.onclick = showDiagnosticLog;
    diagnosticBtn.title = 'View Diagnostic Log';
    
    document.body.appendChild(diagnosticBtn);
    console.log('🔍 Diagnostic button added');
}, 1000);
