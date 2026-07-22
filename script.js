/**
 * ─────────────────────────────────────────────────────────────
 *  SOCIALBOOST PRO — SCRIPT.JS
 *  Full Facebook Auto Liker with Bot System
 *  Made with ❤️ by jacklxprocoder
 * ─────────────────────────────────────────────────────────────
 */

/* ─── CONFIG ─── */
const CONFIG = {
    MAX_FREE_USERS: 20,
    COOLDOWN_SECONDS: 8,
    AUTO_LIKER_INTERVAL: 5000,
    FB_APP_ID: '1234567890123456', // ← Replace with your Facebook App ID
};

/* ─── STATE ─── */
let state = {
    currentUser: null,
    users: [],
    posts: [],
    nextPostId: 1,
    nextUserId: 1,
    autoLikerInterval: null,
    isAutoLikerRunning: false,
    totalExchanges: 0,
    cooldownUntil: 0,
    isCooldown: false,
    onlineUsers: [],
    botPool: [],
};

/* ─── DOM REFS ─── */
const $ = (id) => document.getElementById(id);

const DOM = {
    authView: $('authView'),
    dashboardView: $('dashboardView'),
    headerRight: $('headerRight'),
    loginForm: $('loginForm'),
    registerForm: $('registerForm'),
    loginBtn: $('loginBtn'),
    registerBtn: $('registerBtn'),
    switchToRegister: $('switchToRegister'),
    switchToLogin: $('switchToLogin'),
    loginUsername: $('loginUsername'),
    loginPassword: $('loginPassword'),
    registerUsername: $('registerUsername'),
    registerPassword: $('registerPassword'),
    registerConfirm: $('registerConfirm'),
    userCountDisplay: $('userCountDisplay'),
    userCountDisplay2: $('userCountDisplay2'),
    userLimitWarning: $('userLimitWarning'),
    greetingMessage: $('greetingMessage'),
    greetingIcon: $('greetingIcon'),
    greetingPoints: $('greetingPoints'),
    greetingGiven: $('greetingGiven'),
    greetingReceived: $('greetingReceived'),
    onlineCountDisplay: $('onlineCountDisplay'),
    footerOnlineCount: $('footerOnlineCount'),
    feedContainer: $('feedContainer'),
    feedCount: $('feedCount'),
    queueCount: $('queueCount'),
    totalExchanges: $('totalExchanges'),
    statusPill: $('statusPill'),
    startAutoLikerBtn: $('startAutoLikerBtn'),
    stopAutoLikerBtn: $('stopAutoLikerBtn'),
    clearAllBtn: $('clearAllBtn'),
    addPostForm: $('addPostForm'),
    postUrl: $('postUrl'),
    postCaption: $('postCaption'),
    likesNeeded: $('likesNeeded'),
    onlineUsersList: $('onlineUsersList'),
    onlineBadge: $('onlineBadge'),
    adminPanel: $('adminPanel'),
    adminUserList: $('adminUserList'),
    adminUserCount: $('adminUserCount'),
    adminBotCount: $('adminBotCount'),
    adminAddUsername: $('adminAddUsername'),
    adminAddPassword: $('adminAddPassword'),
    adminAddBtn: $('adminAddBtn'),
    botCount: $('botCount'),
    botUsedCount: $('botUsedCount'),
    cooldownFill: $('cooldownFill'),
    cooldownText: $('cooldownText'),
    cooldownBar: $('cooldownBar'),
    toastContainer: $('toastContainer'),
    fbLoginBtn: $('fbLoginBtn'),
    fbLoginBtnReg: $('fbLoginBtnReg'),
};

