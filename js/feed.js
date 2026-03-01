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
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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