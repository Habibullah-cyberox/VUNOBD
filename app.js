// ===== FIREBASE CONFIG (YOUR REAL PROJECT) =====
const firebaseConfig = {
    apiKey: "AIzaSyDK5WWakHHostTvgGajH3SmFvl20iMs0-8",
    authDomain: "vunobd-af9fa.firebaseapp.com",
    projectId: "vunobd-af9fa",
    storageBucket: "vunobd-af9fa.firebasestorage.app",
    messagingSenderId: "309879840770",
    appId: "1:309879840770:web:6dfc41c2e24cd384bd071b",
    measurementId: "G-S466WEWF0D"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();
const auth = firebase.auth();

// ===== AUTH STATE CACHE =====
let APP_USER = null;
function waitForAuth() {
    return new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged((user) => {
            unsub();
            resolve(user);
        });
    });
}
async function syncAuthUser() {
    const user = await waitForAuth();
    if (user) {
        const doc = await firestore.collection('users').doc(user.uid).get();
        const data = doc.data() || {};
        APP_USER = {
            uid: user.uid,
            email: user.email,
            name: data.name || '',
            phone: data.phone || '',
            role: data.role || 'user'
        };
        localStorage.setItem('lux_currentUser', JSON.stringify(APP_USER));
    } else {
        APP_USER = null;
        localStorage.removeItem('lux_currentUser');
    }
    return APP_USER;
}

// ===== LIVE CACHE =====
const CACHE = { users: [], products: [], orders: [], messages: [] };

// ===== DATA STORE =====
const DB = {
    getCart: () => JSON.parse(localStorage.getItem('lux_cart')) || [],
    setCart: (c) => localStorage.setItem('lux_cart', JSON.stringify(c)),
    getCurrentUser: () => APP_USER || JSON.parse(localStorage.getItem('lux_currentUser')) || null,
    setCurrentUser: (u) => localStorage.setItem('lux_currentUser', JSON.stringify(u)),
    clearCurrentUser: () => localStorage.removeItem('lux_currentUser'),

    getUsers: () => CACHE.users,
    getProducts: () => CACHE.products,
    getOrders: () => CACHE.orders,
    getMessages: () => CACHE.messages,

    async setUser(user) { await firestore.collection('users').doc(String(user.uid || user.id)).set(user, { merge: true }); },
    async setProduct(p) { await firestore.collection('products').doc(String(p.id)).set(p, { merge: true }); },
    async deleteProduct(id) { await firestore.collection('products').doc(String(id)).delete(); },
    async addOrder(o) { await firestore.collection('orders').doc(o.id).set(o); },
    async updateOrderStatus(id, status) { await firestore.collection('orders').doc(id).update({ status }); },
    async addMessage(m) { await firestore.collection('messages').doc(String(m.id)).set(m); },
    async deleteMessage(id) { await firestore.collection('messages').doc(String(id)).delete(); },
    async markMessageRead(id, status) { await firestore.collection('messages').doc(String(id)).update({ status }); },
};

// ===== REAL-TIME LISTENERS (GUARDED) =====
let syncStarted = false;
function startRealtimeSync() {
    if (syncStarted) return;
    syncStarted = true;

    firestore.collection('products').onSnapshot(snap => {
        CACHE.products = snap.docs.map(d => ({ id: Number(d.id), ...d.data() }));
        if (document.getElementById('productsGrid')) renderProducts(currentFilter);
        if (document.getElementById('newProductsGrid')) renderNewArrivals();
        if (document.getElementById('adminProductsTable')) renderAdminProducts();
    });
    firestore.collection('orders').orderBy('date', 'desc').onSnapshot(snap => {
        CACHE.orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (document.getElementById('adminOrdersTable')) renderAdminOrders();
        if (document.getElementById('ordersTableBody')) renderUserOrders();
    });
    firestore.collection('messages').orderBy('id', 'desc').onSnapshot(snap => {
        CACHE.messages = snap.docs.map(d => ({ id: Number(d.id), ...d.data() }));
        updateAdminMessageBadge();
        if (document.getElementById('adminMessagesTable')) renderAdminMessages();
    });
    firestore.collection('users').onSnapshot(snap => {
        CACHE.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (document.getElementById('adminCustomersTable')) renderAdminCustomers();
    });
}