/* ─── TOAST SYSTEM ─── */
function showToast(msg, type = 'info') {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span class="toast-msg">${msg}</span>`;
    DOM.toastContainer.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px) scale(0.96)';
        setTimeout(() => el.remove(), 400);
    }, 4000);
}

/* ─── STORAGE ─── */
function saveState() {
    try {
        const data = {
            users: state.users,
            posts: state.posts,
            nextPostId: state.nextPostId,
            nextUserId: state.nextUserId,
            totalExchanges: state.totalExchanges,
        };
        localStorage.setItem('socialboost_pro_state', JSON.stringify(data));
    } catch (e) { /* ignore */ }
}

function loadState() {
    try {
        const raw = localStorage.getItem('socialboost_pro_state');
        if (raw) {
            const data = JSON.parse(raw);
            state.users = data.users || [];
            state.posts = data.posts || [];
            state.nextPostId = data.nextPostId || 1;
            state.nextUserId = data.nextUserId || 1;
            state.totalExchanges = data.totalExchanges || 0;
        }
    } catch (e) { /* ignore */ }

    // Ensure at least one admin exists
    if (!state.users.some(u => u.role === 'admin')) {
        state.users.push({
            id: state.nextUserId++,
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            facebookId: null,
            isOnline: false,
            lastActive: Date.now(),
            points: 999,
            likesGiven: 0,
            likesReceived: 0,
            createdAt: Date.now(),
        });
        saveState();
    }
    updateBotPool();
}

function updateBotPool() {
    state.botPool = state.users.filter(u => u.role === 'bot').map(u => u.id);
    const count = state.botPool.length;
    DOM.botCount.textContent = count;
    DOM.botUsedCount.textContent = count;
    if (DOM.adminBotCount) DOM.adminBotCount.textContent = count;
}

/* ─── AUTH ─── */
function getFreeUserCount() {
    return state.users.filter(u => u.role === 'user').length;
}

function canRegisterFree() {
    return getFreeUserCount() < CONFIG.MAX_FREE_USERS;
}

function loginUser(username, password) {
    const user = state.users.find(u => u.username === username && u.password === password);
    if (!user) {
        showToast('Invalid username or password', 'error');
        return false;
    }
    if (user.role === 'bot') {
        showToast('Bots cannot login', 'error');
        return false;
    }
    state.currentUser = user;
    user.isOnline = true;
    user.lastActive = Date.now();
    saveState();
    localStorage.setItem('socialboost_pro_session', JSON.stringify({ userId: state.currentUser.id }));
    showToast(`Welcome back, ${user.username}! 🎉`, 'success');
    renderAll();
    return true;
}

function registerUser(username, password) {
    if (!canRegisterFree()) {
        showToast('Free user limit reached (20). Contact an admin.', 'error');
        return false;
    }
    if (state.users.some(u => u.username === username)) {
        showToast('Username already taken', 'error');
        return false;
    }
    if (username.length < 3 || password.length < 4) {
        showToast('Username (3+ chars) and password (4+ chars) required', 'error');
        return false;
    }
    const user = {
        id: state.nextUserId++,
        username,
        password,
        role: 'user',
        facebookId: null,
        isOnline: true,
        lastActive: Date.now(),
        points: 30,
        likesGiven: 0,
        likesReceived: 0,
        createdAt: Date.now(),
    };
    state.users.push(user);
    state.currentUser = user;
    saveState();
    localStorage.setItem('socialboost_pro_session', JSON.stringify({ userId: state.currentUser.id }));
    showToast(`Account created! Welcome ${username} 🚀`, 'success');
    renderAll();
    return true;
}

function createUserFromFacebook(facebookId, name, picture) {
    let user = state.users.find(u => u.facebookId === facebookId);
    if (user) {
        if (user.role === 'bot') {
            showToast('This Facebook account is registered as a bot. Cannot login.', 'error');
            return false;
        }
        state.currentUser = user;
        user.isOnline = true;
        user.lastActive = Date.now();
        saveState();
        localStorage.setItem('socialboost_pro_session', JSON.stringify({ userId: state.currentUser.id }));
        showToast(`Welcome back, ${user.username}! 🎉`, 'success');
        renderAll();
        return true;
    }
    if (!canRegisterFree()) {
        showToast('Free user limit reached (20). Contact an admin.', 'error');
        return false;
    }
    const username = name || 'fb_user_' + facebookId.slice(0, 6);
    let base = username;
    let count = 0;
    while (state.users.some(u => u.username === base)) {
        base = username + (count++);
    }
    const newUser = {
        id: state.nextUserId++,
        username: base,
        password: null,
        role: 'user',
        facebookId: facebookId,
        isOnline: true,
        lastActive: Date.now(),
        points: 30,
        likesGiven: 0,
        likesReceived: 0,
        createdAt: Date.now(),
        picture: picture || null,
    };
    state.users.push(newUser);
    state.currentUser = newUser;
    saveState();
    localStorage.setItem('socialboost_pro_session', JSON.stringify({ userId: state.currentUser.id }));
    showToast(`Welcome ${newUser.username}! 🚀`, 'success');
    renderAll();
    return true;
}

function logoutUser() {
    if (state.currentUser) {
        const u = state.users.find(x => x.id === state.currentUser.id);
        if (u) u.isOnline = false;
    }
    state.currentUser = null;
    if (state.autoLikerInterval) {
        clearInterval(state.autoLikerInterval);
        state.autoLikerInterval = null;
        state.isAutoLikerRunning = false;
    }
    localStorage.removeItem('socialboost_pro_session');
    saveState();
    renderAll();
    showToast('Logged out', 'info');
}

function isAdmin() {
    return state.currentUser && state.currentUser.role === 'admin';
}

/* ─── ADMIN FUNCTIONS ─── */
function addAdmin(username, password) {
    if (!isAdmin()) { showToast('Admin only', 'error'); return false; }
    if (state.users.some(u => u.username === username)) {
        showToast('Username already exists', 'error');
        return false;
    }
    if (username.length < 3 || password.length < 4) {
        showToast('Username (3+) and password (4+) required', 'error');
        return false;
    }
    state.users.push({
        id: state.nextUserId++,
        username,
        password,
        role: 'admin',
        facebookId: null,
        isOnline: false,
        lastActive: Date.now(),
        points: 999,
        likesGiven: 0,
        likesReceived: 0,
        createdAt: Date.now(),
    });
    saveState();
    showToast(`Admin ${username} added!`, 'success');
    renderAll();
    return true;
}

function toggleBot(userId) {
    if (!isAdmin()) { showToast('Admin only', 'error'); return; }
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'admin') {
        showToast('Cannot toggle bot for admin', 'error');
        return;
    }
    if (user.id === state.currentUser?.id) {
        showToast('Cannot toggle your own bot status', 'error');
        return;
    }
    if (user.role === 'bot') {
        user.role = 'user';
        user.isOnline = false;
        showToast(`${user.username} is no longer a bot`, 'info');
    } else {
        user.role = 'bot';
        user.isOnline = false;
        showToast(`${user.username} is now a bot`, 'success');
    }
    updateBotPool();
    saveState();
    renderAll();
}

function removeUser(userId) {
    if (!isAdmin()) { showToast('Admin only', 'error'); return; }
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'admin' && state.users.filter(u => u.role === 'admin').length <= 1) {
        showToast('Cannot remove the last admin', 'error');
        return;
    }
    if (user.id === state.currentUser?.id) {
        showToast('Cannot remove yourself', 'error');
        return;
    }
    state.users = state.users.filter(u => u.id !== userId);
    state.posts = state.posts.filter(p => p.userId !== userId);
    updateBotPool();
    saveState();
    showToast(`User removed`, 'info');
    renderAll();
}

/* ─── FACEBOOK LOGIN ─── */
function handleFacebookLogin() {
    if (typeof FB === 'undefined') {
        showToast('Facebook SDK not loaded. Please try again.', 'error');
        return;
    }
    FB.login((response) => {
        if (response.authResponse) {
            FB.api('/me', { fields: 'id,name,picture.width(200).height(200)' }, (res) => {
                if (res && !res.error) {
                    createUserFromFacebook(res.id, res.name, res.picture?.data?.url || null);
                } else {
                    showToast('Failed to fetch Facebook profile.', 'error');
                }
            });
        } else {
            showToast('Facebook login cancelled.', 'info');
        }
    }, { scope: 'public_profile' });
}

/* ─── POSTS & LIKES ─── */
function addPost(url, caption, needed) {
    if (!state.currentUser) { showToast('Please login', 'error'); return; }
    try { new URL(url); } catch { showToast('Invalid URL', 'error'); return; }
    if (needed < 1 || needed > 100) { showToast('Likes needed: 1-100', 'error'); return; }

    const post = {
        id: state.nextPostId++,
        userId: state.currentUser.id,
        userName: state.currentUser.username,
        userAvatar: state.currentUser.picture || null,
        url,
        caption: caption.trim() || 'Check out my post!',
        likesNeeded: needed,
        likes: [],
        timestamp: Date.now(),
    };
    state.posts.push(post);
    saveState();
    showToast('✅ Post added to queue!', 'success');
    DOM.postUrl.value = '';
    DOM.postCaption.value = '';
    DOM.likesNeeded.value = 10;
    renderAll();
    if (!state.isAutoLikerRunning) startAutoLiker();
}

function performLike(postId, likerUser) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return false;
    if (post.likes.includes(likerUser.id)) return false;
    if (post.userId === likerUser.id) return false;
    if (post.likes.length >= post.likesNeeded) return false;

    if (likerUser.role === 'bot') {
        post.likes.push(likerUser.id);
        state.totalExchanges += 1;
        if (post.likes.length >= post.likesNeeded) {
            const owner = state.users.find(u => u.id === post.userId);
            if (owner) {
                owner.points += 1;
                owner.likesReceived += 1;
                showToast(`🎉 Post "${post.caption}" completed by bot! +1 point to ${owner.username}`, 'success');
            }
        }
        saveState();
        renderAll();
        return true;
    } else {
        if (likerUser.points < 1) return false;
        likerUser.points -= 1;
        likerUser.likesGiven += 1;
        post.likes.push(likerUser.id);
        state.totalExchanges += 1;
        if (post.likes.length >= post.likesNeeded) {
            const owner = state.users.find(u => u.id === post.userId);
            if (owner && owner.id !== likerUser.id) {
                owner.points += 1;
                owner.likesReceived += 1;
                showToast(`🎉 Post "${post.caption}" completed! +1 point to ${owner.username}`, 'success');
            }
        }
        saveState();
        renderAll();
        return true;
    }
}

function handleLike(postId) {
    if (!state.currentUser) { showToast('Please login', 'error'); return; }
    if (state.isCooldown) {
        const remain = Math.ceil((state.cooldownUntil - Date.now()) / 1000);
        showToast(`Cooldown: wait ${remain}s`, 'warning');
        return;
    }
    if (state.currentUser.points < 1) { showToast('Not enough points!', 'error'); return; }

    const result = performLike(postId, state.currentUser);
    if (result) {
        state.cooldownUntil = Date.now() + CONFIG.COOLDOWN_SECONDS * 1000;
        state.isCooldown = true;
        updateCooldown();
        showToast('👍 Liked! -1 point', 'success');
    } else {
        showToast('Cannot like this post', 'warning');
    }
}

/* ─── COOLDOWN ─── */
function updateCooldown() {
    if (!state.isCooldown) {
        DOM.cooldownFill.style.width = '100%';
        DOM.cooldownText.textContent = 'Ready';
        return;
    }
    const remaining = Math.max(0, (state.cooldownUntil - Date.now()) / 1000);
    const pct = Math.min(100, (remaining / CONFIG.COOLDOWN_SECONDS) * 100);
    DOM.cooldownFill.style.width = (100 - pct) + '%';
    DOM.cooldownText.textContent = `${Math.ceil(remaining)}s`;

    if (remaining <= 0) {
        state.isCooldown = false;
        DOM.cooldownFill.style.width = '100%';
        DOM.cooldownText.textContent = 'Ready';
    } else {
        requestAnimationFrame(updateCooldown);
    }
}

/* ─── AUTO-LIKER ─── */
function startAutoLiker() {
    if (state.isAutoLikerRunning) return;
    if (!state.currentUser) { showToast('Please login', 'error'); return; }
    const bots = state.users.filter(u => u.role === 'bot');
    if (bots.length === 0) {
        showToast('No bots available. Convert users to bots in admin panel.', 'warning');
        return;
    }
    state.isAutoLikerRunning = true;
    updateStatusPill();
    processAutoLike();
    state.autoLikerInterval = setInterval(processAutoLike, CONFIG.AUTO_LIKER_INTERVAL);
    showToast(`🤖 Auto-liker started with ${bots.length} bot(s)`, 'success');
}

function stopAutoLiker() {
    if (state.autoLikerInterval) {
        clearInterval(state.autoLikerInterval);
        state.autoLikerInterval = null;
    }
    state.isAutoLikerRunning = false;
    updateStatusPill();
    showToast('⏹️ Auto-liker stopped', 'info');
}

function processAutoLike() {
    if (!state.isAutoLikerRunning) return;
    if (!state.currentUser) return;
    const bots = state.users.filter(u => u.role === 'bot');
    if (bots.length === 0) {
        stopAutoLiker();
        showToast('No bots available. Auto-liker stopped.', 'warning');
        return;
    }

    const available = state.posts.filter(p =>
        p.likes.length < p.likesNeeded
    );
    if (available.length === 0) return;

    const post = available[Math.floor(Math.random() * available.length)];
    const availableBots = bots.filter(b => !post.likes.includes(b.id));
    if (availableBots.length === 0) return;

    const bot = availableBots[Math.floor(Math.random() * availableBots.length)];
    performLike(post.id, bot);
}

function updateStatusPill() {
    if (state.isAutoLikerRunning) {
        DOM.statusPill.className = 'status-pill';
        DOM.statusPill.innerHTML = `<span class="dot"></span> Running`;
    } else {
        DOM.statusPill.className = 'status-pill off';
        DOM.statusPill.innerHTML = `<span class="dot"></span> Stopped`;
    }
}

/* ─── GREETING ─── */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { msg: 'Good Morning', icon: '🌅' };
    if (hour < 17) return { msg: 'Good Afternoon', icon: '☀️' };
    if (hour < 21) return { msg: 'Good Evening', icon: '🌇' };
    return { msg: 'Good Night', icon: '🌙' };
}

function updateGreeting() {
    if (!state.currentUser) return;
    const g = getGreeting();
    DOM.greetingIcon.textContent = g.icon;
    DOM.greetingMessage.textContent = `${g.msg}, ${state.currentUser.username}!`;
    DOM.greetingPoints.textContent = state.currentUser.points;
    DOM.greetingGiven.textContent = state.currentUser.likesGiven;
    DOM.greetingReceived.textContent = state.currentUser.likesReceived;
}

/* ─── ONLINE USERS ─── */
function updateOnlineUsers() {
    const now = Date.now();
    state.users.forEach(u => {
        if (u.isOnline && (now - u.lastActive > 30000)) {
            u.isOnline = false;
        }
    });

    const online = state.users.filter(u => u.isOnline && u.role !== 'bot');
    state.onlineUsers = online;

    const count = online.length;
    DOM.onlineCountDisplay.textContent = count;
    DOM.onlineBadge.textContent = count;
    DOM.footerOnlineCount.textContent = count;

    if (online.length === 0) {
        DOM.onlineUsersList.innerHTML =
            `<div class="empty-state" style="padding:12px 0;font-size:13px;"><i class="fas fa-user-slash"></i> No users online</div>`;
        return;
    }

    let html = '';
    online.forEach(u => {
        const isAdminRole = u.role === 'admin';
        html += `
            <div class="online-user">
                <span class="status-dot"></span>
                <span class="username">${u.username}</span>
                ${isAdminRole ? '<span class="user-role-tag admin">Admin</span>' : ''}
                ${u.id === state.currentUser?.id ? '<span style="font-size:10px;color:var(--fb-blue);font-weight:600;">(you)</span>' : ''}
            </div>
        `;
    });
    DOM.onlineUsersList.innerHTML = html;
}

/* ─── RENDER FEED ─── */
function renderFeed() {
    const items = state.posts
        .filter(p => p.likes.length < p.likesNeeded)
        .sort((a, b) => b.timestamp - a.timestamp);

    DOM.feedCount.textContent = items.length + ' posts';
    DOM.queueCount.textContent = items.length;

    if (items.length === 0) {
        DOM.feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No posts in queue. Add yours above!</p>
            </div>
        `;
        return;
    }

    let html = '';
    items.forEach(post => {
        const isOwn = state.currentUser && post.userId === state.currentUser.id;
        const likedByMe = state.currentUser && post.likes.includes(state.currentUser.id);
        const remaining = post.likesNeeded - post.likes.length;
        const avatarLetter = post.userName ? post.userName.charAt(0).toUpperCase() : 'U';

        html += `
            <div class="feed-item" data-postid="${post.id}">
                <div class="feed-avatar">${avatarLetter}</div>
                <div class="feed-content">
                    <div class="feed-name">
                        ${post.userName || 'Anonymous'}
                        <span class="time">${timeAgo(post.timestamp)}</span>
                        ${isOwn ? '<span style="font-size:10px;color:var(--fb-blue);background:var(--bg-secondary);padding:1px 10px;border-radius:60px;border:1px solid var(--border-color);">You</span>' : ''}
                    </div>
                    ${post.caption ? `<div class="feed-text">${escapeHtml(post.caption)}</div>` : ''}
                    <div style="font-size:12px;color:var(--text-muted);word-break:break-all;margin-bottom:6px;">
                        <a href="${post.url}" target="_blank" style="color:var(--fb-blue);text-decoration:none;">
                            <i class="fas fa-link"></i> ${post.url.length > 60 ? post.url.slice(0,60)+'…' : post.url}
                        </a>
                    </div>
                    <div class="feed-actions">
                        <span class="like-count"><i class="fas fa-thumbs-up"></i> ${post.likes.length} / ${post.likesNeeded}</span>
                        ${!isOwn && !likedByMe && state.currentUser && state.currentUser.points > 0 && !state.isCooldown
                            ? `<button class="btn btn-primary btn-xs like-btn" data-postid="${post.id}">
                                <i class="fas fa-thumbs-up"></i> Like
                            </button>`
                            : ''
                        }
                        ${likedByMe ? `<span style="font-size:12px;color:var(--green);"><i class="fas fa-check"></i> Liked</span>` : ''}
                        ${isOwn ? `<span style="font-size:12px;color:var(--gold);">${remaining} remaining</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    DOM.feedContainer.innerHTML = html;

    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.postid);
            handleLike(id);
        });
    });
}

