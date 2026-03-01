import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    updateDoc, 
    arrayUnion, 
    arrayRemove 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export class ProfileManager {
    constructor(db, auth, currentUser) {
        this.db = db;
        this.auth = auth;
        this.currentUser = currentUser;
        this.profileUser = null;
    }

    async loadProfile(profileId) {
        try {
            // Get profile user data
            const userDoc = await getDoc(doc(this.db, 'users', profileId));
            
            if (!userDoc.exists()) {
                window.location.href = 'index.html';
                return;
            }

            this.profileUser = { uid: profileId, ...userDoc.data() };
            
            // Update profile UI
            this.updateProfileUI();
            
            // Check if viewing own profile
            this.checkOwnProfile();
            
            // Load user's posts
            this.loadUserPosts();
            
            // Load followers/following counts
            this.loadFollowStats();
            
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    updateProfileUI() {
        document.getElementById('profileUsername').textContent = this.profileUser.username || 'User';
        document.getElementById('profileEmail').textContent = this.profileUser.email || '';
    }

    checkOwnProfile() {
        const followBtn = document.getElementById('followBtn');
        
        if (this.profileUser.uid === this.currentUser.uid) {
            followBtn.style.display = 'none';
        } else {
            followBtn.style.display = 'inline-flex';
            this.checkFollowStatus();
            followBtn.addEventListener('click', () => this.toggleFollow());
        }
    }

    async checkFollowStatus() {
        const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
        const userData = userDoc.data();
        
        const followBtn = document.getElementById('followBtn');
        const isFollowing = userData.following?.includes(this.profileUser.uid);
        
        if (isFollowing) {
            followBtn.innerHTML = '<i class="fas fa-user-check"></i><span>Following</span>';
            followBtn.classList.add('following');
        } else {
            followBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Follow</span>';
            followBtn.classList.remove('following');
        }
    }

    async toggleFollow() {
        try {
            const currentUserRef = doc(this.db, 'users', this.currentUser.uid);
            const profileUserRef = doc(this.db, 'users', this.profileUser.uid);
            
            const currentUserDoc = await getDoc(currentUserRef);
            const isFollowing = currentUserDoc.data().following?.includes(this.profileUser.uid);
            
            if (isFollowing) {
                // Unfollow
                await updateDoc(currentUserRef, {
                    following: arrayRemove(this.profileUser.uid)
                });
                await updateDoc(profileUserRef, {
                    followers: arrayRemove(this.currentUser.uid)
                });
            } else {
                // Follow
                await updateDoc(currentUserRef, {
                    following: arrayUnion(this.profileUser.uid)
                });
                await updateDoc(profileUserRef, {
                    followers: arrayUnion(this.currentUser.uid)
                });
            }
            
            this.checkFollowStatus();
            this.loadFollowStats();
            
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    }

    loadUserPosts() {
        const postsQuery = query(
            collection(this.db, 'posts'),
            where('userId', '==', this.profileUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        onSnapshot(postsQuery, (snapshot) => {
            const postsContainer = document.getElementById('userPosts');
            
            if (snapshot.empty) {
                postsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-pencil-alt"></i>
                        <h3>No posts yet</h3>
                        <p>This user hasn't shared any pulses.</p>
                    </div>
                `;
                document.getElementById('postsCount').textContent = '0';
                return;
            }
            
            document.getElementById('postsCount').textContent = snapshot.size;
            
            let html = '';
            snapshot.forEach(doc => {
                const post = doc.data();
                html += this.getPostHTML(post);
            });
            
            postsContainer.innerHTML = html;
        });
    }

    async loadFollowStats() {
        const userDoc = await getDoc(doc(this.db, 'users', this.profileUser.uid));
        const userData = userDoc.data();
        
        document.getElementById('followersCount').textContent = userData.followers?.length || 0;
        document.getElementById('followingCount').textContent = userData.following?.length || 0;
    }

    getPostHTML(post) {
        const timeAgo = this.formatTimestamp(post.createdAt);
        
        return `
            <div class="post-card">
                <div class="post-header">
                    <span class="post-time">${timeAgo}</span>
                </div>
                <div class="post-content">
                    ${post.content}
                </div>
                <div class="post-footer">
                    <button class="post-action-btn like-btn ${post.likes?.includes(this.currentUser.uid) ? 'liked' : ''}" 
                            data-post-id="${post.id}">
                        <i class="fas fa-heart"></i>
                        <span>${post.likes?.length || 0}</span>
                    </button>
                </div>
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
}