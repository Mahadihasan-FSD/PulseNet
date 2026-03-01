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
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

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
/**
 * Enhanced Profile Manager
 * Features:
 * 1. Cover photo upload to Firebase Storage
 * 2. Real-time profile stats
 * 3. Follow/unfollow with dynamic UI
 */

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    arrayUnion,
    arrayRemove
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

import {
    ref,
    uploadBytesResumable,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

import { storage } from './firebase.js';
import { UIManager } from './ui.js';

export class ProfileManager {
    constructor(db, auth, currentUser) {
        this.db = db;
        this.auth = auth;
        this.currentUser = currentUser;
        this.profileUser = null;
        this.uiManager = new UIManager();
        this.postsUnsubscribe = null;
        this.statsUnsubscribe = null;
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
            
            // Set up cover photo
            this.setupCoverPhoto();
            
            // Check if viewing own profile
            this.checkOwnProfile();
            
            // Load user's posts with real-time updates
            this.loadUserPosts();
            
            // Load real-time stats
            this.loadRealTimeStats();
            
        } catch (error) {
            console.error('Error loading profile:', error);
            this.uiManager.showToast('Error loading profile', 'error');
        }
    }

    /**
     * Set up cover photo functionality
     */
    setupCoverPhoto() {
        const coverElement = document.getElementById('profileCover');
        const uploadOverlay = document.getElementById('coverUploadOverlay');
        const coverUpload = document.getElementById('coverUpload');
        
        // Set cover photo if exists
        if (this.profileUser.coverPhoto) {
            coverElement.style.backgroundImage = `url('${this.profileUser.coverPhoto}')`;
        }

        // Show upload overlay only for own profile
        if (this.profileUser.uid === this.currentUser.uid) {
            uploadOverlay.style.display = 'flex';
            
            coverUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                await this.uploadCoverPhoto(file);
            });
        }
    }

    /**
     * Upload cover photo to Firebase Storage
     */
    async uploadCoverPhoto(file) {
        try {
            // Validate file
            if (!file.type.startsWith('image/')) {
                this.uiManager.showToast('Please select an image file', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                this.uiManager.showToast('Image must be less than 5MB', 'error');
                return;
            }

            // Show loading
            const coverLoading = document.getElementById('coverLoading');
            coverLoading.style.display = 'block';

            // Create storage reference
            const storageRef = ref(storage, `covers/${this.currentUser.uid}/${Date.now()}_${file.name}`);
            
            // Upload with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload progress:', progress);
                },
                (error) => {
                    // Error
                    console.error('Upload error:', error);
                    coverLoading.style.display = 'none';
                    this.uiManager.showToast('Upload failed', 'error');
                },
                async () => {
                    // Complete
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    // Update Firestore
                    await updateDoc(doc(this.db, 'users', this.currentUser.uid), {
                        coverPhoto: downloadURL
                    });
                    
                    // Update UI
                    document.getElementById('profileCover').style.backgroundImage = `url('${downloadURL}')`;
                    coverLoading.style.display = 'none';
                    this.uiManager.showToast('Cover photo updated!', 'success');
                }
            );
            
        } catch (error) {
            console.error('Cover upload error:', error);
            document.getElementById('coverLoading').style.display = 'none';
            this.uiManager.showToast('Failed to upload cover photo', 'error');
        }
    }

    updateProfileUI() {
        document.getElementById('profileUsername').textContent = 
            this.profileUser.username || 'User';
        document.getElementById('profileEmail').textContent = 
            this.profileUser.email || '';
        
        // Set bio if exists
        const bioElement = document.getElementById('profileBio');
        if (bioElement) {
            bioElement.innerHTML = `<p>${this.profileUser.bio || 'No bio yet'}</p>`;
        }
    }

    /**
     * Load real-time stats
     */
    loadRealTimeStats() {
        // Listen to user document changes for real-time stats
        const userRef = doc(this.db, 'users', this.profileUser.uid);
        
        this.statsUnsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                document.getElementById('followersCount').textContent = 
                    userData.followers?.length || 0;
                document.getElementById('followingCount').textContent = 
                    userData.following?.length || 0;
            }
        });
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
                this.uiManager.showToast(`Unfollowed @${this.profileUser.username}`, 'info');
            } else {
                // Follow
                await updateDoc(currentUserRef, {
                    following: arrayUnion(this.profileUser.uid)
                });
                await updateDoc(profileUserRef, {
                    followers: arrayUnion(this.currentUser.uid)
                });
                this.uiManager.showToast(`Following @${this.profileUser.username}`, 'success');
            }
            
        } catch (error) {
            console.error('Error toggling follow:', error);
            this.uiManager.showToast('Failed to update follow status', 'error');
        }
    }

    loadUserPosts() {
        const postsQuery = query(
            collection(this.db, 'posts'),
            where('userId', '==', this.profileUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        this.postsUnsubscribe = onSnapshot(postsQuery, (snapshot) => {
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
                post.id = doc.id;
                html += this.getPostHTML(post);
            });
            
            postsContainer.innerHTML = html;
        });
    }

    getPostHTML(post) {
        const timeAgo = this.uiManager.formatRelativeTime(
            post.createdAt ? post.createdAt.toDate() : new Date()
        );
        const isLiked = post.likes?.includes(this.currentUser.uid);
        
        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
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
            </div>
        `;
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
        if (this.postsUnsubscribe) {
            this.postsUnsubscribe();
        }
        if (this.statsUnsubscribe) {
            this.statsUnsubscribe();
        }
    }
}