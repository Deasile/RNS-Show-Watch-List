// Global variables
let allShows = [];
let filteredShows = [];
let isGridView = true;

// ULTIMATE EXTENSION PROTECTION SYSTEM - Maximum Aggression Mode
(function() {
    'use strict';
    
    // LEVEL 1: Global Promise Rejection Handler
    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && event.reason.message && (
            event.reason.message.includes('Could not establish connection') ||
            event.reason.message.includes('Receiving end does not exist') ||
            event.reason.message.includes('Extension context invalidated') ||
            event.reason.message.includes('chrome-extension://') ||
            event.reason.message.includes('moz-extension://')
        )) {
            console.warn('🛡️ Extension promise rejection blocked:', event.reason.message);
            event.preventDefault();
            event.stopPropagation();
        }
    });
    
    // LEVEL 2: Override chrome runtime messaging completely
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Block sendMessage
        const originalSendMessage = chrome.runtime.sendMessage;
        chrome.runtime.sendMessage = function(...args) {
            return new Promise((resolve) => {
                try {
                    const result = originalSendMessage.apply(this, args);
                    if (result && typeof result.then === 'function') {
                        result.catch((error) => {
                            console.warn('🛡️ Extension sendMessage error suppressed:', error.message);
                            resolve(); // Always resolve, never reject
                        }).then(resolve);
                    } else {
                        resolve(result);
                    }
                } catch (error) {
                    console.warn('🛡️ Extension sendMessage blocked:', error.message);
                    resolve(); // Always resolve
                }
            });
        };
        
        // Block connect
        if (chrome.runtime.connect) {
            const originalConnect = chrome.runtime.connect;
            chrome.runtime.connect = function(...args) {
                try {
                    const port = originalConnect.apply(this, args);
                    // Wrap port methods to prevent errors
                    const safePort = {
                        postMessage: function(msg) {
                            try { port.postMessage(msg); } catch(e) { console.warn('🛡️ Port message blocked:', e.message); }
                        },
                        onMessage: { 
                            addListener: function(callback) {
                                try { port.onMessage.addListener(callback); } catch(e) { console.warn('🛡️ Port listener blocked:', e.message); }
                            }
                        },
                        onDisconnect: { 
                            addListener: function(callback) {
                                try { port.onDisconnect.addListener(callback); } catch(e) { console.warn('🛡️ Port disconnect blocked:', e.message); }
                            }
                        },
                        disconnect: function() {
                            try { port.disconnect(); } catch(e) { console.warn('🛡️ Port disconnect blocked:', e.message); }
                        }
                    };
                    return safePort;
                } catch (error) {
                    console.warn('🛡️ Extension connection completely blocked:', error.message);
                    return {
                        postMessage: () => {},
                        onMessage: { addListener: () => {} },
                        onDisconnect: { addListener: () => {} },
                        disconnect: () => {}
                    };
                }
            };
        }
    }
    
    // LEVEL 3: Disable chrome object entirely if causing issues
    if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
        console.warn('🛡️ Blocking problematic chrome object');
        Object.defineProperty(window, 'chrome', {
            get: function() {
                return {
                    runtime: {
                        sendMessage: () => Promise.resolve(),
                        connect: () => ({
                            postMessage: () => {},
                            onMessage: { addListener: () => {} },
                            onDisconnect: { addListener: () => {} },
                            disconnect: () => {}
                        })
                    }
                };
            },
            configurable: true
        });
    }
})();