// ===== INITIALIZE DEFAULT DATA =====
let dataInitialized = false;
async function initData() {
    if (dataInitialized) return;
    dataInitialized = true;

    localStorage.removeItem('lux_products');
    localStorage.removeItem('lux_users');
    localStorage.removeItem('lux_orders');
    localStorage.removeItem('lux_messages');
    localStorage.removeItem('lux_version');

    startRealtimeSync();
    await new Promise(r => setTimeout(r, 1500));

    if (CACHE.products.length === 0) {
        const defaults = [
            { id: 1, name: 'Royal Blue Evening Gown', category: 'evening', price: 12500, oldPrice: 15000, image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400', rating: 4.8, reviews: 124, badge: 'Best Seller', stock: 50, description: 'Stunning royal blue evening gown perfect for formal events.' },
            { id: 2, name: 'Emerald Silk Saree', category: 'traditional', price: 8900, oldPrice: 11000, image: 'https://images.unsplash.com/photo-1610189012906-4e2c9f6a3f9e?w=400', rating: 4.9, reviews: 89, badge: 'New', stock: 30, description: 'Pure silk saree with intricate embroidery work.' },
            { id: 3, name: 'Blush Pink Cocktail Dress', category: 'party', price: 7500, oldPrice: 9500, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', rating: 4.6, reviews: 67, badge: '', stock: 40, description: 'Elegant cocktail dress for special occasions.' },
            { id: 4, name: 'White Wedding Gown', category: 'wedding', price: 35000, oldPrice: 42000, image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400', rating: 5.0, reviews: 45, badge: 'Premium', stock: 15, description: 'Exquisite white wedding gown with lace details.' },
            { id: 5, name: 'Floral Summer Dress', category: 'casual', price: 3200, oldPrice: 4500, image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', rating: 4.5, reviews: 156, badge: '', stock: 100, description: 'Light and breezy floral dress for summer days.' },
            { id: 6, name: 'Red Lehenga Choli', category: 'traditional', price: 18000, oldPrice: 22000, image: 'https://images.unsplash.com/photo-1583391733955-5520dadc94c9?w=400', rating: 4.7, reviews: 78, badge: 'Trending', stock: 25, description: 'Traditional red lehenga with heavy embroidery.' },
            { id: 7, name: 'Black Velvet Party Dress', category: 'party', price: 9800, oldPrice: 12000, image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400', rating: 4.8, reviews: 92, badge: '', stock: 35, description: 'Luxurious velvet dress for evening parties.' },
            { id: 8, name: 'Golden Banarasi Saree', category: 'traditional', price: 22000, oldPrice: 28000, image: 'https://images.unsplash.com/photo-1609359859524-9a2f6e4a7c3e?w=400', rating: 4.9, reviews: 34, badge: 'Limited', stock: 10, description: 'Authentic Banarasi saree with gold zari work.' },
            { id: 9, name: 'Navy Blue Formal Dress', category: 'evening', price: 8500, oldPrice: 10000, image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', rating: 4.4, reviews: 112, badge: '', stock: 45, description: 'Classic navy blue formal dress for office events.' },
            { id: 10, name: 'Peach Wedding Lehenga', category: 'wedding', price: 28000, oldPrice: 35000, image: 'https://images.unsplash.com/photo-1596815069667-9b0f9d6f4c7e?w=400', rating: 4.8, reviews: 56, badge: 'New', stock: 20, description: 'Beautiful peach lehenga for wedding ceremonies.' },
            { id: 11, name: 'Casual Denim Dress', category: 'casual', price: 2800, oldPrice: 3500, image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', rating: 4.3, reviews: 203, badge: '', stock: 80, description: 'Comfortable denim dress for everyday wear.' },
        ];
        for (const p of defaults) await DB.setProduct(p);
    }
}

// ===== AUTH FUNCTIONS =====
function isLoggedIn() { return DB.getCurrentUser() !== null; }
function isAdmin() { const u = DB.getCurrentUser(); return u && u.role === 'admin'; }
function getCurrentUser() { return APP_USER || DB.getCurrentUser(); }

async function register(name, email, phone, password, role = 'user') {
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;
        await firestore.collection('users').doc(user.uid).set({
            uid: user.uid, name: name, email: email, phone: phone, role: role
        });
        return { success: true, message: 'Account created successfully!' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

function logout() {
    auth.signOut();
    DB.setCart([]);
    window.location.href = 'auth.html';
}

// ===== PRODUCT FUNCTIONS =====
function getProducts(filter) {
    const products = DB.getProducts();
    return filter === 'all' ? products : products.filter(p => p.category === filter);
}
function getProduct(id) { return DB.getProducts().find(p => p.id === id); }

async function addProduct(product) {
    const products = DB.getProducts();
    product.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    await DB.setProduct(product);
    return product;
}
async function updateProduct(id, data) {
    const product = DB.getProducts().find(p => p.id === id);
    if (product) {
        const updated = { ...product, ...data };
        await DB.setProduct(updated);
    }
}
async function deleteProduct(id) {
    await DB.deleteProduct(id);
}

// ===== CART FUNCTIONS =====
function getCart() {
    const user = getCurrentUser();
    const allCart = DB.getCart();
    if (user) return allCart.filter(item => item.userId === user.uid);
    return allCart.filter(item => !item.userId);
}
function addToCart(productId) {
    const cart = DB.getCart();
    const user = getCurrentUser();
    const userId = user ? user.uid : null;
    const existing = cart.find(item => item.userId === userId && item.productId === productId);
    if (existing) { existing.quantity++; }
    else { cart.push({ userId, productId, quantity: 1 }); }
    DB.setCart(cart);
    showToast('Item added to cart!');
    updateNavCart();
}
function buyNow(productId) {
    const user = getCurrentUser();
    const userId = user ? user.uid : null;
    let cart = DB.getCart().filter(item => item.userId !== userId);
    cart.push({ userId, productId, quantity: 1 });
    DB.setCart(cart);
    window.location.href = 'checkout.html';
}
function updateCartQty(productId, change) {
    const cart = DB.getCart();
    const user = getCurrentUser();
    const userId = user ? user.uid : null;
    const item = cart.find(i => i.userId === userId && i.productId === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            DB.setCart(cart.filter(i => !(i.userId === userId && i.productId === productId)));
        } else {
            DB.setCart(cart);
        }
    }
    updateNavCart();
}
function removeFromCart(productId) {
    const user = getCurrentUser();
    const userId = user ? user.uid : null;
    DB.setCart(DB.getCart().filter(i => !(i.userId === userId && i.productId === productId)));
    updateNavCart();
    showToast('Item removed from cart', 'warning');
}
function getCartTotal() {
    const cart = getCart();
    const products = DB.getProducts();
    return cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);
}
function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
}
function clearCart() {
    const user = getCurrentUser();
    const userId = user ? user.uid : null;
    DB.setCart(DB.getCart().filter(i => i.userId !== userId));
    updateNavCart();
}

// ===== ORDER FUNCTIONS =====
async function placeOrder(paymentMethod, customerPhone, address, customerName, contactPhone, deliveryFee, deliveryLocation) {
    const cart = getCart();
    if (cart.length === 0) return { success: false, message: 'Cart is empty!' };
    const products = DB.getProducts();
    const subtotal = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    const total = subtotal + deliveryFee;
    const orderId = 'ORD-' + Date.now();
    const currentUser = getCurrentUser();
    const order = {
        id: orderId,
        userId: currentUser ? currentUser.uid : null,
        userName: currentUser ? currentUser.name : (customerName || 'Guest'),
        userEmail: currentUser ? currentUser.email : '',
        customerName: customerName || (currentUser ? currentUser.name : 'Guest'),
        contactPhone: contactPhone || '',
        items: cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            return { productId: item.productId, name: product.name, price: product.price, quantity: item.quantity, image: product.image };
        }),
        subtotal, deliveryFee, deliveryLocation, total,
        paymentMethod, paymentPhone: customerPhone,
        address, status: 'Pending',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    await DB.addOrder(order);
    clearCart();
    return { success: true, orderId };
}
function getUserOrders() {
    if (!isLoggedIn()) return [];
    return DB.getOrders().filter(o => o.userId === getCurrentUser().uid).sort((a, b) => b.id.localeCompare(a.id));
}
function getAllOrders() {
    return DB.getOrders().sort((a, b) => b.id.localeCompare(a.id));
}
async function updateOrderStatus(orderId, status) {
    await DB.updateOrderStatus(orderId, status);
}
function getOrdersByPhone(phone) {
    return DB.getOrders().filter(o => o.contactPhone && o.contactPhone === phone).sort((a, b) => b.id.localeCompare(a.id));
}

// ===== MESSAGE FUNCTIONS =====
async function saveContactMessage(name, email, phone, message) {
    const messages = DB.getMessages();
    const id = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    await DB.addMessage({ id, name, email, phone, message, date, status: 'unread' });
    return true;
}
function getAllMessages() {
    return DB.getMessages().sort((a, b) => b.id - a.id);
}
async function markMessageRead(id) {
    const msg = DB.getMessages().find(m => m.id === id);
    if (msg) {
        const newStatus = msg.status === 'unread' ? 'read' : 'unread';
        msg.status = newStatus;
        await DB.markMessageRead(id, newStatus);
    }
}
async function deleteMessage(id) {
    await DB.deleteMessage(id);
}

// ===== UI HELPERS =====
function formatPrice(price) {
    return '\u09F3' + price.toLocaleString('en-IN');
}
function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = '<i class="fas fa-' + icon + '"></i><span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
function updateNavCart() {
    const badge = document.getElementById('navCartBadge');
    if (badge) badge.textContent = getCartCount();
}
function renderStars(rating) {
    const full = Math.floor(rating);
    return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
}
function toggleDropdown() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.toggle('show');
}
async function submitContactForm() {
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhoneForm').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    if (!name || !email || !message) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    await saveContactMessage(name, email, phone, message);
    showToast('Message sent successfully! We will contact you soon.');
    document.getElementById('contactForm').reset();
}
function updateAdminMessageBadge() {
    const unread = DB.getMessages().filter(m => m.status === 'unread').length;
    const badge = document.getElementById('messagesBadge');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

// ===== AUTH PAGE LOGIC =====
async function initAuthPage() {
    await initData();
    const user = await waitForAuth();
    if (user) {
        const doc = await firestore.collection('users').doc(user.uid).get();
        const data = doc.data() || {};
        if (data.role === 'admin') { window.location.href = 'admin.html'; return; }
    }
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const result = await login(email, password);
        if (result.success) {
            const currentUser = auth.currentUser;
            const doc = await firestore.collection('users').doc(currentUser.uid).get();
            const data = doc.data() || {};
            if (data.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('loginErrorText').textContent = 'Admin access only!';
                await auth.signOut();
            }
        } else {
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('loginErrorText').textContent = result.message;
        }
    });
}

// ===== NAV LOGIC =====
function initNav() {
    const user = getCurrentUser();
    const authNav = document.getElementById('authNav');
    const userNav = document.getElementById('userNav');
    const adminLink = document.getElementById('adminLink');

    if (user) {
        if (authNav) authNav.style.display = 'none';
        if (userNav) userNav.style.display = 'flex';
        const nameEl = document.getElementById('navUserName');
        const avatarEl = document.getElementById('navUserAvatar');
        const dropName = document.getElementById('dropdownName');
        const dropEmail = document.getElementById('dropdownEmail');
        if (nameEl) nameEl.textContent = user.name || 'User';
        if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
        if (dropName) dropName.textContent = user.name || 'User';
        if (dropEmail) dropEmail.textContent = user.email || '';
        if (adminLink) adminLink.style.display = user.role === 'admin' ? 'flex' : 'none';
        updateNavCart();
    } else {
        if (authNav) authNav.style.display = 'flex';
        if (userNav) userNav.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        updateNavCart();
    }
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-menu')) {
            document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
        }
    });
}