/* ─── RENDER ADMIN PANEL ─── */
function renderAdminPanel() {
    if (!isAdmin()) {
        DOM.adminPanel.classList.add('hidden');
        return;
    }
    DOM.adminPanel.classList.remove('hidden');

    const users = state.users;
    const freeUsers = users.filter(u => u.role === 'user');
    DOM.adminUserCount.textContent = freeUsers.length;
    const bots = users.filter(u => u.role === 'bot');
    DOM.adminBotCount.textContent = bots.length;

    let html = '';
    users.forEach(u => {
        const isOnline = u.isOnline;
        const isBot = u.role === 'bot';
        const isAdminRole = u.role === 'admin';
        const canToggle = !isAdminRole && u.id !== state.currentUser?.id;
        html += `
            <tr>
                <td><strong>${u.username}</strong></td>
                <td><span class="role-badge ${u.role}">${u.role}</span></td>
                <td>${isOnline ? '<span style="color:var(--green);"><i class="fas fa-circle" style="font-size:8px;"></i> Online</span>' : '<span style="color:var(--text-muted);">Offline</span>'}</td>
                <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        ${canToggle ? `<button class="btn btn-${isBot ? 'outline' : 'gold'} btn-xs" onclick="toggleBot(${u.id})">
                            ${isBot ? '<i class="fas fa-undo"></i> Unbot' : '<i class="fas fa-robot"></i> Make Bot'}
                        </button>` : ''}
                        ${u.id !== state.currentUser?.id ? `<button class="btn btn-danger btn-xs" onclick="removeUser(${u.id})"><i class="fas fa-trash"></i></button>` : '—'}
                    </div>
                </td>
            </tr>
        `;
    });
    DOM.adminUserList.innerHTML = html;
}

