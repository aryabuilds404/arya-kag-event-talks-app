// Application State
let allUpdates = [];
let selectedUpdateId = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const filterPills = document.getElementById('filter-pills');
const updatesList = document.getElementById('updates-list');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const floatingBar = document.getElementById('floating-bar');
const selectionCount = document.getElementById('selection-count');
const btnTweetSelected = document.getElementById('btn-tweet-selected');
const btnClearSelection = document.getElementById('btn-clear-selection');
const feedLastUpdated = document.getElementById('feed-last-updated');
const updatesCount = document.getElementById('updates-count');
const toast = document.getElementById('toast');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchReleaseNotes();
});

// Event Listeners Setup
function setupEventListeners() {
  // Refresh Button
  btnRefresh.addEventListener('click', () => {
    if (!btnRefresh.classList.contains('loading')) {
      fetchReleaseNotes();
    }
  });

  // Search Input with Debounce/Immediate response
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderUpdates();
  });

  // Filter Pills
  filterPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;

    // Remove active class from all pills
    filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    
    // Add active class to clicked pill
    pill.classList.add('active');
    
    currentFilter = pill.dataset.filter;
    renderUpdates();
  });

  // Floating Action Bar Buttons
  btnTweetSelected.addEventListener('click', () => {
    if (selectedUpdateId) {
      const update = allUpdates.find(u => u.id === selectedUpdateId);
      if (update) {
        tweetUpdate(update);
      }
    }
  });

  btnClearSelection.addEventListener('click', () => {
    clearSelection();
  });
}

// Fetch Release Notes from Flask API
async function fetchReleaseNotes() {
  showLoading(true);
  try {
    const response = await fetch('/api/release-notes');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.status === 'success') {
      // Parse feed metadata
      if (data.updated) {
        const date = new Date(data.updated);
        feedLastUpdated.textContent = `Updated: ${date.toLocaleString()}`;
      } else {
        feedLastUpdated.textContent = 'Updated: Recent';
      }
      
      // Parse all updates from entries
      allUpdates = parseFeedEntries(data.entries);
      updatesCount.textContent = `${allUpdates.length} updates available`;
      
      // Render
      renderUpdates();
      showToast('Feed refreshed successfully!', 'success');
    } else {
      throw new Error(data.message || 'Unknown server error');
    }
  } catch (error) {
    console.error('Error fetching release notes:', error);
    showToast(`Failed to refresh feed: ${error.message}`, 'error');
    
    // If we have no updates to show, display empty state
    if (allUpdates.length === 0) {
      showEmptyState(true, 'Failed to fetch release notes. Check your server connection.');
    }
  } finally {
    showLoading(false);
  }
}

// Parse HTML feed entries into individual update objects
function parseFeedEntries(entries) {
  const parsedUpdates = [];
  
  entries.forEach(entry => {
    const docUpdates = parseEntryContent(entry);
    parsedUpdates.push(...docUpdates);
  });
  
  return parsedUpdates;
}

// Helper to parse individual entry's CDATA HTML content
function parseEntryContent(entry) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(entry.content, 'text/html');
  const updates = [];
  
  const children = Array.from(doc.body.children);
  let currentUpdate = null;
  let subIdx = 0;
  
  children.forEach(child => {
    if (child.tagName === 'H3') {
      if (currentUpdate) {
        updates.push(currentUpdate);
      }
      
      const typeText = child.textContent.trim();
      currentUpdate = {
        id: `${entry.id}_${subIdx++}`,
        date: entry.date,
        link: entry.link,
        type: typeText,
        htmlContent: '',
        textContent: ''
      };
    } else {
      if (currentUpdate) {
        currentUpdate.htmlContent += child.outerHTML;
        currentUpdate.textContent += (currentUpdate.textContent ? ' ' : '') + child.textContent.trim();
      } else {
        // Content before any H3
        currentUpdate = {
          id: `${entry.id}_${subIdx++}`,
          date: entry.date,
          link: entry.link,
          type: 'General',
          htmlContent: child.outerHTML,
          textContent: child.textContent.trim()
        };
      }
    }
  });
  
  if (currentUpdate) {
    updates.push(currentUpdate);
  }
  
  // Fallback: If no children parsed, use raw contents
  if (updates.length === 0 && entry.content) {
    updates.push({
      id: `${entry.id}_0`,
      date: entry.date,
      link: entry.link,
      type: 'General',
      htmlContent: entry.content,
      textContent: doc.body.textContent.trim()
    });
  }
  
  return updates;
}

// Render filtered and searched updates
function renderUpdates() {
  // Clear list
  updatesList.innerHTML = '';
  
  // Filter updates
  const filtered = allUpdates.filter(update => {
    // 1. Filter by category pill
    if (currentFilter !== 'all') {
      if (update.type.toLowerCase() !== currentFilter) {
        return false;
      }
    }
    
    // 2. Filter by search input query
    if (searchQuery) {
      const typeMatch = update.type.toLowerCase().includes(searchQuery);
      const dateMatch = update.date.toLowerCase().includes(searchQuery);
      const contentMatch = update.textContent.toLowerCase().includes(searchQuery);
      return typeMatch || dateMatch || contentMatch;
    }
    
    return true;
  });
  
  // Show empty state if nothing matches
  if (filtered.length === 0) {
    showEmptyState(true);
    updatesList.style.display = 'none';
    return;
  }
  
  showEmptyState(false);
  updatesList.style.display = 'grid';
  
  // Create cards
  filtered.forEach((update, index) => {
    const card = createUpdateCard(update, index);
    updatesList.appendChild(card);
  });
}

