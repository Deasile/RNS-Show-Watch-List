// Global variables
let allShows = [];
let filteredShows = [];
let isGridView = true;

// Comprehensive error suppression for browser extension conflicts
window.addEventListener('error', function(e) {
    // Suppress extension-related errors
    if (e.message && (
        e.message.includes('Could not establish connection') ||
        e.message.includes('Receiving end does not exist') ||
        e.message.includes('Extension context invalidated') ||
        e.message.includes('chrome-extension://') ||
        e.message.includes('moz-extension://')
    )) {
        console.warn('Browser extension error suppressed:', e.message);
        e.preventDefault();
        return false;
    }
});

window.addEventListener('unhandledrejection', function(e) {
    // Suppress promise rejections from extensions
    if (e.reason && (
        (e.reason.message && (
            e.reason.message.includes('Could not establish connection') ||
            e.reason.message.includes('Receiving end does not exist') ||
            e.reason.message.includes('Extension context invalidated')
        )) ||
        (typeof e.reason === 'string' && (
            e.reason.includes('Could not establish connection') ||
            e.reason.includes('Receiving end does not exist')
        ))
    )) {
        console.warn('Browser extension promise rejection suppressed:', e.reason);
        e.preventDefault();
        return false;
    }
});

// DOM elements
const showList = document.getElementById('showList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const sortBy = document.getElementById('sortBy');
const toggleView = document.getElementById('toggleView');
const addShowBtn = document.getElementById('addShowBtn');
const addShowModal = document.getElementById('addShowModal');
const addShowForm = document.getElementById('addShowForm');

// Statistics elements
const totalShows = document.getElementById('totalShows');
const watchingShows = document.getElementById('watchingShows');
const completedShows = document.getElementById('completedShows');
const averageProgress = document.getElementById('averageProgress');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadShows();
    setupEventListeners();
    loadUserPreferences();
    setupKeyboardShortcuts();
    showNotification('Welcome to RNS Show Watch List! 🎬', 'success');
});

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Only trigger if not in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(event.key) {
            case '/':
                event.preventDefault();
                searchInput.focus();
                break;
            case 'n':
                if (event.ctrlKey) {
                    event.preventDefault();
                    openAddShowModal();
                }
                break;
            case 'v':
                event.preventDefault();
                handleViewToggle();
                break;
            case 'r':
                if (event.ctrlKey) {
                    event.preventDefault();
                    location.reload();
                }
                break;
            case 'Escape':
                closeModal();
                searchInput.blur();
                break;
        }
    });
    
    // Show keyboard shortcuts help
    createKeyboardShortcutsHelp();
}

// Load shows from JSON
async function loadShows() {
    try {
        showLoading();
        const response = await fetch('shows_data.json');
        
        if (!response.ok) {
            throw new Error(`Failed to load shows: ${response.status} ${response.statusText}`);
        }
        
        allShows = await response.json();
        
        // Validate loaded data
        const validationResults = validateShowsData(allShows);
        if (validationResults.errors.length > 0) {
            console.warn('Data validation issues found:', validationResults.errors);
        }
        
        // Load any user modifications from localStorage
        const userModifications = JSON.parse(localStorage.getItem('userModifications') || '{}');
        
        // Apply user modifications
        allShows = allShows.map(show => ({
            ...show,
            ...userModifications[show.id]
        }));
        
        filteredShows = [...allShows];
        displayShows();
        updateStatistics();
        hideLoading();
        
        // Show success message if data was cleaned
        if (allShows.length > 0) {
            showNotification(`Successfully loaded ${allShows.length} shows with clean data!`, 'success');
        }
        
    } catch (error) {
        console.error('Error loading shows:', error);
        showEmptyState(`Error loading shows: ${error.message}`);
        showNotification('Failed to load show data. Please check your connection and try again.', 'error');
    }
}

// Display shows
function displayShows() {
    if (filteredShows.length === 0) {
        showEmptyState('No shows found matching your criteria.');
        return;
    }

    const showsHtml = filteredShows.map(show => createShowCard(show)).join('');
    showList.innerHTML = showsHtml;
    
    // Setup event listeners for the new cards
    setupShowCardListeners();
}