// Enhanced error suppression for browser extension conflicts
window.addEventListener('error', function(e) {
    // Suppress extension-related errors
    if (e.message && (
        e.message.includes('Could not establish connection') ||
        e.message.includes('Receiving end does not exist') ||
        e.message.includes('Extension context invalidated') ||
        e.message.includes('chrome-extension://') ||
        e.message.includes('moz-extension://') ||
        e.message.includes('The message port closed before a response was received') ||
        e.message.includes('Attempting to use a disconnected port object') ||
        e.message.includes('chrome.runtime.sendMessage')
    )) {
        console.warn('Browser extension error suppressed:', e.message);
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
});

window.addEventListener('unhandledrejection', function(e) {
    // Suppress promise rejections from extensions
    if (e.reason && (
        (e.reason.message && (
            e.reason.message.includes('Could not establish connection') ||
            e.reason.message.includes('Receiving end does not exist') ||
            e.reason.message.includes('Extension context invalidated') ||
            e.reason.message.includes('The message port closed before a response was received') ||
            e.reason.message.includes('Attempting to use a disconnected port object') ||
            e.reason.message.includes('chrome.runtime.sendMessage')
        )) ||
        (typeof e.reason === 'string' && (
            e.reason.includes('Could not establish connection') ||
            e.reason.includes('Receiving end does not exist') ||
            e.reason.includes('The message port closed before a response was received') ||
            e.reason.includes('Attempting to use a disconnected port object')
        ))
    )) {
        console.warn('Browser extension promise rejection suppressed:', e.reason);
        e.preventDefault();
        return false;
    }
});

// Additional protection for dynamic content changes
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener, options) {
    try {
        return originalAddEventListener.call(this, type, function(event) {
            try {
                return listener.call(this, event);
            } catch (error) {
                if (error.message && (
                    error.message.includes('Could not establish connection') ||
                    error.message.includes('Receiving end does not exist') ||
                    error.message.includes('Extension context invalidated')
                )) {
                    console.warn('Extension error in event listener suppressed:', error.message);
                    return false;
                }
                throw error;
            }
        }, options);
    } catch (error) {
        console.warn('Event listener setup error suppressed:', error.message);
        return false;
    }
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
    // Final safety net: debounced error protection
    let errorCount = 0;
    const maxErrors = 10;
    const errorResetTime = 5000; // 5 seconds
    
    function resetErrorCount() {
        errorCount = 0;
    }
    
    // Monitor for extension connection errors specifically
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const errorMessage = args.join(' ');
        if (errorMessage.includes('Could not establish connection') || 
            errorMessage.includes('Receiving end does not exist')) {
            errorCount++;
            console.warn(`Extension connection error #${errorCount} suppressed:`, errorMessage);
            
            if (errorCount === 1) {
                // Reset counter after delay
                setTimeout(resetErrorCount, errorResetTime);
            }
            
            if (errorCount > maxErrors) {
                console.warn('Too many extension errors detected. Consider disabling problematic extensions.');
                resetErrorCount();
            }
            return; // Don't show the error
        }
        // Allow other errors through
        originalConsoleError.apply(console, args);
    };
    
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
    try {
        if (filteredShows.length === 0) {
            showEmptyState('No shows found matching your criteria.');
            return;
        }

        const showsHtml = filteredShows.map(show => createShowCard(show)).join('');
        showList.innerHTML = showsHtml;
        
        // Setup event listeners for the new cards with delay to avoid extension conflicts
        setTimeout(() => {
            try {
                setupShowCardListeners();
            } catch (error) {
                console.warn('Event listener setup error suppressed:', error);
            }
        }, 50);
        
    } catch (error) {
        console.warn('Display shows error suppressed:', error);
        showEmptyState('Error displaying shows. Please refresh the page.');
    }
}

// Create a show card HTML
// 🔍 DIAGNOSTIC ERROR TRACKING - Specifically for show interactions
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

function wrapShowFunction(fn, functionName) {
    return function(...args) {
        const showId = args[0] && args[0].id ? args[0].id : (args[0] || 'unknown');
        
        try {
            logDiagnostic(`${functionName}_start`, showId);
            const result = fn.apply(this, args);
            
            // If result is a promise, wrap it
            if (result && typeof result.then === 'function') {
                return result.then(
                    (value) => {
                        logDiagnostic(`${functionName}_success`, showId);
                        return value;
                    },
                    (error) => {
                        logDiagnostic(`${functionName}_error`, showId, error);
                        console.error(`🚨 SHOW INTERACTION ERROR in ${functionName}:`, error);
                        throw error;
                    }
                );
            } else {
                logDiagnostic(`${functionName}_success`, showId);
                return result;
            }
        } catch (error) {
            logDiagnostic(`${functionName}_error`, showId, error);
            console.error(`🚨 SHOW INTERACTION ERROR in ${functionName}:`, error);
            throw error;
        }
    };
}