// Create Card DOM element
function createUpdateCard(update, index) {
  const card = document.createElement('div');
  card.className = `update-card fade-in`;
  card.style.animationDelay = `${Math.min(index * 0.05, 0.8)}s`;
  card.dataset.id = update.id;
  
  // Determine Type Class & Accent Color
  const typeLower = update.type.toLowerCase();
  let badgeClass = 'badge-general';
  let accentColor = 'var(--text-muted)';
  
  if (typeLower.includes('feature')) {
    badgeClass = 'badge-feature';
    accentColor = 'var(--type-feature-start)';
  } else if (typeLower.includes('issue')) {
    badgeClass = 'badge-issue';
    accentColor = 'var(--type-issue-start)';
  } else if (typeLower.includes('breaking')) {
    badgeClass = 'badge-breaking';
    accentColor = 'var(--type-breaking-start)';
  } else if (typeLower.includes('change')) {
    badgeClass = 'badge-change';
    accentColor = 'var(--type-change-start)';
  } else if (typeLower.includes('announcement')) {
    badgeClass = 'badge-announcement';
    accentColor = 'var(--type-announcement-start)';
  }
  
  card.style.setProperty('--card-accent-color', accentColor);
  
  if (selectedUpdateId === update.id) {
    card.classList.add('selected');
  }
  
  card.innerHTML = `
    <!-- Selection Indicator Checkbox -->
    <div class="card-selector">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    
    <!-- Card Header -->
    <div class="card-header">
      <div class="update-date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${update.date}
      </div>
      <span class="badge-type ${badgeClass}">${update.type}</span>
    </div>
    
    <!-- Card Body (HTML parsed contents) -->
    <div class="card-body">
      ${update.htmlContent}
    </div>
    
    <!-- Card Footer -->
    <div class="card-footer">
      <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="source-link" onclick="event.stopPropagation()">
        <span>Official Release Notes</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
      <button class="btn-tweet-direct" onclick="event.stopPropagation(); directTweet('${update.id}')">
        <svg viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
        Tweet
      </button>
    </div>
  `;
  
  // Card Selection Event
  card.addEventListener('click', () => {
    toggleSelection(update.id);
  });
  
  return card;
}

// Toggle update card selection
function toggleSelection(updateId) {
  const previouslySelected = selectedUpdateId;
  
  if (selectedUpdateId === updateId) {
    // Deselect if already selected
    selectedUpdateId = null;
  } else {
    // Select this card (single selection model)
    selectedUpdateId = updateId;
  }
  
  // Update UI selection classes
  updatesList.querySelectorAll('.update-card').forEach(card => {
    const cardId = card.dataset.id;
    if (cardId === selectedUpdateId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  updateFloatingBar();
}

// Direct Tweet from Card Footer
function directTweet(updateId) {
  const update = allUpdates.find(u => u.id === updateId);
  if (update) {
    tweetUpdate(update);
  }
}

// Update floating bar visibility & count
function updateFloatingBar() {
  if (selectedUpdateId) {
    selectionCount.textContent = "1";
    floatingBar.classList.add('visible');
  } else {
    floatingBar.classList.remove('visible');
  }
}

// Clear currently selected update
function clearSelection() {
  selectedUpdateId = null;
  updatesList.querySelectorAll('.update-card').forEach(card => {
    card.classList.remove('selected');
  });
  updateFloatingBar();
}

// Tweet Update Action (compose Twitter Web Intent)
function tweetUpdate(update) {
  const baseUrl = "https://twitter.com/intent/tweet";
  
  // Normalize whitespaces
  let cleanText = update.textContent.replace(/\s+/g, ' ').trim();
  
  // We want to fit within Twitter 280-char limit
  // Budget calculations:
  // URL (always counts as 23 chars on Twitter)
  // Suffix hashtags e.g. " #BigQuery #GoogleCloud" (~23 chars)
  // Prefix: "BigQuery Update ([Date]) | [Type]: " (up to ~50 chars)
  // Total static chars: 23 + 23 + 50 = 96 chars.
  // Remaining for text: 280 - 96 - 4 (buffer) = ~180 chars.
  const hashtags = "BigQuery,GoogleCloud";
  const prefix = `BigQuery Update (${update.date}) | ${update.type}: `;
  const staticCharsCount = prefix.length + 23 + hashtags.length + 12; // 23 for t.co url + hashtags + formatting space
  
  const maxDescLength = 280 - staticCharsCount;
  
  let tweetDesc = cleanText;
  if (tweetDesc.length > maxDescLength) {
    tweetDesc = tweetDesc.substring(0, maxDescLength - 3) + "...";
  }
  
  const tweetText = `${prefix}${tweetDesc}`;
  const intentUrl = `${baseUrl}?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(update.link)}&hashtags=${encodeURIComponent(hashtags)}`;
  
  window.open(intentUrl, '_blank', 'noopener,noreferrer');
}

// Loading state UI toggle
function showLoading(isLoading) {
  if (isLoading) {
    loadingState.style.display = 'flex';
    updatesList.style.display = 'none';
    emptyState.style.display = 'none';
    btnRefresh.classList.add('loading');
    btnRefresh.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      Refreshing...
    `;
  } else {
    loadingState.style.display = 'none';
    btnRefresh.classList.remove('loading');
    btnRefresh.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
      Refresh Feed
    `;
  }
}

// Empty State UI toggle
function showEmptyState(isEmpty, message = '') {
  if (isEmpty) {
    emptyState.style.display = 'flex';
    if (message) {
      emptyState.querySelector('.state-desc').textContent = message;
    } else {
      emptyState.querySelector('.state-desc').textContent = "We couldn't find any release notes matching your filters. Try adjusting your search query.";
    }
  } else {
    emptyState.style.display = 'none';
  }
}

// Toast notification helper
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.style.borderColor = type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