// Create a show card HTML
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
                    <select class="status-dropdown" data-show-id="${show.id}">
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
                    <div class="episode-controls">
                        <button class="episode-btn minus-btn" data-show-id="${show.id}" data-action="decrease">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="episode-count">${show.watched_episode}</span>
                        <button class="episode-btn plus-btn" data-show-id="${show.id}" data-action="increase">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    ${show.link ? `<a href="${show.link}" target="_blank" class="btn btn-secondary">
                        <i class="fas fa-external-link-alt"></i> Watch
                    </a>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // Filter functionality
    statusFilter.addEventListener('change', handleFilter);
    sortBy.addEventListener('change', handleSort);
    
    // View toggle
    toggleView.addEventListener('click', handleViewToggle);
    
    // Export buttons
    document.getElementById('exportJson').addEventListener('click', exportToJson);
    document.getElementById('exportCsv').addEventListener('click', exportToCsv);
    
    // Add show modal
    addShowBtn.addEventListener('click', openAddShowModal);
    document.querySelector('.close').addEventListener('click', closeModal);
    addShowForm.addEventListener('submit', handleAddShow);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addShowModal) {
            closeModal();
        }
    });
}

// Setup show card event listeners
function setupShowCardListeners() {
    // Episode controls
    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.addEventListener('click', handleEpisodeUpdate);
    });
    
    // Star ratings
    document.querySelectorAll('.star-rating i').forEach(star => {
        star.addEventListener('click', handleRatingUpdate);
    });
    
    // Status dropdowns
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', handleStatusUpdate);
    });
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

// Handle filter
function handleFilter() {
    const statusValue = statusFilter.value;
    
    if (statusValue) {
        filteredShows = allShows.filter(show => {
            // Exact match for the cleaned status values
            return show.status === statusValue;
        });
    } else {
        // Show all shows when no filter is selected
        filteredShows = [...allShows];
        
        // Apply search if there's a search query
        const query = searchInput.value.toLowerCase();
        if (query) {
            filteredShows = filteredShows.filter(show => 
                show.name.toLowerCase().includes(query)
            );
        }
    }
    
    applySort();
    displayShows();
    updateStatistics();
}

// Handle sort
function handleSort() {
    applySort();
    displayShows();
}

// Apply sort
function applySort() {
    const sortValue = sortBy.value;
    
    filteredShows.sort((a, b) => {
        switch (sortValue) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'progress':
                const progressA = a.total_episodes > 0 ? (a.watched_episode / a.total_episodes) : 0;
                const progressB = b.total_episodes > 0 ? (b.watched_episode / b.total_episodes) : 0;
                return progressB - progressA;
            case 'rating':
                return b.rating - a.rating;
            case 'status':
                return a.status.localeCompare(b.status);
            default:
                return 0;
        }
    });
}

// Apply filters and sort
function applyFiltersAndSort() {
    handleFilter();
}

// Handle episode update
function handleEpisodeUpdate(event) {
    try {
        const showId = parseInt(event.target.closest('[data-show-id]').dataset.showId);
        const action = event.target.closest('[data-action]').dataset.action;
        
        const show = allShows.find(s => s.id === showId);
        if (!show) return;
        
        if (action === 'increase') {
            if (show.total_episodes && show.watched_episode >= show.total_episodes) return;
            show.watched_episode++;
            
            // Auto-complete if reached total episodes
            if (show.total_episodes && show.watched_episode >= show.total_episodes) {
                show.status = 'Completed';
            }
        } else if (action === 'decrease') {
            if (show.watched_episode <= 0) return;
            show.watched_episode--;
            
            // Change status back from completed if going below total
            if (show.status === 'Completed' && show.watched_episode < show.total_episodes) {
                show.status = 'Watching';
            }
        }
        
        // Update progress
        if (show.total_episodes > 0) {
            show.progress = Math.round((show.watched_episode / show.total_episodes) * 100);
        }
        
        saveUserModification(show);
        displayShows();
        updateStatistics();
    } catch (error) {
        console.warn('Episode update error suppressed:', error);
    }
}

// Handle rating update
function handleRatingUpdate(event) {
    try {
        const rating = parseInt(event.target.dataset.rating);
        const showId = parseInt(event.target.closest('[data-show-id]').dataset.showId);
        
        const show = allShows.find(s => s.id === showId);
        if (!show) return;
        
        show.rating = rating;
        
        saveUserModification(show);
        displayShows();
    } catch (error) {
        console.warn('Rating update error suppressed:', error);
    }
}

// Handle status updates
function handleStatusUpdate(e) {
    try {
        const dropdown = e.target;
        const showCard = dropdown.closest('.show-card');
        const showId = parseInt(showCard.dataset.showId);
        const newStatus = dropdown.value;
        
        // Find the show in our data
        const show = allShows.find(s => s.id === showId);
        if (show) {
            // Update the data
            show.status = newStatus;
            
            // Save modifications
            saveUserModification(show);
            
            // Update the show card styling to reflect new status
            showCard.className = `show-card status-${newStatus.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            
            // Show notification
            showNotification(`Updated "${show.show}" status to "${newStatus}"`);
            
            // Refresh display to update analytics
            displayShows();
        }
    } catch (error) {
        console.warn('Status update error suppressed:', error);
    }
}

