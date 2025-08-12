// Global variables
let allShows = [];
let filteredShows = [];
let isGridView = true;

// DOM elements (using safe access)
let showList, searchInput, statusFilter, sortBy, toggleView, addShowBtn, addShowModal, addShowForm;

// Safe diagnostic logging function
function logDiagnostic(action, showId, error = null) {
    if (window.location.search.includes('diagnostic=true')) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            action,
            showId,
            error: error ? error.message : null
        };
        console.log('🔍 DIAGNOSTIC:', logEntry);
    }
}

// Initialize DOM elements safely
function initializeElements() {
    showList = document.getElementById('showsContainer');
    searchInput = document.getElementById('searchInput');
    statusFilter = document.getElementById('statusFilter');
    sortBy = document.getElementById('sortBy');
    toggleView = document.getElementById('toggleView');
    addShowBtn = document.getElementById('addShowBtn');
    addShowModal = document.getElementById('addShowModal');
    addShowForm = document.getElementById('addShowForm');
    
    logDiagnostic('elements_initialized', 'app');
}

// Wait for DOM and initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    loadShows();
    setupEventListeners();
    setupKeyboardShortcuts();
    showNotification('Welcome to RNS Show Watch List! 🎬', 'success');
});

// Load shows from JSON
async function loadShows() {
    try {
        showLoading();
        const response = await fetch('shows_data.json');
        
        if (!response.ok) {
            throw new Error(`Failed to load shows: ${response.status} ${response.statusText}`);
        }
        
        allShows = await response.json();
        
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
        
        // Show success message
        if (allShows.length > 0) {
            showNotification(`Successfully loaded ${allShows.length} shows!`, 'success');
        }
        
    } catch (error) {
        console.error('Error loading shows:', error);
        showEmptyState(`Error loading shows: ${error.message}`);
        showNotification('Failed to load show data. Please check your connection and try again.', 'error');
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
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.querySelector('.cancel-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Form submit
    if (addShowForm) {
        addShowForm.addEventListener('submit', handleAddShow);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addShowModal) {
            closeModal();
        }
    });
    
    logDiagnostic('setup_listeners_complete', 'app');
}

// Setup show card event listeners (CLEAN VERSION - NO PROTECTION WRAPPING)
function setupShowCardListeners() {
    logDiagnostic('setupShowCardListeners_start', 'all');
    
    // Episode controls - DIRECT LISTENERS
    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.addEventListener('click', handleEpisodeUpdate);
    });
    
    // Star ratings - DIRECT LISTENERS
    document.querySelectorAll('.star-rating i').forEach(star => {
        star.addEventListener('click', handleRatingUpdate);
    });
    
    // Status dropdowns - DIRECT LISTENERS
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', handleStatusUpdate);
    });
    
    logDiagnostic('setupShowCardListeners_success', 'all');
}

// Display shows
function displayShows() {
    if (!showList) return;
    
    if (filteredShows.length === 0) {
        showEmptyState('No shows found matching your criteria.');
        return;
    }
    
    showList.className = isGridView ? 'shows-grid' : 'shows-list';
    showList.innerHTML = filteredShows.map(show => createShowCard(show)).join('');
    
    // Setup event listeners for the new show cards
    setupShowCardListeners();
}

