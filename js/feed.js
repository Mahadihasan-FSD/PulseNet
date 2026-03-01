import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    getDoc 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

export class FeedManager {
    constructor(db, auth, currentUser) {
        this.db = db;
        this.auth = auth;
        this.currentUser = currentUser;
        this.posts = [];
        this.currentFilter = 'all';
    }

    // Render feed with posts
    renderFeed(posts) {
        const feedContainer = document.getElementById('feedContainer');
        
        if (posts.length === 0) {
            feedContainer.innerHTML = this.getEmptyStateHTML();
            return;
        }

        let html = '';
        posts.forEach(doc => {
            const post = doc.data();
            post.id = doc.id;
            html += this.getPostHTML(post);
        });

        feedContainer.innerHTML = html;
        this.attachPostEventListeners();
    }

    // Get post HTML template
    getPostHTML(post) {
        const isLiked = post.likes && post.likes.includes(this.currentUser?.uid);
        const timeAgo = this.formatTimestamp(post.createdAt);
        
        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <span class="author-name" data-user-id="${post.userId}">
                            ${post.authorName || 'User'}
                        </span>
                    </div>
                    <span class="post-time">${timeAgo}</span>
                </div>
                
                <div class="post-content">
                    ${post.content}
                </div>
                
                <div class="post-footer">
                    <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                        <i class="fas ${isLiked ? 'fa-heart' : 'fa-heart'}"></i>
                        <span>${post.likes?.length || 0}</span>
                    </button>
                </div>
            </div>
        `;
    }

    // Get empty state HTML
    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-wave-square"></i>
                <h3>No pulses yet</h3>
                <p>Be the first to share your pulse!</p>
            </div>
        `;
    }

    // Attach event listeners to posts
    attachPostEventListeners() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                await this.toggleLike(postId);
            });
        });

        // Author names
        document.querySelectorAll('.author-name').forEach(author => {
            author.addEventListener('click', () => {
                const userId = author.dataset.userId;
                window.location.href = `profile.html?id=${userId}`;
            });
        });
    }

    // Toggle like on post
    async toggleLike(postId) {
        try {
            const postRef = doc(this.db, 'posts', postId);
            const postDoc = await getDoc(postRef);
            
            if (postDoc.exists()) {
                const likes = postDoc.data().likes || [];
                
                if (likes.includes(this.currentUser.uid)) {
                    await updateDoc(postRef, {
                        likes: arrayRemove(this.currentUser.uid)
                    });
                } else {
                    await updateDoc(postRef, {
                        likes: arrayUnion(this.currentUser.uid)
                    });
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    // Format timestamp
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Just now';
        
        const date = timestamp.toDate();
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }
}

/**
 * Enhanced Feed Manager with Comments
 * Step-by-step implementation:
 * 1. Integrate comments into feed posts
 * 2. Real-time like updates
 * 3. Filter feed by followed users
 */

import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

import { CommentsManager } from './comments.js';

export class FeedManager {
    constructor(db, auth, currentUser) {
        this.db = db;
        this.auth = auth;
        this.currentUser = currentUser;
        this.commentsManager = new CommentsManager(db, auth);
        this.feedUnsubscribe = null;
        this.currentFilter = 'all';
    }

    /**
     * Initialize feed with filter
     */
    initFeed() {
        // Set up filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.loadFeed();
            });
        });

        this.loadFeed();
    }

    /**
     * Load feed based on current filter
     */
    async loadFeed() {
        let postsQuery;
        
        if (this.currentFilter === 'following') {
            // Get followed users
            const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
            const followedUsers = userDoc.data().following || [];
            
            // Include current user's posts as well
            const usersToShow = [this.currentUser.uid, ...followedUsers];
            
            postsQuery = query(
                collection(this.db, 'posts'),
                where('userId', 'in', usersToShow),
                orderBy('createdAt', 'desc')
            );
        } else {
            // Show all posts
            postsQuery = query(
                collection(this.db, 'posts'),
                orderBy('createdAt', 'desc')
            );
        }

        // Set up real-time listener
        if (this.feedUnsubscribe) {
            this.feedUnsubscribe();
        }

        this.feedUnsubscribe = onSnapshot(postsQuery, async (snapshot) => {
            await this.renderFeed(snapshot.docs);
        });
    }

    async renderFeed(posts) {
        const feedContainer = document.getElementById('feedContainer');
        
        if (posts.length === 0) {
            feedContainer.innerHTML = this.getEmptyStateHTML();
            return;
        }

        let html = '';
        for (const doc of posts) {
            const post = doc.data();
            post.id = doc.id;
            
            // Get author info
            const userDoc = await getDoc(doc(this.db, 'users', post.userId));
            const userData = userDoc.exists() ? userDoc.data() : { username: 'Unknown User' };
            
            html += await this.getPostHTML(post, userData);
        }

        feedContainer.innerHTML = html;
        
        // Initialize comments for each post
        posts.forEach(doc => {
            this.commentsManager.initComments(doc.id, `post-${doc.id}`);
        });
        
        this.attachPostEventListeners();
    }

    async getPostHTML(post, userData) {
        const isLiked = post.likes && post.likes.includes(this.currentUser?.uid);
        const timeAgo = this.formatTimestamp(post.createdAt);
        
        return `
            <div class="post-card" id="post-${post.id}" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <span class="author-name" data-user-id="${post.userId}">
                            @${userData.username || 'User'}
                        </span>
                    </div>
                    <span class="post-time">${timeAgo}</span>
                </div>
                
                <div class="post-content">
                    ${this.escapeHtml(post.content)}
                </div>
                
                <div class="post-footer">
                    <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" 
                            data-post-id="${post.id}">
                        <i class="fas fa-heart"></i>
                        <span>${post.likes?.length || 0}</span>
                    </button>
                </div>
                
                <!-- Comments section will be injected here -->
            </div>
        `;
    }

    attachPostEventListeners() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                await this.toggleLike(postId, btn);
            });
        });

        // Author names
        document.querySelectorAll('.author-name').forEach(author => {
            author.addEventListener('click', () => {
                const userId = author.dataset.userId;
                window.location.href = `profile.html?id=${userId}`;
            });
        });
    }

    async toggleLike(postId, button) {
        try {
            const postRef = doc(this.db, 'posts', postId);
            const postDoc = await getDoc(postRef);
            
            if (postDoc.exists()) {
                const likes = postDoc.data().likes || [];
                const likeCount = button.querySelector('span');
                
                if (likes.includes(this.currentUser.uid)) {
                    await updateDoc(postRef, {
                        likes: arrayRemove(this.currentUser.uid)
                    });
                    button.classList.remove('liked');
                    likeCount.textContent = parseInt(likeCount.textContent) - 1;
                } else {
                    await updateDoc(postRef, {
                        likes: arrayUnion(this.currentUser.uid)
                    });
                    button.classList.add('liked');
                    likeCount.textContent = parseInt(likeCount.textContent) + 1;
                    
                    // Animate heart
                    button.style.animation = 'none';
                    button.offsetHeight;
                    button.style.animation = 'heartBeat 0.3s ease';
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-wave-square"></i>
                <h3>No pulses to show</h3>
                <p>${this.currentFilter === 'following' ? 
                    'Follow more users to see their posts!' : 
                    'Be the first to share your pulse!'}</p>
            </div>
        `;
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Just now';
        
        const date = timestamp.toDate();
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clean up listeners
     */
    cleanup() {
        if (this.feedUnsubscribe) {
            this.feedUnsubscribe();
        }
        this.commentsManager.cleanup();
    }
}