// ===== INDEX PAGE LOGIC =====
async function initIndexPage() {
    await initData();
    await syncAuthUser();
    initNav();
    renderProducts('all');
    renderNewArrivals();
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    if (category) {
        renderProducts(category);
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector('.category-tab[data-cat="' + category + '"]');
        if (activeTab) activeTab.classList.add('active');
    }
}

let currentFilter = 'all';
function renderProducts(filter) {
    currentFilter = filter;
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const products = getProducts(filter);
    grid.innerHTML = products.map(p => `
        <div class="product-card fade-in">
            <div class="product-image">
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x500?text=VUNO'">
                ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${p.category}</div>
                <h3 class="product-name">${p.name}</h3>
                <div class="product-price">
                    <span class="current-price">${formatPrice(p.price)}</span>
                    ${p.oldPrice ? `<span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''}
                </div>
                <div class="product-rating">
                    <span class="stars">${renderStars(p.rating)}</span>
                    <span class="rating-count">(${p.reviews} reviews)</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="add-to-cart" onclick="addToCart(${p.id})" style="flex:1; width:auto;"><i class="fas fa-shopping-bag"></i> Add to Cart</button>
                    <button class="add-to-cart" onclick="buyNow(${p.id})" style="flex:1; width:auto; background: linear-gradient(135deg, var(--gold), #c9a227);"><i class="fas fa-bolt"></i> Buy Now</button>
                </div>
            </div>
        </div>
    `).join('');
}
function renderNewArrivals() {
    const grid = document.getElementById('newProductsGrid');
    if (!grid) return;
    const products = DB.getProducts().slice(0, 6);
    grid.innerHTML = products.map(p => `
        <div class="product-card fade-in">
            <div class="product-image">
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x500?text=VUNO'">
                <span class="product-badge">New Arrival</span>
            </div>
            <div class="product-info">
                <div class="product-category">${p.category}</div>
                <h3 class="product-name">${p.name}</h3>
                <div class="product-price">
                    <span class="current-price">${formatPrice(p.price)}</span>
                    ${p.oldPrice ? `<span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''}
                </div>
                <div class="product-rating">
                    <span class="stars">${renderStars(p.rating)}</span>
                    <span class="rating-count">(${p.reviews} reviews)</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="add-to-cart" onclick="addToCart(${p.id})" style="flex:1; width:auto;"><i class="fas fa-shopping-bag"></i> Add to Cart</button>
                    <button class="add-to-cart" onclick="buyNow(${p.id})" style="flex:1; width:auto; background: linear-gradient(135deg, var(--gold), #c9a227);"><i class="fas fa-bolt"></i> Buy Now</button>
                </div>
            </div>
        </div>
    `).join('');
}
function filterProducts(category, el) {
    renderProducts(category);
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
}