// Save user modification to localStorage
function saveUserModification(show) {
    try {
        const userModifications = JSON.parse(localStorage.getItem('userModifications') || '{}');
        userModifications[show.id] = {
            watched_episode: show.watched_episode,
            status: show.status,
            rating: show.rating,
            progress: show.progress
        };
        localStorage.setItem('userModifications', JSON.stringify(userModifications));
    } catch (error) {
        console.warn('LocalStorage save error suppressed:', error);
        showNotification('Failed to save changes. Please check your browser settings.', 'error');
    }
}

// Handle view toggle
function handleViewToggle() {
    isGridView = !isGridView;
    if (isGridView) {
        showList.classList.remove('list-view');
        toggleView.innerHTML = '<i class="fas fa-list"></i> List View';
    } else {
        showList.classList.add('list-view');
        toggleView.innerHTML = '<i class="fas fa-th"></i> Grid View';
    }
    localStorage.setItem('viewPreference', isGridView ? 'grid' : 'list');
}

// Open add show modal
function openAddShowModal() {
    addShowModal.style.display = 'block';
}

// Close modal
function closeModal() {
    addShowModal.style.display = 'none';
    addShowForm.reset();
}

// Handle add show
function handleAddShow(event) {
    event.preventDefault();
    
    const newShow = {
        id: Math.max(...allShows.map(s => s.id)) + 1,
        name: document.getElementById('showName').value,
        status: document.getElementById('showStatus').value,
        total_episodes: parseInt(document.getElementById('showEpisodes').value) || 0,
        watched_episode: parseInt(document.getElementById('showWatched').value) || 0,
        rating: getSelectedRating(),
        watched_season: 1,
        checked: false,
        link: '',
        notes: '',
        genre: '',
        year: '',
        type: 'custom',
        progress: 0
    };
    
    // Calculate progress
    if (newShow.total_episodes > 0) {
        newShow.progress = Math.round((newShow.watched_episode / newShow.total_episodes) * 100);
    }
    
    allShows.push(newShow);
    saveUserModification(newShow);
    
    // Refresh display
    filteredShows = [...allShows];
    applyFiltersAndSort();
    closeModal();
    updateStatistics();
}

// Get selected rating from modal
function getSelectedRating() {
    const stars = document.querySelectorAll('#newShowRating i');
    let rating = 0;
    stars.forEach((star, index) => {
        if (star.classList.contains('fas')) {
            rating = index + 1;
        }
    });
    return rating;
}