/* ─── RENDER HEADER ─── */
function renderHeader() {
    if (state.currentUser) {
        const initial = state.currentUser.username.charAt(0).toUpperCase();
        const roleLabel = state.currentUser.role === 'admin' ? 'Admin' : state.currentUser.role === 'bot' ? 'Bot' : 'User';
        const roleClass = state.currentUser.role === 'admin' ? 'admin' : state.currentUser.role === 'bot' ? 'bot' : '';
        DOM.headerRight.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar">${initial}</div>
                <span class="user-name">${state.currentUser.username}</span>
                <span class="user-role ${roleClass}">${roleLabel}</span>
            </div>
            <button class="btn btn-outline btn-sm" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
    } else {
        DOM.headerRight.innerHTML = `
            <button class="btn btn-primary btn-sm" id="showLoginBtn">
                <i class="fas fa-sign-in-alt"></i> Login
            </button>
        `;
        document.getElementById('showLoginBtn')?.addEventListener('click', () => {
            DOM.authView.classList.remove('hidden');
            DOM.dashboardView.classList.add('hidden');
            DOM.loginForm.classList.remove('hidden');
            DOM.registerForm.classList.add('hidden');
        });
    }
}

/* ─── RENDER ALL ─── */
function renderAll() {
    const isLoggedIn = !!state.currentUser;

    DOM.authView.classList.toggle('hidden', isLoggedIn);
    DOM.dashboardView.classList.toggle('hidden', !isLoggedIn);

    renderHeader();

    if (isLoggedIn) {
        const u = state.users.find(x => x.id === state.currentUser.id);
        if (u) {
            u.isOnline = true;
            u.lastActive = Date.now();
        }
        updateGreeting();
        renderFeed();
        renderAdminPanel();
        updateOnlineUsers();
        updateStatusPill();
        updateCooldown();
        updateBotPool();

        const freeCount = getFreeUserCount();
        const displayText = `${freeCount} / ${CONFIG.MAX_FREE_USERS}`;
        DOM.userCountDisplay.textContent = displayText;
        DOM.userCountDisplay2.textContent = displayText;

        DOM.totalExchanges.textContent = state.totalExchanges;
    }

    saveState();
}

