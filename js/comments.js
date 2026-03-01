/**
 * Comments Feature
 * Step-by-step implementation:
 * 1. Create comments subcollection under each post
 * 2. Real-time comments display
 * 3. Add new comments with timestamps
 */

import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export class CommentsManager {
    constructor(db, auth) {
        this.db = db;
        this.auth = auth;
        this.activeComments = new Map(); // Store unsubscribe functions
    }

    /**
     * Initialize comments for a post
     */
    initComments(postId, containerId) {
        const commentsContainer = document.getElementById(containerId);
        if (!commentsContainer) return;

        // Create comments structure
        commentsContainer.innerHTML = `
            <div class="comments-section">
                <button class="comments-toggle" data-post-id="${postId}">
                    <i class="fas fa-chevron-down"></i>
                    <span>Comments</span>
                </button>
                <div class="comments-container" id="comments-${postId}">
                    <div class="comments-list" id="comments-list-${postId}">
                        <div class="loading-state">
                            <div class="loader"></div>
                        </div>
                    </div>
                    <div class="comment-input-wrapper">
                        <input type="text" 
                               class="comment-input" 
                               id="comment-input-${postId}" 
                               placeholder="Add a comment..."
                               maxlength="200">
                        <button class="comment-submit" 
                                data-post-id="${postId}"
                                id="comment-submit-${postId}">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Set up toggle functionality
        const toggleBtn = commentsContainer.querySelector('.comments-toggle');
        const commentsDiv = commentsContainer.querySelector('.comments-container');
        
        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.toggle('active');
            commentsDiv.classList.toggle('show');
            
            // Load comments if not already loaded
            if (commentsDiv.classList.contains('show') && !this.activeComments.has(postId)) {
                this.loadComments(postId);
            }
        });

        // Set up comment submission
        const submitBtn = commentsContainer.querySelector(`#comment-submit-${postId}`);
        const commentInput = commentsContainer.querySelector(`#comment-input-${postId}`);

        submitBtn.addEventListener('click', async () => {
            const content = commentInput.value.trim();
            if (!content) return;

            submitBtn.disabled = true;
            await this.addComment(postId, content);
            commentInput.value = '';
            submitBtn.disabled = false;
        });

        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitBtn.click();
            }
        });
    }

    /**
     * Load comments in real-time
     */
    loadComments(postId) {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (!commentsList) return;

        // Create query for comments subcollection
        const commentsQuery = query(
            collection(this.db, 'posts', postId, 'comments'),
            orderBy('createdAt', 'desc')
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
            if (snapshot.empty) {
                commentsList.innerHTML = `
                    <div class="empty-state small">
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                `;
                return;
            }

            let commentsHTML = '';
            for (const doc of snapshot.docs) {
                const comment = doc.data();
                // Get user info for each comment
                const userDoc = await getDoc(doc(this.db, 'users', comment.userId));
                const userData = userDoc.exists() ? userDoc.data() : { username: 'Unknown User' };
                
                commentsHTML += this.createCommentHTML(comment, userData);
            }
            
            commentsList.innerHTML = commentsHTML;
            this.attachCommentClickHandlers();
        });

        // Store unsubscribe function
        this.activeComments.set(postId, unsubscribe);
    }

    /**
     * Add a new comment
     */
    async addComment(postId, content) {
        try {
            const user = this.auth.currentUser;
            if (!user) return;

            // Get user data for author info
            const userDoc = await getDoc(doc(this.db, 'users', user.uid));
            const userData = userDoc.data();

            // Add comment to subcollection
            await addDoc(collection(this.db, 'posts', postId, 'comments'), {
                userId: user.uid,
                username: userData.username,
                content: content,
                createdAt: serverTimestamp()
            });

        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment. Please try again.');
        }
    }

    /**
     * Create comment HTML
     */
    createCommentHTML(comment, userData) {
        const timeAgo = this.formatTimestamp(comment.createdAt);
        
        return `
            <div class="comment">
                <div class="comment-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author" data-user-id="${comment.userId}">
                            @${userData.username || 'Unknown'}
                        </span>
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                    <div class="comment-text">
                        ${this.escapeHtml(comment.content)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Clean up listeners when leaving page
     */
    cleanup() {
        this.activeComments.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.activeComments.clear();
    }

    /**
     * Attach click handlers to comment authors
     */
    attachCommentClickHandlers() {
        document.querySelectorAll('.comment-author').forEach(author => {
            author.addEventListener('click', () => {
                const userId = author.dataset.userId;
                window.location.href = `profile.html?id=${userId}`;
            });
        });
    }

    /**
     * Format timestamp
     */
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

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}