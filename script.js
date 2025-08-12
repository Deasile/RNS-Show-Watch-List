// Global variables
let allShows = [];
let filteredShows = [];
let isGridView = true;

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
                <div class="show-status ${statusClass}">${escapeHtml(show.status)}</div>
            </div>
            <div class="show-body" style="position: relative; min-height: 120px;">
                <div class="show-progress">
                    <div class="progress-text">
                        <span>Progress</span>
                        <span>${progressPercentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>Episodes: ${show.watched_episode} / ${show.total_episodes || '?'} </span>
                    </div>
                </div>
                <div class="show-rating">
                    <div class="star-rating" data-show-id="${show.id}">
                        ${starsHtml}
                    </div>
                </div>
                <!-- Bottom row: absolute delete button, flex episode controls, watch button right -->
            </div>
            <div class="show-actions absolute-actions-row">
                <button class="btn btn-danger delete-show-btn compact-btn absolute-delete" data-show-id="${show.id}" title="Delete Show">
                    <i class="fas fa-trash"></i>
                </button>
                <div class="bottom-flex-controls">
                    <div class="episode-controls compact-controls">
                        <button class="episode-btn minus-btn compact-btn" data-show-id="${show.id}" data-action="decrease">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="episode-count compact-count">${show.watched_episode}</span>
                        <button class="episode-btn plus-btn compact-btn" data-show-id="${show.id}" data-action="increase">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                        ${show.link ? `<a href="${generateEpisodeLink(show)}" target="_blank" class="btn btn-secondary watch-episode-btn compact-btn">
                            <i class="fas fa-external-link-alt"></i> Watch Episode ${show.watched_episode + 1}
                        </a>` : `<span class="watch-episode-placeholder compact-btn"></span>`}
                    </div>
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
    document.getElementById('importLinks').addEventListener('click', importGoogleSheetsLinks);
    
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
    
    // Playlist discovery buttons
    document.querySelectorAll('.discover-playlist-btn').forEach(btn => {
        btn.addEventListener('click', handlePlaylistDiscovery);
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-show-btn').forEach(btn => {
        btn.addEventListener('click', handleShowDelete);
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
    const showId = parseInt(event.target.closest('[data-show-id]').dataset.showId);
    const action = event.target.closest('[data-action]').dataset.action;
    
    const show = allShows.find(s => s.id === showId);
    if (!show) return;
    
    const previousEpisode = show.watched_episode;
    
    if (action === 'increase') {
        if (show.total_episodes && show.watched_episode >= show.total_episodes) return;
        show.watched_episode++;
        
        // Auto-complete if reached total episodes
        if (show.total_episodes && show.watched_episode >= show.total_episodes) {
            show.status = 'Completed';
            showNotification(`🎉 Completed "${show.name}"! You watched all ${show.total_episodes} episodes.`, 'success');
        } else {
            showNotification(`📺 "${show.name}" - Episode ${show.watched_episode} watched!`, 'success');
        }
    } else if (action === 'decrease') {
        if (show.watched_episode <= 0) return;
        show.watched_episode--;
        
        // Change status back from completed if going below total
        if (show.status === 'Completed' && show.watched_episode < show.total_episodes) {
            show.status = 'Watching';
            showNotification(`📺 "${show.name}" - Back to watching (Episode ${show.watched_episode})`, 'info');
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

// Handle playlist discovery
async function handlePlaylistDiscovery(event) {
    const showId = parseInt(event.target.closest('[data-show-id]').dataset.showId);
    const show = allShows.find(s => s.id === showId);
    
    if (!show) return;
    
    const button = event.target.closest('.discover-playlist-btn');
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    button.disabled = true;
    
    try {
        const playlistId = await discoverPlaylistId(show);
        
        if (playlistId) {
            // Update the show's link to use playlist format
            const showNameMatch = show.link.match(/wcostream\.tv\/(.+)-episode-\d+/);
            if (showNameMatch) {
                const showNamePattern = showNameMatch[1];
                const currentEpisode = show.link.match(/episode-(\d+)/)?.[1] || '1';
                show.link = `https://www.wcostream.tv/playlist-cat/${playlistId}/${showNamePattern}-episode-${currentEpisode}-english-dubbed`;
                
                // Save the updated show
                saveUserModification(show);
                
                // Refresh the display
                displayShows();
                
                showNotification(`🎯 Found playlist for "${show.name}"! Links will now auto-update episode numbers.`, 'success');
            }
        } else {
            showNotification(`❌ Could not find playlist for "${show.name}". You may need to manually find the playlist URL.`, 'warning');
            
            // Reset button
            button.innerHTML = originalText;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Error discovering playlist:', error);
        showNotification(`❌ Error searching for playlist: ${error.message}`, 'error');
        
        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Handle show deletion with confirmation
function handleShowDelete(event) {
    const showId = parseInt(event.target.closest('[data-show-id]').dataset.showId);
    const show = allShows.find(s => s.id === showId);
    
    if (!show) return;
    
    // Create confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.style.display = 'block';
    confirmModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i> Delete Show</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p><strong>Are you sure you want to delete "${escapeHtml(show.name)}"?</strong></p>
                <div class="show-details" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Status:</strong> ${show.status}</p>
                    <p><strong>Progress:</strong> ${show.watched_episode}/${show.total_episodes || '?'} episodes</p>
                    <p><strong>Rating:</strong> ${'★'.repeat(show.rating)}${'☆'.repeat(5-show.rating)}</p>
                </div>
                <div class="warning-box" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0;">
                    <i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i>
                    <strong>Warning:</strong> This action cannot be undone. All progress, ratings, and watch history for this show will be permanently deleted.
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel-delete">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn btn-danger confirm-delete">
                    <i class="fas fa-trash"></i> Delete Permanently
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Setup modal event listeners
    const closeBtn = confirmModal.querySelector('.close');
    const cancelBtn = confirmModal.querySelector('.cancel-delete');
    const confirmBtn = confirmModal.querySelector('.confirm-delete');
    
    function closeModal() {
        confirmModal.remove();
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close on background click
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            closeModal();
        }
    });
    
    // Handle confirmation
    confirmBtn.addEventListener('click', function() {
        try {
            deleteShow(showId);
            closeModal();
            showNotification(`✅ "${show.name}" has been deleted successfully.`, 'success');
        } catch (error) {
            console.error('Error deleting show:', error);
            showNotification(`❌ Error deleting show: ${error.message}`, 'error');
        }
    });
}

// Delete show and clean up all related data
function deleteShow(showId) {
    console.log(`🗑️ Deleting show with ID: ${showId}`);
    
    // Remove from allShows array
    const originalLength = allShows.length;
    allShows = allShows.filter(show => show.id !== showId);
    
    if (allShows.length === originalLength) {
        throw new Error('Show not found in allShows array');
    }
    
    // Clean up localStorage - user modifications
    const userModifications = JSON.parse(localStorage.getItem('userModifications') || '{}');
    if (userModifications[showId]) {
        delete userModifications[showId];
        localStorage.setItem('userModifications', JSON.stringify(userModifications));
        console.log(`🧹 Cleaned userModifications for show ID: ${showId}`);
    }
    
    // Clean up localStorage - playlist IDs
    const playlistIds = JSON.parse(localStorage.getItem('wcostream_playlist_ids') || '{}');
    const showKey = Object.keys(playlistIds).find(key => {
        const show = allShows.find(s => s.name.toLowerCase().includes(key.toLowerCase()));
        return show && show.id === showId;
    });
    if (showKey) {
        delete playlistIds[showKey];
        localStorage.setItem('wcostream_playlist_ids', JSON.stringify(playlistIds));
        console.log(`🧹 Cleaned playlist IDs for show: ${showKey}`);
    }
    
    // Clean up localStorage - watch sessions
    const watchSessions = JSON.parse(localStorage.getItem('watchSessions') || '[]');
    const filteredSessions = watchSessions.filter(session => session.showId !== showId);
    if (filteredSessions.length !== watchSessions.length) {
        localStorage.setItem('watchSessions', JSON.stringify(filteredSessions));
        console.log(`🧹 Cleaned watch sessions for show ID: ${showId}`);
    }
    
    // Update filtered shows and refresh display
    filteredShows = filteredShows.filter(show => show.id !== showId);
    displayShows();
    updateStatistics();
    
    console.log(`✅ Successfully deleted show ID: ${showId} and cleaned up all related data`);
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
        link: document.getElementById('showLink') ? document.getElementById('showLink').value : '',
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
    
    showNotification(`Added "${newShow.name}" to your watch list!`, 'success');
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

// Enhanced dynamic episode link generation with playlist ID discovery
function generateEpisodeLink(show) {
    if (!show.link) return '';
    
    const nextEpisode = show.watched_episode + 1;
    
    // Handle wcostream.tv links with playlist-cat format (PREFERRED)
    if (show.link.includes('wcostream.tv/playlist-cat/')) {
        const playlistMatch = show.link.match(/playlist-cat\/(\d+)\//);
        if (playlistMatch) {
            const playlistId = playlistMatch[1];
            // Extract show name pattern from original link
            const showNameMatch = show.link.match(/playlist-cat\/\d+\/(.+)-episode-\d+/);
            if (showNameMatch) {
                const showNamePattern = showNameMatch[1];
                return `https://www.wcostream.tv/playlist-cat/${playlistId}/${showNamePattern}-episode-${nextEpisode}-english-dubbed`;
            }
        }
    }
    
    // Handle direct wcostream.tv links - try to discover playlist ID
    if (show.link.includes('wcostream.tv/') && !show.link.includes('playlist-cat/')) {
        const showNameMatch = show.link.match(/wcostream\.tv\/(.+)-episode-\d+/);
        if (showNameMatch) {
            const showNamePattern = showNameMatch[1];
            
            // Check if we have a stored playlist ID for this show
            const storedPlaylistId = getStoredPlaylistId(show.id);
            if (storedPlaylistId) {
                console.log(`🎯 Using discovered playlist ID ${storedPlaylistId} for "${show.name}"`);
                return `https://www.wcostream.tv/playlist-cat/${storedPlaylistId}/${showNamePattern}-episode-${nextEpisode}-english-dubbed`;
            }
            
            // Fallback to direct URL pattern
            return `https://www.wcostream.tv/${showNamePattern}-episode-${nextEpisode}-english-dubbed`;
        }
    }
    
    // Handle other streaming sites or generic episode replacement
    if (show.link.includes('episode-')) {
        return show.link.replace(/episode-\d+/, `episode-${nextEpisode}`);
    }
    
    // If no episode pattern found, return original link
    return show.link;
}

// Store playlist ID for a show
function storePlaylistId(showId, playlistId) {
    const playlistIds = JSON.parse(localStorage.getItem('wcostream_playlist_ids') || '{}');
    playlistIds[showId] = playlistId;
    localStorage.setItem('wcostream_playlist_ids', JSON.stringify(playlistIds));
    console.log(`💾 Stored playlist ID ${playlistId} for show ${showId}`);
}

// Get stored playlist ID for a show
function getStoredPlaylistId(showId) {
    const playlistIds = JSON.parse(localStorage.getItem('wcostream_playlist_ids') || '{}');
    return playlistIds[showId] || null;
}

// Auto-discover playlist ID from wcostream direct URLs
async function discoverPlaylistId(show) {
    if (!show.link || !show.link.includes('wcostream.tv/') || show.link.includes('playlist-cat/')) {
        return null;
    }
    
    try {
        console.log(`🔍 Attempting to discover playlist ID for "${show.name}"`);
        
        // This would require CORS proxy or server-side implementation
        // For now, we'll implement manual discovery pattern matching
        const knownPlaylistPatterns = getKnownPlaylistPatterns();
        
        for (const pattern of knownPlaylistPatterns) {
            if (show.link.includes(pattern.showPattern) || show.name.toLowerCase().includes(pattern.namePattern.toLowerCase())) {
                console.log(`🎯 Found matching pattern for "${show.name}": ${pattern.playlistId}`);
                storePlaylistId(show.id, pattern.playlistId);
                return pattern.playlistId;
            }
        }
        
        console.log(`❌ No playlist ID pattern found for "${show.name}"`);
        return null;
    } catch (error) {
        console.error(`Error discovering playlist ID for "${show.name}":`, error);
        return null;
    }
}

// Known playlist patterns from examples and user data
function getKnownPlaylistPatterns() {
    return [
        {
            namePattern: "Izetta: The Last Witch",
            showPattern: "izetta-the-last-witch",
            playlistId: "458676"
        },
        {
            namePattern: "Sword of the Demon Hunter: Kijin Gentosho",
            showPattern: "sword-of-the-demon-hunter-kijin-gentosho",
            playlistId: "934042"
        },
        {
            namePattern: "Dr. Stone",
            showPattern: "dr-stone-season-4",
            playlistId: "764287"
        }
        // More patterns can be added as we discover them
    ];
}

// Enhanced import system with multiple methods
async function importGoogleSheetsLinks() {
    console.log('🚀 Starting import process...');
    showImportOptionsModal();
}

// Show import options modal
function showImportOptionsModal() {
    // Close any existing import modal first
    closeImportModal();
    
    const modalHtml = `
        <div class="modal active" id="importModal">
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-file-import"></i> Import Show Links</h2>
                    <span class="close" onclick="closeImportModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <!-- Import Options -->
                    <div class="import-options">
                        <label class="import-option-toggle">
                            <input type="checkbox" id="createNewShowsToggle" checked>
                            <span class="checkmark"></span>
                            Create new show cards for unmatched entries
                        </label>
                        <div class="import-preview" id="importPreview" style="display: none;">
                            <p><i class="fas fa-info-circle"></i> <span id="previewText">Import preview will appear here</span></p>
                        </div>
                    </div>
                    <hr style="margin: 15px 0;">
                    
                    <div class="import-methods">
                        <!-- Method 1: Google Sheets URL -->
                        <div class="import-method">
                            <h3><i class="fas fa-link"></i> Method 1: Google Sheets Link</h3>
                            <p>Enter your Google Sheets share URL and we'll guide you through the process:</p>
                            <input type="url" id="sheetsUrlInput" placeholder="https://docs.google.com/spreadsheets/d/..." style="width: 100%; margin: 5px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <button onclick="processGoogleSheetsUrl()" class="btn btn-primary" style="margin: 5px 0;">Process Link</button>
                            <div id="sheetsInstructions" style="display: none; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                <!-- Instructions will be populated here -->
                            </div>
                        </div>

                        <hr style="margin: 20px 0;">

                        <!-- Method 2: CSV Upload -->
                        <div class="import-method">
                            <h3><i class="fas fa-file-csv"></i> Method 2: CSV File Upload</h3>
                            <p>Upload a CSV file with show names and links:</p>
                            <input type="file" id="csvFileUpload" accept=".csv" style="margin: 5px 0; padding: 5px;">
                            <button onclick="processCsvFile()" class="btn btn-primary" style="margin: 5px 0;">Upload CSV</button>
                        </div>

                        <hr style="margin: 20px 0;">

                        <!-- Method 3: Simple URL List -->
                        <div class="import-method">
                            <h3><i class="fas fa-list"></i> Method 3: URL List</h3>
                            <p>Paste a list of URLs (one per line) and we'll try to match them to your shows:</p>
                            <textarea id="urlListInput" placeholder="https://www.wcostream.tv/show1-episode-1...
https://www.wcostream.tv/show2-episode-1...
https://www.wcostream.tv/show3-episode-1..." rows="6" style="width: 100%; margin: 5px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                            <button onclick="processUrlList()" class="btn btn-primary" style="margin: 5px 0;">Import URLs</button>
                        </div>

                        <hr style="margin: 20px 0;">

                        <!-- Method 4: Manual CSV Paste -->
                        <div class="import-method">
                            <h3><i class="fas fa-paste"></i> Method 4: Manual CSV Paste</h3>
                            <p>Paste CSV content directly (if you downloaded the CSV file):</p>
                            <textarea id="csvPasteInput" placeholder="Name,Link,Status...
Show Name 1,https://www.wcostream.tv/...,Watching
Show Name 2,https://www.wcostream.tv/...,Completed" rows="6" style="width: 100%; margin: 5px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                            <button onclick="processCsvPaste()" class="btn btn-primary" style="margin: 5px 0;">Import CSV</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add custom click handler for import modal
    const importModal = document.getElementById('importModal');
    if (importModal) {
        importModal.addEventListener('click', function(e) {
            // Only close if clicking the modal background, not the content
            if (e.target === importModal) {
                closeImportModal();
            }
        });
        
        // Debug: Check if modal has active class and is visible
        const hasActive = importModal.classList.contains('active');
        const computedStyle = window.getComputedStyle(importModal);
        const isVisible = computedStyle.display !== 'none';
        
        console.log(`✅ Import modal created and event handlers attached`);
        console.log(`🔍 Modal has 'active' class: ${hasActive}`);
        console.log(`👁️ Modal is visible: ${isVisible}`);
        console.log(`📏 Modal display style: ${computedStyle.display}`);
    }
}



// Process Google Sheets URL to provide instructions
function processGoogleSheetsUrl() {
    const url = document.getElementById('sheetsUrlInput').value.trim();
    if (!url) {
        showNotification('❌ Please enter a Google Sheets URL', 'error');
        return;
    }
    
    // Extract spreadsheet ID
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        showNotification('❌ Invalid Google Sheets URL format', 'error');
        return;
    }
    
    const spreadsheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    
    // Show instructions
    const instructions = document.getElementById('sheetsInstructions');
    instructions.style.display = 'block';
    instructions.innerHTML = `
        <h4>📋 Follow these steps:</h4>
        <ol>
            <li><strong>Open this CSV link:</strong> <a href="${csvUrl}" target="_blank">${csvUrl}</a></li>
            <li><strong>Save the file</strong> that downloads (usually called "export.csv")</li>
            <li><strong>Use Method 2 below</strong> to upload the CSV file</li>
        </ol>
        <p><em>Or copy the CSV content and paste it in Method 4 below.</em></p>
    `;
}

// Process CSV file upload
function processCsvFile() {
    console.log('🚀 CSV Upload: Starting process...');
    const fileInput = document.getElementById('csvFileUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        console.log('❌ CSV Upload: No file selected');
        showNotification('❌ Please select a CSV file', 'error');
        return;
    }
    
    console.log(`📁 CSV Upload: File selected - ${file.name} (${file.size} bytes)`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            console.log('📊 CSV Upload: File read successfully');
            console.log('📝 CSV Content Preview:', csvText.substring(0, 200) + '...');
            
            // Clear any existing preview content
            const previewContainer = document.getElementById('importPreview');
            previewContainer.innerHTML = '';
            console.log('🧹 CSV Upload: Preview cleared');
            
            // First, analyze the data and show preview
            console.log('🔍 CSV Upload: Starting analysis...');
            const analysisData = analyzeImportData(csvText, 'csv');
            console.log('🔍 CSV Upload: Analysis complete:', analysisData);
            updateImportPreview(analysisData);
            
            // Wait for user confirmation before proceeding
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '✅ Proceed with Import';
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.style.marginTop = '10px';
            confirmBtn.onclick = function() {
                console.log('👤 CSV Upload: User confirmed, starting import...');
                const updatedCount = parseImprovedCSV(csvText);
                showNotification(`✅ Updated ${updatedCount} shows with links!`, 'success');
                closeImportModal();
            };
            
            previewContainer.appendChild(confirmBtn);
            console.log('✅ CSV Upload: Preview and button added');
            
        } catch (error) {
            console.error('❌ CSV Upload Error:', error);
            showNotification(`❌ Error reading CSV: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// Process URL list
function processUrlList() {
    const urlText = document.getElementById('urlListInput').value.trim();
    if (!urlText) {
        showNotification('❌ Please paste some URLs', 'error');
        return;
    }
    
    // Clear any existing preview content
    const previewArea = document.getElementById('importPreview');
    previewArea.innerHTML = '';
    
    // First, analyze the data and show preview
    const analysisData = analyzeImportData(urlText, 'urls');
    updateImportPreview(analysisData);
    
    // Wait for user confirmation before proceeding
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '✅ Proceed with Import';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.style.marginTop = '10px';
    confirmBtn.onclick = function() {
        const urls = urlText.split('\n').map(url => url.trim()).filter(url => url);
        let updatedCount = 0;
        
        for (const url of urls) {
            if (url.includes('wcostream.tv')) {
                // Extract show name from URL
                const showName = extractShowNameFromUrl(url);
                if (showName) {
                    // Enhanced matching logic - try exact match first
                    const normalizedShowName = normalizeShowName(showName);
                    let show = allShows.find(s => 
                        normalizeShowName(s.name) === normalizedShowName
                    );
                    
                    // If no exact match, try fuzzy matching with stricter threshold
                    if (!show) {
                        show = allShows.find(s => {
                            const normalizedExistingName = normalizeShowName(s.name);
                            const similarity = calculateNameSimilarity(normalizedShowName, normalizedExistingName);
                            return similarity > 0.85; // 85% similarity threshold
                        });
                    }
                    
                    if (show) {
                        show.link = url;
                        saveUserModification(show);
                        updatedCount++;
                        console.log(`✅ Matched "${showName}" → "${show.name}": ${url}`);
                    } else {
                        // Check if we should create new shows
                        const createNewToggle = document.getElementById('createNewShowsToggle');
                        if (createNewToggle && createNewToggle.checked) {
                            const newShow = createNewShow(showName, url);
                            saveUserModification(newShow);
                            updatedCount++;
                            console.log(`🆕 Created "${newShow.name}": ${url}`);
                        } else {
                            console.log(`❌ No match found for "${showName}" (skipped - create new shows disabled)`);
                        }
                    }
                }
            }
        }
        
        if (updatedCount > 0) {
            displayShows();
            showNotification(`✅ Updated ${updatedCount} shows with links!`, 'success');
            closeImportModal();
        } else {
            showNotification('❌ No matching shows found. Check that URLs contain recognizable show names.', 'warning');
        }
    };
    
    previewArea.appendChild(confirmBtn);
}

// Process manual CSV paste
function processCsvPaste() {
    const csvText = document.getElementById('csvPasteInput').value.trim();
    if (!csvText) {
        showNotification('❌ Please paste CSV content', 'error');
        return;
    }
    
    try {
        // Clear any existing preview content
        const previewBox = document.getElementById('importPreview');
        previewBox.innerHTML = '';
        
        // First, analyze the data and show preview
        const analysisData = analyzeImportData(csvText, 'csv');
        updateImportPreview(analysisData);
        
        // Wait for user confirmation before proceeding
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '✅ Proceed with Import';
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.style.marginTop = '10px';
        confirmBtn.onclick = function() {
            const updatedCount = parseImprovedCSV(csvText);
            showNotification(`✅ Updated ${updatedCount} shows with links!`, 'success');
            closeImportModal();
        };
        
        previewBox.appendChild(confirmBtn);
        preview.appendChild(confirmBtn);
        
    } catch (error) {
        showNotification(`❌ Error parsing CSV: ${error.message}`, 'error');
    }
}
// Extract show name from wcostream URL
function extractShowNameFromUrl(url) {
    // Handle different URL formats
    if (url.includes('playlist-cat/')) {
        const match = url.match(/playlist-cat\/\d+\/(.+?)-episode-\d+/);
        return match ? match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
    } else if (url.includes('wcostream.tv/')) {
        const match = url.match(/wcostream\.tv\/(.+?)-episode-\d+/);
        return match ? match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
    }
    return null;
}

// Normalize show name for matching
function normalizeShowName(name) {
    return name.toLowerCase()
        .replace(/[^\w\s]/g, '')  // Remove special characters
        .replace(/\s+/g, ' ')      // Normalize spaces
        .trim();
}

// Improved CSV parser with flexible column detection
function parseImprovedCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    let updatedCount = 0;
    
    // Find possible column indices (flexible matching)
    const nameIndex = headers.findIndex(h => 
        h.includes('name') || h.includes('title') || h.includes('show') || h.includes('anime')
    );
    const linkIndex = headers.findIndex(h => 
        h.includes('link') || h.includes('url') || h.includes('stream') || h.includes('watch')
    );
    
    console.log(`📊 CSV Analysis: Found ${headers.length} columns`);
    console.log(`📝 Headers: ${headers.join(', ')}`);
    console.log(`🎯 Name column: ${nameIndex >= 0 ? headers[nameIndex] : 'NOT FOUND'}`);
    console.log(`🔗 Link column: ${linkIndex >= 0 ? headers[linkIndex] : 'NOT FOUND'}`);
    
    // Smart column detection based on content if headers are corrupted
    let smartNameIndex = nameIndex;
    let smartLinkIndex = linkIndex;
    
    if (nameIndex === -1 || linkIndex === -1) {
        console.log(`🔍 Smart column detection: Analyzing content...`);
        const sampleRows = lines.slice(1, Math.min(6, lines.length)); // Check first 5 data rows
        
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            let hasUrlPattern = 0;
            let hasNamePattern = 0;
            let booleanCount = 0;
            
            sampleRows.forEach(line => {
                const columns = parseCSVLine(line);
                const cellValue = columns[colIndex]?.trim().replace(/"/g, '') || '';
                
                // Check for URL patterns
                if (cellValue.includes('wcostream.tv') || cellValue.includes('http')) {
                    hasUrlPattern++;
                }
                
                // Check if it's a boolean value
                if (cellValue.toUpperCase() === 'TRUE' || cellValue.toUpperCase() === 'FALSE') {
                    booleanCount++;
                }
                
                // Enhanced name pattern detection - exclude booleans, numbers, URLs, and short values
                if (cellValue.length > 5 && 
                    !cellValue.includes('http') && 
                    !cellValue.includes('#REF!') && 
                    cellValue !== '' &&
                    cellValue.toUpperCase() !== 'TRUE' &&
                    cellValue.toUpperCase() !== 'FALSE' &&
                    !/^\d+$/.test(cellValue) && // Not just numbers
                    !/^[A-Z]+$/.test(cellValue) && // Not all caps abbreviations
                    /[a-zA-Z]/.test(cellValue)) { // Contains letters
                    hasNamePattern++;
                }
            });
            
            // Skip columns that are mostly boolean values
            if (booleanCount >= sampleRows.length * 0.7) {
                console.log(`⚠️ Smart detection: Column ${colIndex} contains mostly boolean values, skipping`);
                continue;
            }
            
            // If most cells in this column are URLs, it's likely the link column
            if (hasUrlPattern >= sampleRows.length * 0.7 && smartLinkIndex === -1) {
                smartLinkIndex = colIndex;
                console.log(`🔗 Smart detection: Link column found at index ${colIndex}`);
            }
            
            // If most cells in this column look like names, it's likely the name column
            if (hasNamePattern >= sampleRows.length * 0.7 && smartNameIndex === -1) {
                smartNameIndex = colIndex;
                console.log(`🎯 Smart detection: Name column found at index ${colIndex}`);
            }
        }
    }
    
    if (smartNameIndex === -1) {
        // If still no name column, try to extract from URLs
        if (smartLinkIndex >= 0) {
            console.log('⚠️ No name column found, will extract names from URLs');
        } else {
            throw new Error(`Could not find name or link columns. Found headers: ${headers.join(', ')}`);
        }
    }
    
    if (smartLinkIndex === -1) {
        throw new Error(`Could not find link column. Found headers: ${headers.join(', ')}`);
    }
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);
        const showLink = columns[smartLinkIndex]?.trim().replace(/"/g, '');
        
        if (showLink && showLink.includes('wcostream.tv')) {
            let showName;
            
            if (smartNameIndex >= 0) {
                showName = columns[smartNameIndex]?.trim().replace(/"/g, '');
            } else {
                // Extract name from URL
                showName = extractShowNameFromUrl(showLink);
            }
            
            if (showName) {
                // Enhanced matching logic - try exact match first
                const normalizedShowName = normalizeShowName(showName);
                let show = allShows.find(s => 
                    normalizeShowName(s.name) === normalizedShowName
                );
                
                // If no exact match, try fuzzy matching with stricter threshold
                if (!show) {
                    show = allShows.find(s => {
                        const normalizedExistingName = normalizeShowName(s.name);
                        const similarity = calculateNameSimilarity(normalizedShowName, normalizedExistingName);
                        return similarity > 0.85; // 85% similarity threshold
                    });
                }
                
                if (show) {
                    show.link = showLink;
                    saveUserModification(show);
                    updatedCount++;
                    console.log(`✅ Updated "${show.name}": ${showLink}`);
                } else {
                    // Check if we should create new shows
                    const createNewToggle = document.getElementById('createNewShowsToggle');
                    console.log(`🎛️ Toggle found: ${!!createNewToggle}, Toggle checked: ${createNewToggle?.checked}`);
                    if (createNewToggle && createNewToggle.checked) {
                        const newShow = createNewShow(showName, showLink);
                        saveUserModification(newShow);
                        updatedCount++;
                        console.log(`🆕 Created "${newShow.name}": ${showLink}`);
                    } else {
                        console.log(`❌ No match found for "${showName}" (skipped - create new shows disabled)`);
                    }
                }
            }
        }
    }
    
    if (updatedCount > 0) {
        displayShows();
    }
    
    return updatedCount;
}

// Parse a single CSV line handling quotes and commas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Close import modal
function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.remove();
        console.log('🗑️ Import modal closed and removed');
    } else {
        console.log('⚠️ Import modal not found when trying to close');
    }
}

// Create new show function
function createNewShow(name, link, skipDuplicateCheck = false) {
    // Phase 2: Advanced duplicate detection
    if (!skipDuplicateCheck) {
        const potentialDuplicates = findPotentialDuplicates(name);
        if (potentialDuplicates.length > 0) {
            console.warn(`⚠️ Potential duplicates found for "${name}":`, potentialDuplicates);
            // In Phase 2, we'll show a dialog here for user confirmation
        }
    }
    
    const newShow = {
        id: Math.max(...allShows.map(s => s.id)) + 1, // Safe ID assignment
        name: name,
        status: "plan-to-watch", // Default status for new shows
        link: link,
        watched_episode: 0,
        total_episodes: 0,
        watched_season: 1,
        checked: false,
        rating: 0,
        notes: "Imported from CSV",
        genre: "Unknown",
        year: new Date().getFullYear(),
        type: "anime",
        progress: 0
    };
    
    allShows.push(newShow);
    
    // Save the new show to localStorage
    saveUserModification(newShow);
    
    // Update the display
    filteredShows = [...allShows];
    displayShows();
    updateStatistics();
    
    console.log(`🆕 Created new show: "${name}" with ID ${newShow.id}`);
    return newShow;
}

// Update import preview
function updateImportPreview(data) {
    const createNewToggle = document.getElementById('createNewShowsToggle');
    const previewDiv = document.getElementById('importPreview');
    
    if (!createNewToggle || !previewDiv || !data) return;
    
    const { totalEntries, matchedShows, unmatchedShows, unmatchedList } = data;
    
    if (totalEntries === 0) {
        previewDiv.style.display = 'none';
        return;
    }
    
    let message;
    if (createNewToggle.checked) {
        message = `<i class="fas fa-check-circle"></i> Will update ${matchedShows} existing shows and create ${unmatchedShows} new shows (${totalEntries} total)`;
    } else {
        message = `<i class="fas fa-info-circle"></i> Will update ${matchedShows} existing shows only (${unmatchedShows} unmatched entries will be ignored)`;
    }
    
    // Add unmatched list if there are any
    if (unmatchedShows > 0 && unmatchedList && unmatchedList.length > 0) {
        message += `<br><br><strong>Unmatched entries:</strong><br>`;
        message += unmatchedList.map(name => `• ${escapeHtml(name)}`).join('<br>');
        if (unmatchedList.length < unmatchedShows) {
            message += `<br><em>...and ${unmatchedShows - unmatchedList.length} more</em>`;
        }
    }
    
    previewDiv.innerHTML = message;
    previewDiv.style.display = 'block';
}

// Analyze import data for preview
function analyzeImportData(inputData, type) {
    let entries = [];
    
    // Parse different input types
    if (type === 'csv') {
        // Parse CSV data using the same logic as parseImprovedCSV
        const lines = inputData.trim().split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            console.log('⚠️ CSV has insufficient data');
            return { totalEntries: 0, matchedShows: 0, unmatchedShows: 0, unmatchedList: [] };
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        console.log('🔍 Analysis - Headers found:', headers);
        
        // Find relevant columns (using same logic as parseImprovedCSV)
        let nameCol = headers.findIndex(h => 
            h.includes('name') || h.includes('title') || h.includes('show') || h.includes('anime')
        );
        let linkCol = headers.findIndex(h => 
            h.includes('link') || h.includes('url') || h.includes('stream') || h.includes('watch')
        );
        
        // Smart column detection if headers are corrupted
        if (nameCol === -1 || linkCol === -1) {
            console.log(`🔍 Analysis Smart Detection: Analyzing content...`);
            const sampleRows = lines.slice(1, Math.min(6, lines.length));
            
            for (let colIndex = 0; colIndex < headers.length; colIndex++) {
                let hasUrlPattern = 0;
                let hasNamePattern = 0;
                let booleanCount = 0;
                
                sampleRows.forEach(line => {
                    const columns = parseCSVLine(line);
                    const cellValue = columns[colIndex]?.trim().replace(/"/g, '') || '';
                    
                    if (cellValue.includes('wcostream.tv') || cellValue.includes('http')) {
                        hasUrlPattern++;
                    }
                    
                    // Check if it's a boolean value
                    if (cellValue.toUpperCase() === 'TRUE' || cellValue.toUpperCase() === 'FALSE') {
                        booleanCount++;
                    }
                    
                    // Enhanced name pattern detection - exclude booleans, numbers, URLs, and short values
                    if (cellValue.length > 5 && 
                        !cellValue.includes('http') && 
                        !cellValue.includes('#REF!') && 
                        cellValue !== '' &&
                        cellValue.toUpperCase() !== 'TRUE' &&
                        cellValue.toUpperCase() !== 'FALSE' &&
                        !/^\d+$/.test(cellValue) && // Not just numbers
                        !/^[A-Z]+$/.test(cellValue) && // Not all caps abbreviations
                        /[a-zA-Z]/.test(cellValue)) { // Contains letters
                        hasNamePattern++;
                    }
                });
                
                // Skip columns that are mostly boolean values
                if (booleanCount >= sampleRows.length * 0.7) {
                    console.log(`⚠️ Analysis Smart: Column ${colIndex} contains mostly boolean values, skipping`);
                    continue;
                }
                
                if (hasUrlPattern >= sampleRows.length * 0.7 && linkCol === -1) {
                    linkCol = colIndex;
                    console.log(`🔗 Analysis Smart: Link column found at index ${colIndex}`);
                }
                
                if (hasNamePattern >= sampleRows.length * 0.7 && nameCol === -1) {
                    nameCol = colIndex;
                    console.log(`🎯 Analysis Smart: Name column found at index ${colIndex}`);
                }
            }
        }
        
        console.log(`🔍 Analysis - Name column: ${nameCol}, Link column: ${linkCol}`);
        
        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]); // Use the same CSV parser
            const link = row[linkCol]?.trim().replace(/"/g, '');
            
            if (link && link.includes('wcostream.tv')) {
                let name = '';
                if (nameCol >= 0 && row[nameCol]) {
                    name = row[nameCol].trim().replace(/"/g, '');
                    console.log(`🏷️ Analysis - Row ${i}: Name from column = "${name}"`);
                } else {
                    // Extract from URL if no name column
                    name = extractShowNameFromUrl(link);
                    console.log(`🔗 Analysis - Row ${i}: Name from URL = "${name}" (URL: ${link})`);
                }
                
                if (name) {
                    entries.push({ name, link });
                }
            }
        }
        
        console.log(`🔍 Analysis - Found ${entries.length} valid entries`);
        
    } else if (type === 'urls') {
        // Parse URL list
        const urls = inputData.split('\n').map(url => url.trim()).filter(url => url);
        entries = urls.map(url => ({
            name: extractShowNameFromUrl(url),
            link: url
        })).filter(entry => entry.name);
    }
    
    // Analyze matches
    let matchedShows = 0;
    let unmatchedShows = 0;
    let unmatchedList = [];
    
    entries.forEach(entry => {
        // Enhanced matching logic - more precise detection
        const normalizedEntryName = normalizeShowName(entry.name);
        
        // Try exact match first
        let existingShow = allShows.find(s => 
            normalizeShowName(s.name) === normalizedEntryName
        );
        
        // If no exact match, try fuzzy matching with stricter threshold
        if (!existingShow) {
            existingShow = allShows.find(s => {
                const normalizedShowName = normalizeShowName(s.name);
                const similarity = calculateNameSimilarity(normalizedEntryName, normalizedShowName);
                return similarity > 0.85; // 85% similarity threshold
            });
        }
        
        if (existingShow) {
            matchedShows++;
            console.log(`✅ Analysis Match: "${entry.name}" → "${existingShow.name}"`);
        } else {
            unmatchedShows++;
            unmatchedList.push(entry.name);
            console.log(`❌ Analysis No Match: "${entry.name}"`);
        }
    });
    
    return {
        totalEntries: entries.length,
        matchedShows,
        unmatchedShows,
        unmatchedList: unmatchedList.slice(0, 10) // Show max 10 examples
    };
}

// Calculate similarity between two show names using normalized comparison
function calculateNameSimilarity(name1, name2) {
    // If either name is empty, no similarity
    if (!name1 || !name2) return 0;
    
    // Exact match = 100% similarity
    if (name1 === name2) return 1.0;
    
    // Calculate Levenshtein distance-based similarity
    const maxLength = Math.max(name1.length, name2.length);
    const distance = levenshteinDistance(name1, name2);
    return 1 - (distance / maxLength);
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    // Create matrix
    for (let i = 0; i <= str1.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
        matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
            if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str1.length][str2.length];
}

// Advanced duplicate detection for Phase 2
function calculateSimilarity(str1, str2) {
    // Levenshtein distance algorithm for fuzzy matching
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Create matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i-1] === str2[j-1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i-1][j] + 1,      // deletion
                matrix[i][j-1] + 1,      // insertion
                matrix[i-1][j-1] + cost  // substitution
            );
        }
    }
    
    // Convert to similarity percentage
    const maxLen = Math.max(len1, len2);
    return maxLen > 0 ? (1 - matrix[len1][len2] / maxLen) * 100 : 100;
}

function findPotentialDuplicates(newShowName, threshold = 80) {
    const normalized = normalizeShowName(newShowName);
    const potentialDuplicates = [];
    
    allShows.forEach(existingShow => {
        const existingNormalized = normalizeShowName(existingShow.name);
        const similarity = calculateSimilarity(normalized, existingNormalized);
        
        if (similarity >= threshold && similarity < 100) {
            potentialDuplicates.push({
                show: existingShow,
                similarity: similarity.toFixed(1)
            });
        }
    });
    
    return potentialDuplicates.sort((a, b) => b.similarity - a.similarity);
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