// Setup rating stars in modal
document.addEventListener('DOMContentLoaded', function() {
    const modalStars = document.querySelectorAll('#newShowRating i');
    modalStars.forEach((star, index) => {
        star.addEventListener('click', function() {
            const rating = index + 1;
            modalStars.forEach((s, i) => {
                if (i < rating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
            // Update the hidden input field
            document.getElementById('showRating').value = rating;
        });
    });
});

// Export to JSON
function exportToJson() {
    const dataStr = JSON.stringify(allShows, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `watch-list-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Export to CSV
function exportToCsv() {
    const headers = ['ID', 'Name', 'Status', 'Watched Episodes', 'Total Episodes', 'Progress %', 'Rating', 'Type'];
    const csvContent = [
        headers.join(','),
        ...allShows.map(show => [
            show.id,
            `"${show.name.replace(/"/g, '""')}"`,
            `"${show.status}"`,
            show.watched_episode,
            show.total_episodes || 0,
            show.progress || 0,
            show.rating,
            show.type
        ].join(','))
    ].join('\n');
    
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileDefaultName = `watch-list-${new Date().toISOString().split('T')[0]}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Enhanced statistics with insights
function updateStatistics() {
    const total = allShows.length;
    
    // Use exact status matching for accurate statistics
    const watching = allShows.filter(show => show.status === 'Watching').length;
    const completed = allShows.filter(show => show.status === 'Completed').length;
    const planned = allShows.filter(show => show.status === 'Planned').length;
    const onHold = allShows.filter(show => show.status === 'On Hold').length;
    const dropped = allShows.filter(show => show.status === 'Dropped').length;
    
    // Calculate average progress more accurately
    const showsWithProgress = allShows.filter(show => show.total_episodes > 0);
    const totalProgress = showsWithProgress.reduce((sum, show) => {
        const progress = show.total_episodes > 0 ? 
            (show.watched_episode / show.total_episodes) * 100 : 0;
        return sum + progress;
    }, 0);
    
    const avgProgress = showsWithProgress.length > 0 ? 
        Math.round(totalProgress / showsWithProgress.length) : 0;
    
    // Calculate average rating
    const ratedShows = allShows.filter(show => show.rating > 0);
    const totalRating = ratedShows.reduce((sum, show) => sum + show.rating, 0);
    const avgRating = ratedShows.length > 0 ? 
        (totalRating / ratedShows.length).toFixed(1) : '0.0';
    
    // Estimate total watch time (assuming 24 minutes per episode)
    const totalEpisodes = allShows.reduce((sum, show) => sum + show.watched_episode, 0);
    const totalMinutes = totalEpisodes * 24;
    const totalHours = Math.round(totalMinutes / 60);
    
    // Update UI
    totalShows.textContent = total;
    watchingShows.textContent = watching;
    completedShows.textContent = completed;
    averageProgress.textContent = `${avgProgress}%`;
    
    // Update new statistics if elements exist
    const avgRatingElement = document.getElementById('averageRating');
    const totalHoursElement = document.getElementById('totalHours');
    
    if (avgRatingElement) avgRatingElement.textContent = avgRating;
    if (totalHoursElement) totalHoursElement.textContent = `${totalHours}h`;
    
    // Generate insights
    generateInsights({
        total, watching, completed, planned, onHold, dropped,
        avgProgress, avgRating, totalHours, ratedShows: ratedShows.length
    });
}

// Generate intelligent insights
function generateInsights(stats) {
    const insights = [];
    
    // Completion rate insight
    const completionRate = stats.total > 0 ? 
        Math.round((stats.completed / stats.total) * 100) : 0;
    
    if (completionRate > 70) {
        insights.push({
            icon: 'fas fa-trophy',
            text: `Great job! You complete ${completionRate}% of shows you start`,
            type: 'success'
        });
    } else if (completionRate < 30) {
        insights.push({
            icon: 'fas fa-exclamation-triangle',
            text: `Only ${completionRate}% completion rate - consider cleaning up your list`,
            type: 'warning'
        });
    }
    
    // Backlog insight
    if (stats.planned > stats.watching * 3) {
        insights.push({
            icon: 'fas fa-list',
            text: `Large backlog detected: ${stats.planned} planned vs ${stats.watching} watching`,
            type: 'info'
        });
    }
    
    // Rating insight
    if (stats.ratedShows / stats.total < 0.5) {
        insights.push({
            icon: 'fas fa-star',
            text: `Rate more shows! Only ${Math.round((stats.ratedShows / stats.total) * 100)}% have ratings`,
            type: 'tip'
        });
    } else if (parseFloat(stats.avgRating) > 4.0) {
        insights.push({
            icon: 'fas fa-heart',
            text: `High standards! Average rating of ${stats.avgRating} stars`,
            type: 'success'
        });
    }
    
    // Watch time insight
    if (stats.totalHours > 100) {
        const days = Math.round(stats.totalHours / 24);
        insights.push({
            icon: 'fas fa-clock',
            text: `Impressive! You've watched ${days} days worth of content`,
            type: 'achievement'
        });
    }
    
    // On hold insight
    if (stats.onHold > 5) {
        insights.push({
            icon: 'fas fa-pause',
            text: `${stats.onHold} shows on hold - time to revisit some?`,
            type: 'suggestion'
        });
    }
    
    // Progress insight
    if (stats.avgProgress > 80) {
        insights.push({
            icon: 'fas fa-forward',
            text: `You're close to finishing many shows! Average ${stats.avgProgress}% complete`,
            type: 'motivation'
        });
    }
    
    // Update insights UI
    updateInsightsUI(insights);
}

// Update insights display
function updateInsightsUI(insights) {
    const insightsContainer = document.getElementById('insights-content');
    if (!insightsContainer) return;
    
    if (insights.length === 0) {
        insightsContainer.innerHTML = '<div class="no-insights">No insights available yet - add more data!</div>';
        return;
    }
    
    const insightsHtml = insights.map(insight => `
        <div class="insight-card insight-${insight.type}">
            <i class="${insight.icon}"></i>
            <span>${insight.text}</span>
        </div>
    `).join('');
    
    insightsContainer.innerHTML = insightsHtml;
}