// ===== CART PAGE LOGIC =====
async function initCartPage() {
    await initData();
    await syncAuthUser();
    initNav();
    renderCart();
}
function renderCart() {
    const container = document.getElementById('cartContainer');
    const cart = getCart();
    const products = DB.getProducts();
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <h3 style="font-family: 'Playfair Display', serif; margin-bottom: 10px;">Your cart is empty</h3>
                <p style="color: var(--text-light); margin-bottom: 30px;">Add some beautiful dresses to get started!</p>
                <a href="index.html" class="btn-gold">Continue Shopping</a>
            </div>
        `;
        return;
    }
    let total = 0;
    const itemsHtml = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        const subtotal = product.price * item.quantity;
        total += subtotal;
        return `
            <div class="cart-item">
                <img src="${product.image}" class="cart-item-img" alt="${product.name}" onerror="this.src='https://via.placeholder.com/100x120?text=VUNO'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">${formatPrice(product.price)}</div>
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateCartQty(${product.id}, -1); renderCart();">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQty(${product.id}, 1); renderCart();">+</button>
                    </div>
                    <a href="#" class="remove-item" onclick="removeFromCart(${product.id}); renderCart(); return false;"><i class="fas fa-trash"></i> Remove</a>
                </div>
                <div style="font-weight: 700; font-size: 18px; color: var(--accent);">${formatPrice(subtotal)}</div>
            </div>
        `;
    }).join('');
    container.innerHTML = `
        <div class="cart-grid">
            <div class="cart-items-box">${itemsHtml}</div>
            <div class="cart-summary">
                <h3>Order Summary</h3>
                <div class="summary-row"><span>Subtotal</span><span style="font-weight: 600;">${formatPrice(total)}</span></div>
                <div class="summary-row"><span>Shipping</span><span style="font-weight: 600;font-size: 14px; color: var(--success);"> Free shipping on orders over \u09F31500</span></div>
                <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
                <a href="checkout.html" class="btn-gold" style="width: 100%; text-align: center; margin-top: 20px; display: block;">Proceed to Checkout</a>
                <a href="index.html" style="display: block; text-align: center; margin-top: 15px; color: var(--text-light); text-decoration: none;">Continue Shopping</a>
            </div>
        </div>
    `;
}

// ===== CHECKOUT PAGE LOGIC =====
async function initCheckoutPage() {
    await initData();
    await syncAuthUser();
    initNav();
    const cart = getCart();
    if (cart.length === 0) { window.location.href = 'cart.html'; return; }
    
    const currentUser = getCurrentUser();
    if (currentUser) {
        const nameInput = document.getElementById('customerName');
        const phoneInput = document.getElementById('contactPhone');
        if (nameInput) nameInput.value = currentUser.name;
        if (phoneInput) phoneInput.value = currentUser.phone || '';
    }
    
    const products = DB.getProducts();
    let subtotal = 0;
    const summaryHtml = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div style="display: flex; gap: 15px; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
                <img src="${product.image}" style="width: 60px; height: 75px; border-radius: 8px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/60x75?text=VUNO'">
                <div style="flex: 1;">
                    <p style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${product.name}</p>
                    <p style="color: var(--text-light); font-size: 13px;">Qty: ${item.quantity}</p>
                </div>
                <span style="font-weight: 700;">${formatPrice(itemTotal)}</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('checkoutSummary').innerHTML = summaryHtml;
    updateCheckoutTotal(subtotal);
    
    const deliveryLoc = document.getElementById('deliveryLocation');
    if (deliveryLoc) {
        deliveryLoc.addEventListener('change', () => updateCheckoutTotal(subtotal));
    }
    
    document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const method = document.querySelector('input[name="payment_method"]:checked');
            const phone = document.getElementById('customerPhone').value.trim();
            const address = document.getElementById('deliveryAddress').value.trim();
            const customerName = document.getElementById('customerName').value.trim();
            const contactPhone = document.getElementById('contactPhone').value.trim();
            const deliveryLocation = document.getElementById('deliveryLocation').value;
            
            if (!method) { showToast('Please select a payment method', 'error'); return; }
            if (!customerName || !contactPhone || !phone || !address) { 
                showToast('Please fill all fields', 'error'); return; 
            }
            
            const deliveryFee = deliveryLocation === 'dhaka' ? 75 : 120;
            const result = await placeOrder(method.value, phone, address, customerName, contactPhone, deliveryFee, deliveryLocation);
            
            if (result.success) {
                document.getElementById('checkoutForm').classList.add('hidden');
                document.getElementById('orderSuccess').classList.remove('hidden');
                document.getElementById('successOrderId').textContent = '#' + result.orderId;
                showToast('Order placed successfully!');
            } else {
                showToast(result.message || 'Failed to place order', 'error');
            }
        } catch (err) {
            console.error('Order error:', err);
            showToast('Order failed: ' + (err.message || 'Unknown error'), 'error');
        }
    });
}
function updateCheckoutTotal(subtotal) {
    const deliveryLocation = document.getElementById('deliveryLocation');
    if (!deliveryLocation) return;
    const fee = deliveryLocation.value === 'dhaka' ? 75 : 120;
    const total = subtotal + fee;
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const deliveryEl = document.getElementById('checkoutDelivery');
    const totalEl = document.getElementById('checkoutTotal');
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (deliveryEl) deliveryEl.textContent = formatPrice(fee);
    if (totalEl) totalEl.textContent = formatPrice(total);
}
function selectPayment(el, method) {
    document.querySelectorAll('.payment-method').forEach(p => {
        p.classList.remove('selected');
        p.style.borderColor = '#e0e0e0';
        p.style.background = 'white';
    });
    el.classList.add('selected');
    el.style.borderColor = 'var(--accent)';
    el.style.background = 'rgba(233, 69, 96, 0.05)';
    document.querySelector('input[value="' + method + '"]').checked = true;
}

// ===== ORDERS PAGE LOGIC =====
async function initOrdersPage() {
    await initData();
    await syncAuthUser();
    initNav();
    const user = getCurrentUser();
    const lookupSection = document.getElementById('orderLookupSection');
    const ordersSection = document.getElementById('ordersSection');
    if (user) {
        if (lookupSection) lookupSection.style.display = 'none';
        if (ordersSection) ordersSection.style.display = 'block';
        renderUserOrders();
    } else {
        if (lookupSection) lookupSection.style.display = 'block';
        if (ordersSection) ordersSection.style.display = 'none';
    }
}
function lookupOrders() {
    const phone = document.getElementById('lookupPhone').value.trim();
    if (!phone) { showToast('Please enter your phone number', 'error'); return; }
    const orders = getOrdersByPhone(phone);
    const ordersSection = document.getElementById('ordersSection');
    if (ordersSection) ordersSection.style.display = 'block';
    renderGuestOrders(orders, phone);
}
function renderUserOrders() {
    const orders = getUserOrders();
    const tbody = document.getElementById('ordersTableBody');
    const title = document.getElementById('ordersTitle');
    if (title) title.textContent = 'My Orders';
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No orders found</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => {
        let statusClass = o.status === 'Pending' ? 'status-pending' : 
                          o.status === 'Processing' ? 'status-processing' : 
                          o.status === 'Completed' ? 'status-completed' : 'status-cancelled';
        let statusText = o.status;
        if (o.status === 'Processing') statusText = 'Payment Verified - Confirmed';
        if (o.status === 'Cancelled') statusText = 'Payment Rejected - Cancelled';
        if (o.status === 'Pending') statusText = 'Awaiting Verification';
        const methodIcon = o.paymentMethod === 'bkash' ? '<i class="fas fa-mobile-alt" style="color: #d12053;"></i>' : 
                           o.paymentMethod === 'nagad' ? '<i class="fas fa-money-bill-wave" style="color: #f7931e;"></i>' : 
                           '<i class="fas fa-rocket" style="color: #8e44ad;"></i>';
        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 15px; font-weight: 600;">#${o.id}</td>
                <td style="padding: 15px;">${o.items.length} item(s)</td>
                <td style="padding: 15px; font-weight: 700; color: var(--accent);">${formatPrice(o.total)}</td>
                <td style="padding: 15px;">${methodIcon} ${o.paymentMethod.charAt(0).toUpperCase() + o.paymentMethod.slice(1)}</td>
                <td style="padding: 15px;"><span class="${statusClass}" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;">${statusText}</span></td>
                <td style="padding: 15px; color: var(--text-light); font-size: 14px;">${o.date}</td>
                <td style="padding: 15px;">
                    <button class="btn-add" style="padding: 8px 16px; font-size: 13px;" onclick="showOrderDetails('${o.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}
function renderGuestOrders(orders, phone) {
    const tbody = document.getElementById('ordersTableBody');
    const title = document.getElementById('ordersTitle');
    if (title) title.textContent = 'Orders for ' + phone;
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No orders found for this phone number</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => {
        let statusClass = o.status === 'Pending' ? 'status-pending' : o.status === 'Processing' ? 'status-processing' : o.status === 'Completed' ? 'status-completed' : 'status-cancelled';
        let statusText = o.status;
        if (o.status === 'Processing') statusText = 'Payment Verified - Confirmed';
        if (o.status === 'Cancelled') statusText = 'Payment Rejected - Cancelled';
        if (o.status === 'Pending') statusText = 'Awaiting Verification';
        const methodIcon = o.paymentMethod === 'bkash' ? '<i class="fas fa-mobile-alt" style="color: #d12053;"></i>' : o.paymentMethod === 'nagad' ? '<i class="fas fa-money-bill-wave" style="color: #f7931e;"></i>' : '<i class="fas fa-rocket" style="color: #8e44ad;"></i>';
        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 15px; font-weight: 600;">#${o.id}</td>
                <td style="padding: 15px;">${o.items.length} item(s)</td>
                <td style="padding: 15px; font-weight: 700; color: var(--accent);">${formatPrice(o.total)}</td>
                <td style="padding: 15px;">${methodIcon} ${o.paymentMethod.charAt(0).toUpperCase() + o.paymentMethod.slice(1)}</td>
                <td style="padding: 15px;"><span class="${statusClass}" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;">${statusText}</span></td>
                <td style="padding: 15px; color: var(--text-light); font-size: 14px;">${o.date}</td>
                <td style="padding: 15px;">
                    <button class="btn-add" style="padding: 8px 16px; font-size: 13px;" onclick="showOrderDetails('${o.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}
function showOrderDetails(orderId) {
    const order = DB.getOrders().find(o => o.id === orderId);
    if (!order) return;
    const content = document.getElementById('orderDetailsContent');
    if (!content) return;
    let statusClass = order.status === 'Pending' ? 'status-pending' : 
                      order.status === 'Processing' ? 'status-processing' : 
                      order.status === 'Completed' ? 'status-completed' : 'status-cancelled';
    let statusText = order.status;
    if (order.status === 'Processing') statusText = 'Payment Verified - Confirmed';
    if (order.status === 'Cancelled') statusText = 'Payment Rejected - Cancelled';
    if (order.status === 'Pending') statusText = 'Awaiting Verification';
    const methodIcon = order.paymentMethod === 'bkash' ? '<i class="fas fa-mobile-alt" style="color: #d12053;"></i>' : 
                       order.paymentMethod === 'nagad' ? '<i class="fas fa-money-bill-wave" style="color: #f7931e;"></i>' : 
                       '<i class="fas fa-rocket" style="color: #8e44ad;"></i>';
    const itemsHtml = order.items.map(item => `
        <div style="display: flex; gap: 15px; padding: 15px; background: #f9f9f9; border-radius: 12px; margin-bottom: 10px;">
            <img src="${item.image}" style="width: 60px; height: 75px; border-radius: 8px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/60x75?text=VUNO'">
            <div style="flex: 1;">
                <p style="font-weight: 600; margin-bottom: 4px;">${item.name}</p>
                <p style="color: #666; font-size: 13px;">${formatPrice(item.price)} x ${item.quantity}</p>
            </div>
            <div style="font-weight: 700; color: var(--accent);">${formatPrice(item.price * item.quantity)}</div>
        </div>
    `).join('');
    content.innerHTML = `
        <div style="margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 14px; color: #666;">Order ID: <strong style="color: var(--primary);">#${order.id}</strong></span>
                <span style="font-size: 14px; color: #666;">${order.date}</span>
            </div>
            <div style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; ${statusClass === 'status-pending' ? 'background: #fff3cd; color: #856404;' : statusClass === 'status-processing' ? 'background: #cce5ff; color: #004085;' : statusClass === 'status-completed' ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}">${statusText}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="background: #f9f9f9; padding: 20px; border-radius: 12px;">
                <h4 style="font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase;">Customer Info</h4>
                <p style="font-weight: 600; margin-bottom: 5px;">${order.customerName || order.userName || '-'}</p>
                <p style="font-size: 13px; color: #666; margin-bottom: 5px;"><i class="fas fa-phone" style="margin-right: 5px;"></i> Contact: ${order.contactPhone || '-'}</p>
                <p style="font-size: 13px; color: #666;"><i class="fas fa-mobile-alt" style="margin-right: 5px;"></i> Payment Phone: ${order.paymentPhone || '-'}</p>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 12px;">
                <h4 style="font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase;">Delivery Info</h4>
                <p style="font-size: 13px; color: #666; margin-bottom: 5px; line-height: 1.5;">${order.address || '-'}</p>
                <p style="font-size: 13px; color: #666; margin-top: 8px;"><i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i> ${order.deliveryLocation === 'dhaka' ? 'Dhaka City' : 'Outside Dhaka'}</p>
                <p style="font-size: 13px; color: #666; margin-top: 5px;"><i class="fas fa-truck" style="margin-right: 5px;"></i> Delivery: ${formatPrice(order.deliveryFee || 0)}</p>
            </div>
        </div>
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; color: #666; margin-bottom: 15px; text-transform: uppercase;">Payment Info</h4>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                ${methodIcon}
                <span style="font-weight: 600;">${order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}</span>
            </div>
        </div>
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; color: #666; margin-bottom: 15px; text-transform: uppercase;">Items</h4>
            ${itemsHtml}
        </div>
        <div style="border-top: 2px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 18px; font-weight: 700;">Total Amount</span>
            <span style="font-size: 24px; font-weight: 700; color: var(--accent);">${formatPrice(order.total)}</span>
        </div>
    `;
    openModal('orderDetailsModal');
}

// ===== ADMIN PAGE LOGIC =====
async function initAdminPage() {
    await initData();
    await syncAuthUser();
    if (!isAdmin()) { window.location.href = 'index.html'; return; }
    initNav();
    updateAdminMessageBadge();
    showAdminTab('dashboard');
}
function showAdminTab(tab) {
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector('.admin-nav-item[data-tab="' + tab + '"]');
    if (navItem) navItem.classList.add('active');
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById('admin-' + tab);
    if (panel) panel.classList.remove('hidden');
    if (tab === 'dashboard') renderAdminDashboard();
    if (tab === 'products') renderAdminProducts();
    if (tab === 'orders') renderAdminOrders();
    if (tab === 'customers') renderAdminCustomers();
    if (tab === 'messages') renderAdminMessages();
}
function renderAdminDashboard() {
    const orders = DB.getOrders();
    const products = DB.getProducts();
    const users = DB.getUsers().filter(u => u.role === 'user');
    const revenue = orders.filter(o => o.status === 'Completed' || o.status === 'Processing').reduce((sum, o) => sum + o.total, 0);
    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statCustomers').textContent = users.length;
    document.getElementById('statRevenue').textContent = formatPrice(revenue);
    const recentOrders = orders.slice(0, 5);
    const tbody = document.getElementById('recentOrdersTable');
    tbody.innerHTML = recentOrders.map(o => {
        const statusClass = o.status === 'Pending' ? 'status-pending' : o.status === 'Processing' ? 'status-processing' : o.status === 'Completed' ? 'status-completed' : 'status-pending';
        return `
            <tr>
                <td style="font-weight: 600;">#${o.id}</td>
                <td>${o.userName}</td>
                <td>${o.items.length} item(s)</td>
                <td style="font-weight: 700; color: var(--accent);">${formatPrice(o.total)}</td>
                <td>${o.paymentMethod.charAt(0).toUpperCase() + o.paymentMethod.slice(1)}</td>
                <td><span class="status-badge ${statusClass}">${o.status}</span></td>
            </tr>
        `;
    }).join('');
}
function renderAdminProducts() {
    const products = DB.getProducts();
    const tbody = document.getElementById('adminProductsTable');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image}" class="table-img" onerror="this.src='https://via.placeholder.com/50x60?text=VUNO'"></td>
            <td style="font-weight: 600;">${p.name}</td>
            <td>${p.category.charAt(0).toUpperCase() + p.category.slice(1)}</td>
            <td style="font-weight: 700; color: var(--accent);">${formatPrice(p.price)}</td>
            <td>${p.stock}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteProductAdmin(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}
function renderAdminOrders() {
    const orders = getAllOrders();
    const tbody = document.getElementById('adminOrdersTable');
    tbody.innerHTML = orders.map(o => {
        const statusClass = o.status === 'Pending' ? 'status-pending' : o.status === 'Processing' ? 'status-processing' : o.status === 'Completed' ? 'status-completed' : 'status-cancelled';
        const methodIcon = o.paymentMethod === 'bkash' ? '<i class="fas fa-mobile-alt" style="color: #d12053;"></i>' : o.paymentMethod === 'nagad' ? '<i class="fas fa-money-bill-wave" style="color: #f7931e;"></i>' : '<i class="fas fa-rocket" style="color: #8e44ad;"></i>';
        let actionCell = '';
        if (o.status === 'Pending') {
            actionCell = `
                <div class="action-btns">
                    <button class="action-btn edit" onclick="acceptOrder('${o.id}')" title="Accept Order"><i class="fas fa-check"></i></button>
                    <button class="action-btn delete" onclick="rejectOrder('${o.id}')" title="Reject Order"><i class="fas fa-times"></i></button>
                </div>
            `;
        } else {
            actionCell = `<span class="status-badge ${statusClass}">${o.status}</span>`;
        }
        return `
            <tr>
                <td style="font-weight: 600;">#${o.id}</td>
                <td style="font-weight: 600;">${o.customerName || o.userName || '-'}</td>
                <td style="font-size: 13px;">${o.contactPhone || '-'}</td>
                <td style="max-width: 180px; font-size: 13px; line-height: 1.5;">${o.address || '-'}</td>
                <td style="font-size: 13px;">${o.deliveryLocation === 'dhaka' ? 'Dhaka City' : 'Outside Dhaka'}<br><span style="color: var(--accent); font-weight: 600;">${formatPrice(o.deliveryFee || 0)}</span></td>
                <td>${o.items.length} item(s)</td>
                <td style="font-weight: 700; color: var(--accent);">${formatPrice(o.total)}</td>
                <td>${methodIcon} ${o.paymentMethod.charAt(0).toUpperCase() + o.paymentMethod.slice(1)}</td>
                <td>${o.paymentPhone || '-'}</td>
                <td><span class="status-badge ${statusClass}">${o.status}</span></td>
                <td>${actionCell}</td>
            </tr>
        `;
    }).join('');
}
function renderAdminCustomers() {
    const users = DB.getUsers().filter(u => u.role === 'user');
    const orders = DB.getOrders();
    const tbody = document.getElementById('adminCustomersTable');
    tbody.innerHTML = users.map(u => {
        const orderCount = orders.filter(o => o.userId === u.id).length;
        return `
            <tr>
                <td style="font-weight: 600;">${u.name}</td>
                <td>${u.email}</td>
                <td>${u.phone}</td>
                <td>${orderCount}</td>
                <td><span style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #e3f2fd; color: #1976d2;">Customer</span></td>
            </tr>
        `;
    }).join('');
}
function renderAdminMessages() {
    const messages = getAllMessages();
    const tbody = document.getElementById('adminMessagesTable');
    updateAdminMessageBadge();
    if (!tbody) return;
    if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No messages found</td></tr>';
        return;
    }
    tbody.innerHTML = messages.map(m => `
        <tr style="${m.status === 'unread' ? 'background: #fff8e1;' : ''}">
            <td style="padding: 15px; font-weight: ${m.status === 'unread' ? '700' : '600'};">${m.name}</td>
            <td style="padding: 15px; font-size: 13px;">${m.email}</td>
            <td style="padding: 15px; font-size: 13px;">${m.phone || '-'}</td>
            <td style="padding: 15px; max-width: 300px; font-size: 13px; line-height: 1.5;">${m.message}</td>
            <td style="padding: 15px; color: var(--text-light); font-size: 14px; white-space: nowrap;">${m.date}</td>
            <td style="padding: 15px;"><span class="status-badge ${m.status === 'unread' ? 'status-pending' : 'status-completed'}">${m.status === 'unread' ? 'Unread' : 'Read'}</span></td>
            <td style="padding: 15px;">
                <div class="action-btns">
                    ${m.status === 'unread' ? `<button class="action-btn edit" onclick="markMessageRead(${m.id}); renderAdminMessages();" title="Mark as Read"><i class="fas fa-envelope-open"></i></button>` : `<button class="action-btn edit" onclick="markMessageRead(${m.id}); renderAdminMessages();" title="Mark as Unread" style="opacity: 0.5;"><i class="fas fa-envelope"></i></button>`}
                    <button class="action-btn delete" onclick="deleteMessageAdmin(${m.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}
async function deleteMessageAdmin(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    await deleteMessage(id);
    renderAdminMessages();
    showToast('Message deleted!');
}
async function deleteProductAdmin(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    await deleteProduct(id);
    renderAdminProducts();
    showToast('Product deleted!');
}
function editProduct(id) {
    const product = getProduct(id);
    if (!product) return;
    document.getElementById('editProductId').value = id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductOldPrice').value = product.oldPrice || '';
    document.getElementById('editProductStock').value = product.stock;
    document.getElementById('editProductImage').value = product.image;
    document.getElementById('editProductDesc').value = product.description || '';
    openModal('editProductModal');
}
async function saveEditProduct() {
    const id = parseInt(document.getElementById('editProductId').value);
    const data = {
        name: document.getElementById('editProductName').value,
        category: document.getElementById('editProductCategory').value,
        price: parseFloat(document.getElementById('editProductPrice').value),
        oldPrice: parseFloat(document.getElementById('editProductOldPrice').value) || null,
        stock: parseInt(document.getElementById('editProductStock').value),
        image: document.getElementById('editProductImage').value,
        description: document.getElementById('editProductDesc').value
    };
    await updateProduct(id, data);
    closeModal('editProductModal');
    renderAdminProducts();
    showToast('Product updated!');
}
async function saveNewProduct() {
    const product = {
        name: document.getElementById('newProductName').value,
        category: document.getElementById('newProductCategory').value,
        price: parseFloat(document.getElementById('newProductPrice').value),
        oldPrice: parseFloat(document.getElementById('newProductOldPrice').value) || null,
        stock: parseInt(document.getElementById('newProductStock').value) || 100,
        image: document.getElementById('newProductImage').value,
        description: document.getElementById('newProductDesc').value || '',
        rating: 4.5,
        reviews: 0,
        badge: ''
    };
    await addProduct(product);
    closeModal('addProductModal');
    document.getElementById('addProductForm').reset();
    renderAdminProducts();
    showToast('Product added!');
}
async function acceptOrder(orderId) {
    await updateOrderStatus(orderId, 'Processing');
    renderAdminOrders();
    showToast('Order accepted!');
}
async function rejectOrder(orderId) {
    await updateOrderStatus(orderId, 'Cancelled');
    renderAdminOrders();
    showToast('Order rejected!');
}
async function clearAllOrders() {
    if (!confirm('WARNING: Are you sure you want to permanently delete ALL orders? This action cannot be undone!' )) return;
    const snap = await firestore.collection('orders').get();
    const batch = firestore.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    renderAdminOrders();
    showToast('All orders cleared!');
}
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