/* ─── HELPERS ─── */
function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

/* ─── EVENT BINDING ─── */
function initEvents() {
    // Auth switches
    DOM.switchToRegister.addEventListener('click', () => {
        DOM.loginForm.classList.add('hidden');
        DOM.registerForm.classList.remove('hidden');
    });
    DOM.switchToLogin.addEventListener('click', () => {
        DOM.registerForm.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
    });

    // Facebook Login
    DOM.fbLoginBtn.addEventListener('click', handleFacebookLogin);
    DOM.fbLoginBtnReg.addEventListener('click', handleFacebookLogin);

    // Login
    DOM.loginBtn.addEventListener('click', () => {
        const u = DOM.loginUsername.value.trim();
        const p = DOM.loginPassword.value.trim();
        if (loginUser(u, p)) {
            DOM.loginUsername.value = '';
            DOM.loginPassword.value = '';
        }
    });
    DOM.loginUsername.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.loginBtn.click(); });
    DOM.loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.loginBtn.click(); });

    // Register
    DOM.registerBtn.addEventListener('click', () => {
        const u = DOM.registerUsername.value.trim();
        const p = DOM.registerPassword.value.trim();
        const c = DOM.registerConfirm.value.trim();
        if (p !== c) { showToast('Passwords do not match', 'error'); return; }
        if (registerUser(u, p)) {
            DOM.registerUsername.value = '';
            DOM.registerPassword.value = '';
            DOM.registerConfirm.value = '';
        }
    });
    DOM.registerUsername.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.registerBtn.click(); });
    DOM.registerPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.registerBtn.click(); });
    DOM.registerConfirm.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.registerBtn.click(); });

    // Add Post
    DOM.addPostForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = DOM.postUrl.value.trim();
        const caption = DOM.postCaption.value.trim();
        const needed = parseInt(DOM.likesNeeded.value) || 10;
        addPost(url, caption, needed);
    });

    // Auto-liker controls
    DOM.startAutoLikerBtn.addEventListener('click', startAutoLiker);
    DOM.stopAutoLikerBtn.addEventListener('click', stopAutoLiker);

    // Clear all
    DOM.clearAllBtn.addEventListener('click', () => {
        if (!confirm('Clear all posts and reset stats?')) return;
        state.posts = [];
        state.totalExchanges = 0;
        state.nextPostId = 1;
        if (state.currentUser) {
            state.currentUser.points = 30;
            state.currentUser.likesGiven = 0;
            state.currentUser.likesReceived = 0;
        }
        saveState();
        renderAll();
        showToast('🧹 All data cleared', 'info');
    });

    // Admin add
    DOM.adminAddBtn.addEventListener('click', () => {
        const u = DOM.adminAddUsername.value.trim();
        const p = DOM.adminAddPassword.value.trim();
        if (addAdmin(u, p)) {
            DOM.adminAddUsername.value = '';
            DOM.adminAddPassword.value = '';
        }
    });
    DOM.adminAddUsername.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.adminAddBtn.click(); });
    DOM.adminAddPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.adminAddBtn.click(); });
}

