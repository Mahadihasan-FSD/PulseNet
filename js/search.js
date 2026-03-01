/**
 * Search Users Feature
 * Step-by-step implementation:
 * 1. Real-time search as user types
 * 2. Debounce to prevent excessive queries
 * 3. Display clickable results
 */

import { 
    collection, 
    query, 
    where, 
    getDocs,
    limit 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export class SearchManager {
    constructor(db, auth) {
        this.db = db;
        this.auth = auth;
        this.searchTimeout = null;
        this.initSearch();
    }

    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');

        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            
            // Clear previous timeout
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            // Hide results if search term is empty
            if (!searchTerm) {
                searchResults.classList.remove('show');
                return;
            }

            // Debounce search
            this.searchTimeout = setTimeout(() => {
                this.performSearch(searchTerm);
            }, 300);
        });

        // Close results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('show');
            }
        });
    }

    async performSearch(searchTerm) {
        try {
            const searchResults = document.getElementById('searchResults');
            
            // Search by username (case-insensitive)
            // Note: For production, consider using Firebase Extensions for full-text search
            const usersQuery = query(
                collection(this.db, 'users'),
                where('username', '>=', searchTerm),
                where('username', '<=', searchTerm + '\uf8ff'),
                limit(10)
            );

            const querySnapshot = await getDocs(usersQuery);
            
            if (querySnapshot.empty) {
                searchResults.innerHTML = `
                    <div class="search-result-item">
                        <div class="result-info">
                            <p>No users found</p>
                        </div>
                    </div>
                `;
            } else {
                let resultsHTML = '';
                querySnapshot.forEach((doc) => {
                    const user = doc.data();
                    // Don't show current user in search
                    if (user.uid !== this.auth.currentUser?.uid) {
                        resultsHTML += this.createSearchResultItem(user);
                    }
                });
                
                if (!resultsHTML) {
                    resultsHTML = `
                        <div class="search-result-item">
                            <div class="result-info">
                                <p>No other users found</p>
                            </div>
                        </div>
                    `;
                }
                
                searchResults.innerHTML = resultsHTML;
            }
            
            searchResults.classList.add('show');
            
            // Add click handlers to results
            this.attachResultClickHandlers();
            
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    createSearchResultItem(user) {
        return `
            <div class="search-result-item" data-user-id="${user.uid}">
                <div class="result-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="result-info">
                    <h4>@${user.username}</h4>
                    <p>${user.followers?.length || 0} followers</p>
                </div>
            </div>
        `;
    }

    attachResultClickHandlers() {
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                if (userId) {
                    window.location.href = `profile.html?id=${userId}`;
                }
            });
        });
    }
}