// Create keyboard shortcuts help
function createKeyboardShortcutsHelp() {
    const helpButton = document.createElement('button');
    helpButton.className = 'help-button';
    helpButton.innerHTML = '<i class="fas fa-keyboard"></i>';
    helpButton.title = 'Keyboard Shortcuts (?)';
    helpButton.onclick = showKeyboardShortcuts;
    
    document.body.appendChild(helpButton);
}

// Show keyboard shortcuts modal
function showKeyboardShortcuts() {
    const modal = document.createElement('div');
    modal.className = 'modal keyboard-shortcuts-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h2>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="shortcuts-grid">
                    <div class="shortcut-item">
                        <kbd>/</kbd>
                        <span>Focus search</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl</kbd> + <kbd>N</kbd>
                        <span>Add new show</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>V</kbd>
                        <span>Toggle view</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl</kbd> + <kbd>R</kbd>
                        <span>Refresh</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Esc</kbd>
                        <span>Close modal/clear focus</span>
                    </div>
                </div>
                <div class="search-tips">
                    <h3>Search Tips</h3>
                    <div class="tip-item">
                        <code>rating:5</code> - Shows with 5 stars
                    </div>
                    <div class="tip-item">
                        <code>status:watching</code> - Currently watching
                    </div>
                    <div class="tip-item">
                        <code>progress:>80</code> - Over 80% complete
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Remove on background click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Enhanced bulk operations
function addBulkOperations() {
    const bulkToolbar = document.createElement('div');
    bulkToolbar.className = 'bulk-toolbar';
    bulkToolbar.innerHTML = `
        <div class="bulk-actions">
            <button class="btn btn-secondary" onclick="selectAllShows()">
                <i class="fas fa-check-square"></i> Select All
            </button>
            <button class="btn btn-secondary" onclick="clearSelection()">
                <i class="fas fa-square"></i> Clear Selection
            </button>
            <button class="btn btn-primary" onclick="bulkStatusUpdate()">
                <i class="fas fa-edit"></i> Bulk Status Update
            </button>
            <button class="btn btn-danger" onclick="bulkDelete()">
                <i class="fas fa-trash"></i> Delete Selected
            </button>
        </div>
        <div class="selection-info">
            <span id="selection-count">0 selected</span>
        </div>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(bulkToolbar, document.getElementById('showList'));
}

// Progress tracking enhancements
function trackWatchTime() {
    const watchSessions = JSON.parse(localStorage.getItem('watchSessions') || '[]');
    const today = new Date().toISOString().split('T')[0];
    
    // Add today's session if not exists
    if (!watchSessions.find(session => session.date === today)) {
        watchSessions.push({
            date: today,
            episodesWatched: 0,
            timeSpent: 0
        });
    }
    
    // Save and return current session
    localStorage.setItem('watchSessions', JSON.stringify(watchSessions));
    return watchSessions[watchSessions.length - 1];
}

// Load user preferences
function loadUserPreferences() {
    const viewPreference = localStorage.getItem('viewPreference');
    if (viewPreference === 'list') {
        handleViewToggle();
    }
}

// Show loading state
function showLoading() {
    showList.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading your shows...</p>
        </div>
    `;
}

// Hide loading state
function hideLoading() {
    // Loading is hidden when displayShows() is called
}

// Show empty state
function showEmptyState(message) {
    showList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-tv"></i>
            <h3>No Shows Found</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="openAddShowModal()">
                <i class="fas fa-plus"></i> Add Your First Show
            </button>
        </div>
    `;
}

// Utility function to escape HTML
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

// Data validation function
function validateShowsData(shows) {
    const validStatuses = ['Watching', 'Completed', 'Planned', 'On Hold', 'Dropped', 'Adult', 'Check Later'];
    const errors = [];
    const warnings = [];
    
    shows.forEach(show => {
        // Check required fields
        if (!show.name || show.name.trim() === '') {
            errors.push(`Show ID ${show.id}: Missing name`);
        }
        
        if (!validStatuses.includes(show.status)) {
            warnings.push(`Show "${show.name}": Unknown status "${show.status}"`);
        }
        
        // Check numeric values
        if (show.watched_episode < 0) {
            errors.push(`Show "${show.name}": Negative watched episodes`);
        }
        
        if (show.total_episodes < 0) {
            errors.push(`Show "${show.name}": Negative total episodes`);
        }
        
        if (show.rating < 0 || show.rating > 5) {
            errors.push(`Show "${show.name}": Invalid rating (${show.rating})`);
        }
        
        // Check logical consistency
        if (show.total_episodes > 0 && show.watched_episode > show.total_episodes) {
            warnings.push(`Show "${show.name}": Watched more episodes than total`);
        }
    });
    
    return { errors, warnings };
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
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