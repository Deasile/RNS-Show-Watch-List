// Global variables
let allShows = [];
let filteredShows = [];
let isGridView = true;

// Status standardization mapping
const STATUS_MAPPING = {
    'Watching': ['Watching', 'Current', 'Watching 0', 'Watching 1', 'Watching 2', 'Watching 3'],
    'Completed': ['Completed', 'Ended !', 'Ended ?', 'Ended 100%'],
    'Planned': ['Planned', 'FUTURE', '/wd', '/ws'],
    'On Hold': ['On Hold', 'Meh 01', 'Meh 03', 'Waiting'],
    'Dropped': ['Unknown', 'Other', 'Z Meh'],
    'Re-watching': ['RE-Watching', 'RE-watching'],
    'Adult': ['Adult'],
    'Check': ['Check 2']
};

// Reverse mapping for quick lookup
const STANDARD_STATUS_MAP = {};
Object.keys(STATUS_MAPPING).forEach(standard => {
    STATUS_MAPPING[standard].forEach(variant => {
        STANDARD_STATUS_MAP[variant] = standard;
    });
});

// Debug system
const DEBUG = {
    enabled: true,
    log: function(type, message, data = null) {
        if (!this.enabled) return;
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            data
        };
        console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`, data || '');
        // Store in sessionStorage for debug panel
        const logs = JSON.parse(sessionStorage.getItem('debugLogs') || '[]');
        logs.push(logEntry);
        if (logs.length > 100) logs.shift(); // Keep only last 100 logs
        sessionStorage.setItem('debugLogs', JSON.stringify(logs));
    },
    error: function(message, error) { this.log('error', message, error); },
    warn: function(message, data) { this.log('warn', message, data); },
    info: function(message, data) { this.log('info', message, data); }
};

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
    initializeDebugPanel();
});

// Initialize debug panel
function initializeDebugPanel() {
    const debugPanel = document.getElementById('debugPanel');
    const toggleDebug = document.getElementById('toggleDebug');
    
    // Load debug panel state
    const isHidden = localStorage.getItem('debugPanelHidden') === 'true';
    if (isHidden) {
        debugPanel.classList.add('hidden');
        toggleDebug.textContent = 'Show';
    }
    
    // Toggle debug panel
    toggleDebug.addEventListener('click', function() {
        debugPanel.classList.toggle('hidden');
        const isHidden = debugPanel.classList.contains('hidden');
        toggleDebug.textContent = isHidden ? 'Show' : 'Hide';
        localStorage.setItem('debugPanelHidden', isHidden);
    });
    
    // Update debug stats periodically
    setInterval(updateDebugStats, 2000);
    
    // Update debug logs periodically
    setInterval(updateDebugLogs, 1000);
    
    DEBUG.info('Debug panel initialized');
}

// Update debug stats
function updateDebugStats() {
    document.getElementById('debugShowCount').textContent = allShows.length;
    document.getElementById('debugFilteredCount').textContent = filteredShows.length;
    document.getElementById('debugCurrentView').textContent = isGridView ? 'Grid' : 'List';
}

// Update debug logs
function updateDebugLogs() {
    const logs = JSON.parse(sessionStorage.getItem('debugLogs') || '[]');
    const debugLogsContainer = document.getElementById('debugLogs');
    
    // Show only last 10 logs
    const recentLogs = logs.slice(-10);
    
    debugLogsContainer.innerHTML = recentLogs.map(log => `
        <div class="debug-log-entry">
            <span class="debug-log-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
            <span class="debug-log-type ${log.type}">${log.type.toUpperCase()}</span>
            <span class="debug-log-message">${log.message}</span>
        </div>
    `).join('');
    
    // Auto-scroll to bottom
    debugLogsContainer.scrollTop = debugLogsContainer.scrollHeight;
}

// Standardize status value
function standardizeStatus(status) {
    const standardStatus = STANDARD_STATUS_MAP[status];
    if (standardStatus) {
        return standardStatus;
    }
    
    // If no direct mapping, try partial matches
    for (const [standard, variants] of Object.entries(STATUS_MAPPING)) {
        if (variants.some(variant => status.toLowerCase().includes(variant.toLowerCase()))) {
            DEBUG.warn(`Status mapped by partial match: ${status} -> ${standard}`);
            return standard;
        }
    }
    
    DEBUG.warn(`Unknown status value: ${status}`);
    return status; // Return original if no mapping found
}

// Load shows from JSON
async function loadShows() {
    try {
        showLoading();
        DEBUG.info('Loading shows data...');
        const response = await fetch('shows_data.json');
        allShows = await response.json();
        
        // Load any user modifications from localStorage
        const userModifications = JSON.parse(localStorage.getItem('userModifications') || '{}');
        
        // Apply user modifications and standardize statuses
        allShows = allShows.map(show => {
            const modifiedShow = {
                ...show,
                ...userModifications[show.id]
            };
            
            // Standardize status
            const originalStatus = modifiedShow.status;
            modifiedShow.standardStatus = standardizeStatus(originalStatus);
            modifiedShow.originalStatus = originalStatus;
            
            return modifiedShow;
        });
        
        DEBUG.info(`Loaded ${allShows.length} shows with status standardization`);
        
        filteredShows = [...allShows];
        displayShows();
        updateStatistics();
        hideLoading();
    } catch (error) {
        DEBUG.error('Error loading shows', error);
        showEmptyState('Error loading shows. Please refresh the page.');
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
    const displayStatus = show.standardStatus || show.status;
    const statusClass = `status-${displayStatus.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    const progressPercentage = show.total_episodes > 0 ? 
        Math.round((show.watched_episode / show.total_episodes) * 100) : 0;
    
    const starsHtml = Array.from({length: 5}, (_, i) => {
        const isFilled = i < show.rating;
        return `<i class="${isFilled ? 'fas' : 'far'} fa-star" data-rating="${i + 1}"></i>`;
    }).join('');

    return `
        <div class="show-card" data-id="${show.id}" onclick="handleShowClick(${show.id})">
            <div class="show-header">
                <div class="show-title">${escapeHtml(show.name)}</div>
                <div class="show-status ${statusClass}" title="Original: ${escapeHtml(show.originalStatus || show.status)}">${escapeHtml(displayStatus)}</div>
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
                        <button class="episode-btn minus-btn" data-show-id="${show.id}" data-action="decrease" onclick="event.stopPropagation()">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="episode-count">${show.watched_episode}</span>
                        <button class="episode-btn plus-btn" data-show-id="${show.id}" data-action="increase" onclick="event.stopPropagation()">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    ${show.link ? `<a href="${show.link}" target="_blank" class="btn btn-secondary" onclick="event.stopPropagation()">
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
    
    DEBUG.info('Event listeners setup complete');
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
}

// Handle search
function handleSearch() {
    const query = searchInput.value.toLowerCase();
    DEBUG.info(`Search query: "${query}"`);
    
    // Start with all shows for search
    let searchResults = allShows;
    
    if (query.trim()) {
        searchResults = allShows.filter(show => 
            show.name.toLowerCase().includes(query)
        );
        DEBUG.info(`Search found ${searchResults.length} results`);
    }
    
    // Apply current filter to search results
    filteredShows = searchResults;
    applyCurrentFilters();
}

// Handle filter
function handleFilter() {
    DEBUG.info('Filter changed');
    applyCurrentFilters();
}

// Apply current filters (status filter + sort)
function applyCurrentFilters() {
    const statusValue = statusFilter.value;
    
    // Start with current search results
    let results = [...filteredShows];
    
    // Apply status filter if selected
    if (statusValue && statusValue !== '') {
        const beforeFilter = results.length;
        results = results.filter(show => {
            // Check both original and standardized status
            const matchesStandard = show.standardStatus === statusValue;
            const matchesOriginal = show.status === statusValue;
            const matchesPartial = show.status.toLowerCase().includes(statusValue.toLowerCase());
            
            return matchesStandard || matchesOriginal || matchesPartial;
        });
        DEBUG.info(`Status filter "${statusValue}": ${beforeFilter} -> ${results.length} shows`);
    }
    
    // Update filtered shows
    filteredShows = results;
    
    // Apply sort
    applySort();
    displayShows();
    updateStatistics();
}

// Handle sort
function handleSort() {
    DEBUG.info('Sort changed');
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
                return (a.standardStatus || a.status).localeCompare(b.standardStatus || b.status);
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
}

// Handle rating update
function handleRatingUpdate(event) {
    const rating = parseInt(event.target.dataset.rating);
    const showId = parseInt(event.target.closest('[data-show-id]').dataset.showId);
    
    const show = allShows.find(s => s.id === showId);
    if (!show) return;
    
    show.rating = rating;
    
    saveUserModification(show);
    displayShows();
}

// Save user modification to localStorage
function saveUserModification(show) {
    const userModifications = JSON.parse(localStorage.getItem('userModifications') || '{}');
    userModifications[show.id] = {
        watched_episode: show.watched_episode,
        status: show.status,
        rating: show.rating,
        progress: show.progress
    };
    localStorage.setItem('userModifications', JSON.stringify(userModifications));
}

// Handle show click for details modal
function handleShowClick(showId) {
    DEBUG.info(`Show clicked: ${showId}`);
    
    const show = allShows.find(s => s.id === showId);
    if (!show) {
        DEBUG.error(`Show not found: ${showId}`);
        return;
    }
    
    openShowDetailsModal(show);
}

// Open show details modal
function openShowDetailsModal(show) {
    // Create modal if it doesn't exist
    let detailsModal = document.getElementById('showDetailsModal');
    if (!detailsModal) {
        detailsModal = createShowDetailsModal();
        document.body.appendChild(detailsModal);
    }
    
    // Populate modal with show data
    populateShowDetailsModal(show);
    
    // Show modal
    detailsModal.style.display = 'block';
    DEBUG.info(`Opened details modal for: ${show.name}`);
}

// Create show details modal
function createShowDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'showDetailsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="detailsModalTitle">Show Details</h2>
                <span class="close" onclick="closeShowDetailsModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="show-details-form">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="detailsShowName" readonly>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="detailsShowStatus">
                            <option value="Watching">Watching</option>
                            <option value="Completed">Completed</option>
                            <option value="Planned">Planned</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Dropped">Dropped</option>
                            <option value="Re-watching">Re-watching</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Episodes</label>
                        <div class="episode-input-group">
                            <input type="number" id="detailsWatchedEpisodes" min="0">
                            <span>/</span>
                            <input type="number" id="detailsTotalEpisodes" min="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Rating</label>
                        <div class="star-rating" id="detailsRating">
                            <i class="far fa-star" data-rating="1"></i>
                            <i class="far fa-star" data-rating="2"></i>
                            <i class="far fa-star" data-rating="3"></i>
                            <i class="far fa-star" data-rating="4"></i>
                            <i class="far fa-star" data-rating="5"></i>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Link</label>
                        <input type="url" id="detailsShowLink" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="detailsShowNotes" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Original Status</label>
                        <input type="text" id="detailsOriginalStatus" readonly>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="saveShowDetails()">Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="closeShowDetailsModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Setup close on outside click
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeShowDetailsModal();
        }
    });
    
    return modal;
}