/* ─── INIT ─── */
function init() {
    loadState();

    // Restore session
    const savedSession = localStorage.getItem('socialboost_pro_session');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            const user = state.users.find(u => u.id === session.userId);
            if (user && user.role !== 'bot') {
                state.currentUser = user;
                user.isOnline = true;
                user.lastActive = Date.now();
                renderAll();
            }
        } catch (e) { /* ignore */ }
    }

    if (!state.currentUser) {
        DOM.authView.classList.remove('hidden');
        DOM.dashboardView.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
        DOM.registerForm.classList.add('hidden');
    } else {
        DOM.authView.classList.add('hidden');
        DOM.dashboardView.classList.remove('hidden');
        renderAll();
    }

    // Auto-start auto-liker
    if (state.currentUser && state.botPool.length > 0 && !state.isAutoLikerRunning) {
        setTimeout(startAutoLiker, 1500);
    }

    // Cooldown loop
    function cooldownLoop() {
        if (state.isCooldown) {
            updateCooldown();
        }
        requestAnimationFrame(cooldownLoop);
    }
    cooldownLoop();

    // Init events
    initEvents();

    // Periodics
    setInterval(() => {
        if (state.currentUser) {
            const u = state.users.find(x => x.id === state.currentUser.id);
            if (u) u.lastActive = Date.now();
            updateOnlineUsers();
            renderFeed();
            renderAdminPanel();
            updateGreeting();
            DOM.totalExchanges.textContent = state.totalExchanges;
            const freeCount = getFreeUserCount();
            DOM.userCountDisplay.textContent = `${freeCount} / ${CONFIG.MAX_FREE_USERS}`;
            DOM.userCountDisplay2.textContent = `${freeCount} / ${CONFIG.MAX_FREE_USERS}`;
            updateBotPool();
        }
        saveState();
    }, 5000);

    // Init FB SDK
    if (typeof FB !== 'undefined') {
        FB.init({
            appId: CONFIG.FB_APP_ID,
            cookie: true,
            xfbml: true,
            version: 'v18.0',
        });
    } else {
        console.warn('FB SDK not loaded. Facebook login will not work.');
    }

    // Expose admin functions globally
    window.removeUser = removeUser;
    window.toggleBot = toggleBot;

    console.log('🚀 SocialBoost Pro v3.0 loaded!');
    console.log('👑 Admin: admin / admin123');
    console.log('🤖 Convert any user to a bot via Admin Panel');
    console.log('❤️ Made by jacklxprocoder');

    renderAll();
    setTimeout(updateOnlineUsers, 500);
}

// ─── BOOT ───
document.addEventListener('DOMContentLoaded', init);