// Create show card HTML
function createShowCard(show) {
    const progress = show.total_episodes > 0 ? 
        Math.round((show.watched_episode / show.total_episodes) * 100) : 0;
    
    const genreDisplay = show.genre && show.genre !== 'Unknown' ? 
        `<span class="genre">${show.genre}</span>` : '';
    
    const notesDisplay = show.notes ? 
        `<div class="notes" title="${show.notes}"><i class="fas fa-sticky-note"></i> ${show.notes.substring(0, 50)}${show.notes.length > 50 ? '...' : ''}</div>` : '';
    
    return `
        <div class="show-card" data-show-id="${show.id}">
            <div class="show-header">
                <h3 class="show-title">${show.name}</h3>
                ${genreDisplay}
            </div>
            
            <div class="show-info">
                <div class="episode-info">
                    <div class="episode-controls">
                        <button class="episode-btn" data-action="decrease" data-show-id="${show.id}" title="Decrease episode">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="episode-count">${show.watched_episode}/${show.total_episodes || '?'}</span>
                        <button class="episode-btn" data-action="increase" data-show-id="${show.id}" title="Increase episode">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    ${show.total_episodes > 0 ? `<div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                        <span class="progress-text">${progress}%</span>
                    </div>` : ''}
                </div>
                
                <div class="rating-section">
                    <div class="star-rating" data-show-id="${show.id}">
                        ${[1,2,3,4,5].map(star => 
                            `<i class="fas fa-star ${star <= show.rating ? 'active' : ''}" data-rating="${star}"></i>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="status-section">
                    <select class="status-dropdown" data-show-id="${show.id}">
                        ${['Watching', 'Completed', 'Planned', 'On Hold', 'Dropped', 'Adult', 'Check Later']
                            .map(status => `<option value="${status}" ${show.status === status ? 'selected' : ''}>${status}</option>`)
                            .join('')}
                    </select>
                </div>
                
                ${notesDisplay}
            </div>
        </div>
    `;
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

// Handle status updates
function handleStatusUpdate(event) {
    const showId = parseInt(event.target.dataset.showId);
    const newStatus = event.target.value;
    
    const show = allShows.find(s => s.id === showId);
    if (!show) return;
    
    show.status = newStatus;
    
    saveUserModification(show);
    displayShows();
    updateStatistics();
}

// Save user modification to localStorage
function saveUserModification(show) {
    const userModifications = JSON.parse(localStorage.getItem('userModifications') || '{}');
    userModifications[show.id] = {
        watched_episode: show.watched_episode,
        rating: show.rating,
        status: show.status,
        progress: show.progress
    };
    localStorage.setItem('userModifications', JSON.stringify(userModifications));
}

// Enhanced search functionality
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        filteredShows = [...allShows];
        displayShows();
        updateStatistics();
        return;
    }
    
    // Advanced search patterns
    const ratingMatch = query.match(/rating:(\d+)/);
    const statusMatch = query.match(/status:(\w+)/);
    const progressMatch = query.match(/progress:([><=]+)(\d+)/);
    const yearMatch = query.match(/year:(\d{4})/);
    const genreMatch = query.match(/genre:(\w+)/);
    
    filteredShows = allShows.filter(show => {
        // Rating search
        if (ratingMatch) {
            const targetRating = parseInt(ratingMatch[1]);
            if (show.rating !== targetRating) return false;
        }
        
        // Status search
        if (statusMatch) {
            const targetStatus = statusMatch[1];
            if (!show.status.toLowerCase().includes(targetStatus.toLowerCase())) return false;
        }
        
        // Progress search
        if (progressMatch) {
            const operator = progressMatch[1];
            const targetProgress = parseInt(progressMatch[2]);
            const showProgress = show.total_episodes > 0 ? 
                Math.round((show.watched_episode / show.total_episodes) * 100) : 0;
            
            switch(operator) {
                case '>':
                    if (showProgress <= targetProgress) return false;
                    break;
                case '<':
                    if (showProgress >= targetProgress) return false;
                    break;
                case '>=':
                    if (showProgress < targetProgress) return false;
                    break;
                case '<=':
                    if (showProgress > targetProgress) return false;
                    break;
                case '=':
                case '==':
                    if (showProgress !== targetProgress) return false;
                    break;
            }
        }
        
        // Year search
        if (yearMatch) {
            const targetYear = parseInt(yearMatch[1]);
            if (show.year !== targetYear) return false;
        }
        
        // Genre search
        if (genreMatch) {
            const targetGenre = genreMatch[1];
            if (!show.genre || !show.genre.toLowerCase().includes(targetGenre.toLowerCase())) return false;
        }
        
        // If no special patterns, do regular text search
        if (!ratingMatch && !statusMatch && !progressMatch && !yearMatch && !genreMatch) {
            const searchableText = `${show.name} ${show.genre || ''} ${show.notes || ''}`.toLowerCase();
            return searchableText.includes(query);
        }
        
        return true;
    });
    
    displayShows();
    updateStatistics();
}

// Filter functions
function handleFilter() {
    const statusValue = statusFilter.value;
    
    if (!statusValue) {
        filteredShows = [...allShows];
    } else {
        filteredShows = allShows.filter(show => show.status === statusValue);
    }
    
    // Apply search if active
    if (searchInput.value.trim()) {
        handleSearch();
        return;
    }
    
    displayShows();
    updateStatistics();
}

function handleSort() {
    const sortValue = sortBy.value;
    
    filteredShows.sort((a, b) => {
        switch(sortValue) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'rating':
                return b.rating - a.rating;
            case 'progress':
                const progressA = a.total_episodes > 0 ? (a.watched_episode / a.total_episodes) * 100 : 0;
                const progressB = b.total_episodes > 0 ? (b.watched_episode / b.total_episodes) * 100 : 0;
                return progressB - progressA;
            case 'status':
                return a.status.localeCompare(b.status);
            default:
                return 0;
        }
    });
    
    displayShows();
}

// View toggle
function handleViewToggle() {
    isGridView = !isGridView;
    
    if (toggleView) {
        toggleView.innerHTML = isGridView ? 
            '<i class="fas fa-list"></i> List View' : 
            '<i class="fas fa-th"></i> Grid View';
    }
    
    displayShows();
    
    // Save preference
    localStorage.setItem('viewPreference', isGridView ? 'grid' : 'list');
}

// Load user preferences
function loadUserPreferences() {
    const viewPref = localStorage.getItem('viewPreference');
    if (viewPref === 'list') {
        isGridView = false;
        if (toggleView) {
            toggleView.innerHTML = '<i class="fas fa-th"></i> Grid View';
        }
    }
}

// Statistics update
function updateStatistics() {
    const totalShows = filteredShows.length;
    const completedShows = filteredShows.filter(show => show.status === 'Completed').length;
    const currentlyWatching = filteredShows.filter(show => show.status === 'Watching').length;
    const totalEpisodes = filteredShows.reduce((sum, show) => sum + show.watched_episode, 0);
    const avgRating = totalShows > 0 ? 
        (filteredShows.reduce((sum, show) => sum + show.rating, 0) / totalShows).toFixed(1) : 0;
    
    // Update DOM elements safely
    const elements = {
        totalShows: document.getElementById('totalShows'),
        completedShows: document.getElementById('completedShows'),
        currentlyWatching: document.getElementById('currentlyWatching'),
        averageRating: document.getElementById('averageRating'),
        totalEpisodes: document.getElementById('totalEpisodes')
    };
    
    if (elements.totalShows) elements.totalShows.textContent = totalShows;
    if (elements.completedShows) elements.completedShows.textContent = completedShows;
    if (elements.currentlyWatching) elements.currentlyWatching.textContent = currentlyWatching;
    if (elements.averageRating) elements.averageRating.textContent = avgRating;
    if (elements.totalEpisodes) elements.totalEpisodes.textContent = totalEpisodes;
}

// Modal functions
function openAddShowModal() {
    if (addShowModal) {
        addShowModal.style.display = 'block';
    }
}

function closeModal() {
    if (addShowModal) {
        addShowModal.style.display = 'none';
    }
    
    // Reset form
    if (addShowForm) {
        addShowForm.reset();
    }
}

// Add new show
function handleAddShow(event) {
    event.preventDefault();
    
    const formData = new FormData(addShowForm);
    const newShow = {
        id: Date.now(), // Simple ID generation
        name: formData.get('showName'),
        status: formData.get('showStatus'),
        rating: parseInt(formData.get('showRating')),
        watched_episode: parseInt(formData.get('watchedEpisodes')),
        total_episodes: parseInt(formData.get('totalEpisodes')) || null,
        genre: formData.get('showGenre') || 'Unknown',
        year: parseInt(formData.get('showYear')) || null,
        notes: formData.get('showNotes') || ''
    };
    
    // Calculate progress
    if (newShow.total_episodes > 0) {
        newShow.progress = Math.round((newShow.watched_episode / newShow.total_episodes) * 100);
    }
    
    allShows.push(newShow);
    filteredShows = [...allShows];
    
    // Save to localStorage
    saveUserModification(newShow);
    
    displayShows();
    updateStatistics();
    closeModal();
    
    showNotification(`Added "${newShow.name}" to your watch list!`, 'success');
}

// Keyboard shortcuts
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
    const csvContent = [
        ['Name', 'Status', 'Rating', 'Watched Episodes', 'Total Episodes', 'Progress %', 'Genre', 'Year', 'Notes'],
        ...allShows.map(show => [
            show.name,
            show.status,
            show.rating,
            show.watched_episode,
            show.total_episodes || 0,
            show.total_episodes > 0 ? Math.round((show.watched_episode / show.total_episodes) * 100) : 0,
            show.genre || 'Unknown',
            show.year || '',
            show.notes || ''
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const dataBlob = new Blob([csvContent], {type: 'text/csv'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shows_data.csv';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Shows exported to CSV', 'success');
}

// Utility functions
function showLoading() {
    if (showList) {
        showList.innerHTML = '<div class="loading">Loading shows...</div>';
    }
}

function hideLoading() {
    // Loading will be replaced by displayShows()
}

function showEmptyState(message) {
    if (showList) {
        showList.innerHTML = `<div class="empty-state">
            <i class="fas fa-tv"></i>
            <h3>${message}</h3>
            <p>Try adjusting your search or filter criteria.</p>
        </div>`;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}