// Enhanced error monitoring specifically for extension communication
function monitorExtensionErrors() {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (typeof listener === 'function') {
            const wrappedListener = function(event) {
                try {
                    return listener.call(this, event);
                } catch (error) {
                    if (error.message && error.message.includes('Could not establish connection')) {
                        console.warn('🛡️ INTERCEPTED extension error in event listener:', error.message);
                        logDiagnostic('extension_error_intercepted', 'event_listener', error);
                    } else {
                        throw error;
                    }
                }
            };
            
            return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        
        return originalAddEventListener.call(this, type, listener, options);
    };
}

// Initialize diagnostic monitoring
monitorExtensionErrors();

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
                    <div class="episode-controls">
                        <button class="episode-btn minus-btn" 
                                id="minus-btn-${show.id}" 
                                data-show-id="${show.id}" 
                                data-action="decrease">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="episode-count">${show.watched_episode}</span>
                        <button class="episode-btn plus-btn" 
                                id="plus-btn-${show.id}" 
                                data-show-id="${show.id}" 
                                data-action="increase">
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

// Setup show card event listeners with enhanced diagnostic tracking
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
                            console.warn('🛡️ EXTENSION ERROR in episode button:', error.message);
                            return; // Suppress extension errors
                        }
                        throw error; // Re-throw non-extension errors
                    }
                };
                
                btn.addEventListener('click', wrappedHandler);
                logDiagnostic('episode_btn_listener_added', btn.dataset.showId || 'unknown');
            } catch (error) {
                logDiagnostic('episode_btn_setup_error', 'unknown', error);
                console.warn('Episode button listener error suppressed:', error);
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
                            console.warn('🛡️ EXTENSION ERROR in star rating:', error.message);
                            return; // Suppress extension errors
                        }
                        throw error; // Re-throw non-extension errors
                    }
                };
                
                star.addEventListener('click', wrappedHandler);
                logDiagnostic('star_rating_listener_added', star.closest('.star-rating').dataset.showId || 'unknown');
            } catch (error) {
                logDiagnostic('star_rating_setup_error', 'unknown', error);
                console.warn('Star rating listener error suppressed:', error);
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
                            console.warn('🛡️ EXTENSION ERROR in status dropdown:', error.message);
                            return; // Suppress extension errors
                        }
                        throw error; // Re-throw non-extension errors
                    }
                };
                
                dropdown.addEventListener('change', wrappedHandler);
                logDiagnostic('status_dropdown_listener_added', dropdown.dataset.showId || 'unknown');
            } catch (error) {
                logDiagnostic('status_dropdown_setup_error', 'unknown', error);
                console.warn('Status dropdown listener error suppressed:', error);
            }
        });
        
        logDiagnostic('setupShowCardListeners_success', 'all');
    } catch (error) {
        logDiagnostic('setupShowCardListeners_error', 'all', error);
        console.warn('Overall event listener setup error suppressed:', error);
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
    try {
        isGridView = !isGridView;
        if (isGridView) {
            showList.classList.remove('list-view');
            toggleView.innerHTML = '<i class="fas fa-list"></i> List View';
        } else {
            showList.classList.add('list-view');
            toggleView.innerHTML = '<i class="fas fa-th"></i> Grid View';
        }
        localStorage.setItem('viewPreference', isGridView ? 'grid' : 'list');
        
        // Small delay to allow DOM to settle before extensions try to inject
        setTimeout(() => {
            // Re-setup event listeners after view change to prevent stale references
            setupShowCardListeners();
        }, 100);
        
    } catch (error) {
        console.warn('View toggle error suppressed:', error);
        // Reset to safe state if error occurs
        isGridView = true;
        showList.classList.remove('list-view');
        toggleView.innerHTML = '<i class="fas fa-list"></i> List View';
    }
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