// Populate show details modal
function populateShowDetailsModal(show) {
    document.getElementById('detailsModalTitle').textContent = show.name;
    document.getElementById('detailsShowName').value = show.name;
    document.getElementById('detailsShowStatus').value = show.standardStatus || show.status;
    document.getElementById('detailsWatchedEpisodes').value = show.watched_episode;
    document.getElementById('detailsTotalEpisodes').value = show.total_episodes || '';
    document.getElementById('detailsShowLink').value = show.link || '';
    document.getElementById('detailsShowNotes').value = show.notes || '';
    document.getElementById('detailsOriginalStatus').value = show.originalStatus || show.status;
    
    // Set rating stars
    const ratingStars = document.querySelectorAll('#detailsRating i');
    ratingStars.forEach((star, index) => {
        if (index < show.rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
        
        star.onclick = function() {
            const rating = index + 1;
            ratingStars.forEach((s, i) => {
                if (i < rating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
        };
    });
    
    // Store current show ID for saving
    document.getElementById('showDetailsModal').dataset.showId = show.id;
}

// Close show details modal
function closeShowDetailsModal() {
    const modal = document.getElementById('showDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Save show details
function saveShowDetails() {
    const modal = document.getElementById('showDetailsModal');
    const showId = parseInt(modal.dataset.showId);
    const show = allShows.find(s => s.id === showId);
    
    if (!show) {
        DEBUG.error(`Cannot save: Show not found: ${showId}`);
        return;
    }
    
    // Get updated values
    show.status = document.getElementById('detailsShowStatus').value;
    show.standardStatus = show.status; // Update standardized status
    show.watched_episode = parseInt(document.getElementById('detailsWatchedEpisodes').value) || 0;
    show.total_episodes = parseInt(document.getElementById('detailsTotalEpisodes').value) || 0;
    show.link = document.getElementById('detailsShowLink').value;
    show.notes = document.getElementById('detailsShowNotes').value;
    
    // Get rating from stars
    const filledStars = document.querySelectorAll('#detailsRating i.fas').length;
    show.rating = filledStars;
    
    // Update progress
    if (show.total_episodes > 0) {
        show.progress = Math.round((show.watched_episode / show.total_episodes) * 100);
    }
    
    // Auto-complete if reached total episodes
    if (show.total_episodes && show.watched_episode >= show.total_episodes && show.status !== 'Completed') {
        show.status = 'Completed';
        show.standardStatus = 'Completed';
    }
    
    // Save to localStorage
    saveUserModification(show);
    
    // Refresh display
    applyCurrentFilters();
    
    // Close modal
    closeShowDetailsModal();
    
    DEBUG.info(`Saved changes for show: ${show.name}`);
}

// Handle view toggle
function handleViewToggle() {
    isGridView = !isGridView;
    DEBUG.info(`View toggled to: ${isGridView ? 'Grid' : 'List'}`);
    
    if (isGridView) {
        showList.classList.remove('list-view');
        showList.classList.add('grid-view');
        toggleView.innerHTML = '<i class="fas fa-list"></i> List View';
    } else {
        showList.classList.remove('grid-view');
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

// Update statistics
function updateStatistics() {
    const total = allShows.length;
    const watching = allShows.filter(show => {
        const status = show.standardStatus || show.status;
        return status === 'Watching' || status === 'Re-watching';
    }).length;
    const completed = allShows.filter(show => {
        const status = show.standardStatus || show.status;
        return status === 'Completed';
    }).length;
    
    const totalProgress = allShows.reduce((sum, show) => sum + (show.progress || 0), 0);
    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;
    
    totalShows.textContent = total;
    watchingShows.textContent = watching;
    completedShows.textContent = completed;
    averageProgress.textContent = `${avgProgress}%`;
    
    DEBUG.info(`Statistics updated: ${total} total, ${watching} watching, ${completed} completed, ${avgProgress}% avg progress`);
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