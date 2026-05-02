import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc,
    collection, getDocs, updateDoc,
    onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    getAuth, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_PW = "srrs@2025";
const OWNER_EMAIL = "sureshkumar.araveti@gmail.com";
const ITEMS = [
    { id: "garlic", name: "Garlic", icon: "🧄", desc: "Premium Quality" },
    { id: "jute", name: "Jute", icon: "🌿", desc: "Grade A Fiber" },
    { id: "raida", name: "Raida", icon: "🌾", desc: "Fresh Stock" },
    { id: "methi", name: "Methi", icon: "🟤", desc: "Pure & Clean" },
    { id: "salt", name: "Salt", icon: "🧂", desc: "Crystal White" },
    { id: "copra", name: "Copra", icon: "🥥", desc: "Dry Copra" },
];

let currentUser = null;
let currentMember = null;
let priceUnsub = null;

const openOv = id => document.getElementById(id).classList.add('open');
const closeOv = id => document.getElementById(id).classList.remove('open');
const showErr = (id, msg) => {
    const e = document.getElementById(id);
    e.textContent = msg;
    e.style.display = '';
};
const hideErr = id => { document.getElementById(id).style.display = 'none'; };
const setLoading = (id, on) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.disabled = on;
    b.style.opacity = on ? '.6' : '1';
};
const toast = (msg, type = 'success') => {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 3500);
};

setInterval(() => {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-IN');
}, 1000);

(() => {
    const el = document.getElementById('mqInner');
    let h = '';
    for (let r = 0; r < 2; r++) {
        ITEMS.forEach(i => {
            h += `<span class="mitem">${i.icon} ${i.name}</span><span class="msep">✦</span>`;
        });
    }
    el.innerHTML = h;
})();

function showPage(n) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tb').forEach(t => t.classList.remove('active'));
    document.getElementById('page-' + n).classList.add('active');
    document.getElementById('tab-' + n).classList.add('active');
    if (n === 'prices') refreshPricePage();
}

document.getElementById('tab-prices').addEventListener('click', () => showPage('prices'));
document.getElementById('tab-contact').addEventListener('click', () => showPage('contact'));

function refreshPricePage() {
    renderUserArea();
    const lv = document.getElementById('lockedView');
    const pg = document.getElementById('priceGrid');
    const pn = document.getElementById('pendingNote');
    lv.style.display = 'none';
    pg.style.display = '';
    pn.style.display = 'none';

    if (!currentUser || !currentMember) {
        startPrices();
        return;
    }
    if (currentMember.status === 'pending') {
        lv.style.display = 'none';
        pg.style.display = '';
        pn.style.display = '';
        startPrices();
        return;
    }
    if (currentMember.status === 'rejected') {
        lv.style.display = '';
        pg.style.display = 'none';
        pn.style.display = 'none';
        stopPrices();
        toast('❌ Your registration was not approved. Contact us.', 'error');
        return;
    }
    startPrices();
}

function startPrices() {
    if (priceUnsub) return;
    priceUnsub = onSnapshot(doc(db, 'prices', 'current'), snap => {
        if (snap.exists()) renderCards(snap.data());
    });
}

function stopPrices() {
    if (priceUnsub) {
        priceUnsub();
        priceUnsub = null;
    }
}

function renderCards(data) {
    const g = document.getElementById('priceGrid');
    g.innerHTML = '';
    const upd = data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    ITEMS.forEach((item, i) => {
        const stockStatus = data[item.id + '_stock'] !== false;
        const stockText = stockStatus ? 'IN STOCK' : 'OUT OF STOCK';
        const stockClass = stockStatus ? 'in-stock' : 'out-of-stock';
        const c = document.createElement('div');
        c.className = 'pc';
        c.style.animationDelay = (i * .06) + 's';
        c.innerHTML = `<div class="ct"><div class="ciw">${item.icon}</div><div class="cbg ${stockClass}">${stockText}</div></div>
      <div class="cn">${item.name}</div><div class="cd2">${item.desc}</div>
      <div class="cpr"><span class="ps">₹</span><span class="pv">${Number(data[item.id] || 0).toLocaleString('en-IN')}</span><span class="pu">&nbsp;/ kg</span></div>
      <div class="cf">⏱ Updated: <b>${upd}</b></div>`;
        g.appendChild(c);
    });
}

function renderUserArea() {
    const a = document.getElementById('userArea');
    if (currentMember?.status === 'approved') {
        const ini = currentMember.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        a.innerHTML = `<div class="up"><div class="av">${ini}</div><span>${currentMember.name.split(' ')[0]}</span><button class="lob" id="logoutBtn">✕</button></div>`;
        document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
    } else if (currentMember?.status === 'pending') {
        a.innerHTML = `<div class="up" style="background:rgba(255,193,7,.15);border-color:#ffc107"><span style="color:#e65100;font-size:.76rem">⏳ Pending Approval</span><button class="lob" id="logoutBtn">✕</button></div>`;
        document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
    } else {
        a.innerHTML = `<button class="bsf" style="padding:7px 15px;font-size:.8rem" id="navSignIn">🔑 Sign In</button>`;
        document.getElementById('navSignIn').addEventListener('click', () => openOv('loginOv'));
    }
}

onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (user) {
        const snap = await getDoc(doc(db, 'members', user.uid));
        currentMember = snap.exists() ? { uid: user.uid, ...snap.data() } : null;
    } else {
        currentMember = null;
    }
    refreshPricePage();
});

(async () => {
    const ref = doc(db, 'prices', 'current');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            garlic: 120,
            jute: 45,
            raida: 80,
            methi: 160,
            salt: 12,
            copra: 350,
            updatedAt: new Date().toISOString()
        });
    }
})();

document.getElementById('loginBtn').addEventListener('click', async () => {
    const em = document.getElementById('le').value.trim().toLowerCase();
    const pw = document.getElementById('lp').value;
    hideErr('lerr');
    if (!em || !pw) { showErr('lerr', 'Please fill all fields.'); return; }
    setLoading('loginBtn', true);
    try {
        await signInWithEmailAndPassword(auth, em, pw);
        closeOv('loginOv');
        document.getElementById('le').value = '';
        document.getElementById('lp').value = '';
    } catch (e) {
        const m = e.code === 'auth/invalid-credential' ? '❌ Invalid email or password.' :
            e.code === 'auth/too-many-requests' ? '⏳ Too many attempts. Try later.' : '❌ Login failed. Try again.';
        showErr('lerr', m);
    }
    setLoading('loginBtn', false);
});

document.getElementById('lp').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginBtn').click(); });

document.getElementById('regBtn').addEventListener('click', async () => {
    const name = document.getElementById('rn').value.trim();
    const biz = document.getElementById('rb').value.trim();
    const ph = document.getElementById('rph').value.trim();
    const ct = document.getElementById('rct').value.trim();
    const em = document.getElementById('rem').value.trim().toLowerCase();
    const pw = document.getElementById('rpw').value;
    const it = document.getElementById('rit').value.trim();
    hideErr('rerr');
    document.getElementById('rsuc').style.display = 'none';
    if (!name || !biz || !ph || !ct || !em || !pw) { showErr('rerr', '❌ Please fill all required fields.'); return; }
    if (pw.length < 6) { showErr('rerr', '❌ Password must be at least 6 characters.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showErr('rerr', '❌ Enter a valid email address.'); return; }
    setLoading('regBtn', true);
    try {
        const cred = await createUserWithEmailAndPassword(auth, em, pw);
        const uid = cred.user.uid;
        const data = {
            name,
            biz,
            phone: ph,
            city: ct,
            email: em,
            items: it,
            status: 'pending',
            registeredAt: new Date().toISOString(),
            uid
        };
        await setDoc(doc(db, 'members', uid), data);
        document.getElementById('rsuc').style.display = '';
        await signOut(auth);
        const sub = encodeURIComponent(`[New Buyer Request] ${name} – ${biz}`);
        const bd = encodeURIComponent(`New buyer registration:\n\nName: ${name}\nBusiness: ${biz}\nPhone: ${ph}\nCity: ${ct}\nEmail: ${em}\nItems: ${it || 'Not specified'}\nRegistered: ${new Date().toLocaleString('en-IN')}\n\nLogin to Admin Panel on the website to approve or reject.`);
        setTimeout(() => window.open(`mailto:${OWNER_EMAIL}?subject=${sub}&body=${bd}`, '_blank'), 800);
    } catch (e) {
        const m = e.code === 'auth/email-already-in-use' ? '❌ This email is already registered.' :
            e.code === 'auth/weak-password' ? '❌ Password too weak.' : '❌ Registration failed. Try again.';
        showErr('rerr', m);
    }
    setLoading('regBtn', false);
});

document.getElementById('adminLoginBtn').addEventListener('click', () => {
    const pw = document.getElementById('apw').value;
    hideErr('aperr');
    if (pw === ADMIN_PW) {
        closeOv('adminLoginOv');
        openAdminPanel();
    } else {
        showErr('aperr', '❌ Incorrect password.');
    }
});

document.getElementById('apw').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('adminLoginBtn').click(); });

async function openAdminPanel() {
    await buildAdminPrices();
    switchAdminTab('prices');
    loadBadge();
    openOv('adminOv');
}

async function buildAdminPrices() {
    const snap = await getDoc(doc(db, 'prices', 'current'));
    const data = snap.exists() ? snap.data() : {};
    const g = document.getElementById('adminGrid');
    g.innerHTML = '';
    ITEMS.forEach(item => {
        const r = document.createElement('div');
        r.className = 'ar';
        const stockStatus = data[item.id + '_stock'] !== false;
        r.innerHTML = `<div class="ari"><strong>${item.icon} ${item.name}</strong><span>₹ per kg</span></div>
      <span style="color:#bbb">₹</span>
      <input class="ai" type="number" id="ai-${item.id}" value="${data[item.id] ?? 0}" min="0" step="0.5" />
      <button class="stock-btn ${stockStatus ? 'in-stock' : 'out-of-stock'}" id="stock-${item.id}" data-item="${item.id}" title="${stockStatus ? 'In Stock - Click to mark out of stock' : 'Out of Stock - Click to mark in stock'}">${stockStatus ? '✅ In Stock' : '❌ Out of Stock'}</button>`;
        g.appendChild(r);
    });
    ITEMS.forEach(item => {
        document.getElementById('stock-' + item.id).addEventListener('click', () => toggleStock(item.id));
    });
    document.getElementById('sok').style.display = 'none';
}

function toggleStock(itemId) {
    const btn = document.getElementById('stock-' + itemId);
    const isInStock = btn.classList.contains('in-stock');
    btn.classList.toggle('in-stock');
    btn.classList.toggle('out-of-stock');
    btn.textContent = isInStock ? '❌ Out of Stock' : '✅ In Stock';
    btn.title = isInStock ? 'Out of Stock - Click to mark in stock' : 'In Stock - Click to mark out of stock';
}

async function loadBadge() {
    try {
        const q = query(collection(db, 'members'), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        document.getElementById('pbadge').textContent = snap.size;
    } catch (e) { }
}

function switchAdminTab(n) {
    document.querySelectorAll('.at').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.atc').forEach(t => t.classList.remove('active'));
    document.getElementById('at-' + n).classList.add('active');
    document.getElementById('atc-' + n).classList.add('active');
    if (n === 'pending') loadPending();
    if (n === 'members') loadMembers();
}

async function loadPending() {
    const el = document.getElementById('pendList');
    el.innerHTML = '<div class="empty">Loading…</div>';
    try {
        const q = query(collection(db, 'members'), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        if (snap.empty) {
            el.innerHTML = '<div class="empty">✅ No pending registrations</div>';
            return;
        }
        el.innerHTML = '';
        snap.forEach(d => {
            const u = { uid: d.id, ...d.data() };
            const r = document.createElement('div');
            r.className = 'pr';
            r.id = 'pr-' + u.uid;
            r.innerHTML = `<div class="prn">👤 ${u.name}</div>
        <div class="prm">🏪 ${u.biz} | 📍 ${u.city}<br>📞 ${u.phone} | 📧 ${u.email}<br>📦 ${u.items || '—'}<br>🕐 ${new Date(u.registeredAt).toLocaleString('en-IN')}</div>
        <div class="pra">
          <button class="bap" data-uid="${u.uid}" data-name="${u.name}" data-email="${u.email}">✅ Approve</button>
          <button class="brj" data-uid="${u.uid}" data-name="${u.name}" data-email="${u.email}">❌ Reject</button>
        </div>`;
            el.appendChild(r);
        });
        el.querySelectorAll('.bap').forEach(btn => btn.addEventListener('click', () => approveUser(btn.dataset.uid, btn.dataset.name, btn.dataset.email)));
        el.querySelectorAll('.brj').forEach(btn => btn.addEventListener('click', () => rejectUser(btn.dataset.uid, btn.dataset.name, btn.dataset.email)));
    } catch (e) {
        el.innerHTML = '<div class="empty">⚠️ Error. Check Firestore rules.</div>';
    }
}

async function approveUser(uid, name, email) {
    try {
        await updateDoc(doc(db, 'members', uid), { status: 'approved', approvedAt: new Date().toISOString() });
        document.getElementById('pr-' + uid)?.remove();
        loadBadge();
        toast(`✅ ${name} approved!`, 'success');
        const sub = encodeURIComponent('Your Account is Approved – Sri Rama Sanjeeva Traders');
        const bd = encodeURIComponent(`Dear ${name},\n\nYour buyer registration with Sri Rama Sanjeeva Traders has been APPROVED.\n\nYou can now log in to view our live wholesale prices.\n\nLogin with your registered email and password.\n\nFor queries:\nPhone: +91 94404 28806 / +91 94912 87206\nEmail: sureshkumar.araveti@gmail.com\n\nThank you,\nSri Rama Sanjeeva Traders, Proddatur`);
        window.open(`mailto:${email}?subject=${sub}&body=${bd}`, '_blank');
    } catch (e) {
        toast('❌ Failed. Try again.', 'error');
    }
}

async function rejectUser(uid, name, email) {
    try {
        await updateDoc(doc(db, 'members', uid), { status: 'rejected', rejectedAt: new Date().toISOString() });
        document.getElementById('pr-' + uid)?.remove();
        loadBadge();
        toast(`${name} rejected.`, 'error');
        const sub = encodeURIComponent('Registration Update – Sri Rama Sanjeeva Traders');
        const bd = encodeURIComponent(`Dear ${name},\n\nThank you for your interest in Sri Rama Sanjeeva Traders.\n\nUnfortunately, we are unable to approve your registration at this time.\n\nFor more info:\nPhone: +91 94404 28806\nEmail: sureshkumar.araveti@gmail.com\n\nSri Rama Sanjeeva Traders, Proddatur`);
        window.open(`mailto:${email}?subject=${sub}&body=${bd}`, '_blank');
    } catch (e) {
        toast('❌ Failed. Try again.', 'error');
    }
}

async function loadMembers() {
    const el = document.getElementById('memList');
    el.innerHTML = '<div class="empty">Loading…</div>';
    try {
        const q = query(collection(db, 'members'), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        if (snap.empty) {
            el.innerHTML = '<div class="empty">No approved members yet</div>';
            return;
        }
        el.innerHTML = '';
        snap.forEach(d => {
            const u = d.data();
            const r = document.createElement('div');
            r.className = 'pr';
            r.innerHTML = `<div class="prn">✅ ${u.name}</div>
        <div class="prm">🏪 ${u.biz} | 📍 ${u.city}<br>📞 ${u.phone} | 📧 ${u.email}</div>`;
            el.appendChild(r);
        });
    } catch (e) {
        el.innerHTML = '<div class="empty">⚠️ Error loading members.</div>';
    }
}

document.getElementById('saveBtn').addEventListener('click', async () => {
    const updates = { updatedAt: new Date().toISOString() };
    ITEMS.forEach(i => {
        updates[i.id] = parseFloat(document.getElementById('ai-' + i.id).value) || 0;
        updates[i.id + '_stock'] = document.getElementById('stock-' + i.id).classList.contains('in-stock');
    });
    setLoading('saveBtn', true);
    try {
        await setDoc(doc(db, 'prices', 'current'), updates);
        document.getElementById('sok').style.display = '';
        toast('✅ Prices and stock status updated live!', 'success');
        setTimeout(() => {
            document.getElementById('sok').style.display = 'none';
            closeOv('adminOv');
        }, 2000);
    } catch (e) {
        toast('❌ Failed to save.', 'error');
    }
    setLoading('saveBtn', false);
});

document.getElementById('btnSignIn').addEventListener('click', () => openOv('loginOv'));
document.getElementById('btnRegister').addEventListener('click', () => openOv('regOv'));
document.getElementById('goRegister').addEventListener('click', () => {
    closeOv('loginOv');
    openOv('regOv');
});
document.getElementById('closeLogin').addEventListener('click', () => closeOv('loginOv'));
document.getElementById('closeReg').addEventListener('click', () => closeOv('regOv'));
document.getElementById('closeAdminLogin').addEventListener('click', () => closeOv('adminLoginOv'));
document.getElementById('closeAdmin').addEventListener('click', () => closeOv('adminOv'));
document.getElementById('closeAdminPanel').addEventListener('click', () => closeOv('adminOv'));
document.getElementById('fabBtn').addEventListener('click', () => {
    document.getElementById('apw').value = '';
    document.getElementById('aperr').style.display = 'none';
    openOv('adminLoginOv');
    setTimeout(() => document.getElementById('apw').focus(), 150);
});
document.getElementById('at-prices').addEventListener('click', () => switchAdminTab('prices'));
document.getElementById('at-pending').addEventListener('click', () => switchAdminTab('pending'));
document.getElementById('at-members').addEventListener('click', () => switchAdminTab('members'));

const logoSvg = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
<defs>
  <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#C9960C"/><stop offset="50%" stop-color="#F5C518"/><stop offset="100%" stop-color="#C9960C"/></linearGradient>
  <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#D4600A"/><stop offset="100%" stop-color="#F07820"/></linearGradient>
  <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1C0E00"/><stop offset="100%" stop-color="#3D1F00"/></linearGradient>
  <filter id="glow"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<circle cx="40" cy="40" r="38" fill="url(#g3)" stroke="url(#g1)" stroke-width="2.2"/>
<circle cx="40" cy="40" r="32.5" fill="none" stroke="url(#g1)" stroke-width="0.6" stroke-dasharray="3.5 2.2"/>
<g transform="translate(40,42)rotate(-38)"><line x1="0" y1="-19" x2="0" y2="-2" stroke="url(#g1)" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="-3.5" cy="-17" rx="2.8" ry="5.2" fill="url(#g1)" opacity=".85" transform="rotate(-22,-3.5,-17)"/>
  <ellipse cx="3.5" cy="-13.5" rx="2.8" ry="5.2" fill="url(#g1)" opacity=".85" transform="rotate(22,3.5,-13.5)"/>
  <ellipse cx="-2.8" cy="-9.5" rx="2.3" ry="4" fill="url(#g1)" opacity=".65" transform="rotate(-15,-2.8,-9.5)"/></g>
<g transform="translate(40,42)rotate(38)"><line x1="0" y1="-19" x2="0" y2="-2" stroke="url(#g1)" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="-3.5" cy="-17" rx="2.8" ry="5.2" fill="url(#g1)" opacity=".85" transform="rotate(-22,-3.5,-17)"/>
  <ellipse cx="3.5" cy="-13.5" rx="2.8" ry="5.2" fill="url(#g1)" opacity=".85" transform="rotate(22,3.5,-13.5)"/>
  <ellipse cx="-2.8" cy="-9.5" rx="2.3" ry="4" fill="url(#g1)" opacity=".65" transform="rotate(-15,-2.8,-9.5)"/></g>
<path d="M40 22 L53 29.5 L53 46 Q53 57 40 62 Q27 57 27 46 L27 29.5 Z" fill="url(#g2)" stroke="url(#g1)" stroke-width="1.3" filter="url(#glow)"/>
<text x="40" y="48" text-anchor="middle" font-family="Georgia,serif" font-size="19" font-weight="bold" fill="white" filter="url(#glow)">S</text>
<circle cx="27" cy="41" r="1.5" fill="url(#g1)" opacity=".5"/>
<circle cx="53" cy="41" r="1.5" fill="url(#g1)" opacity=".5"/>
<text x="40" y="73.5" text-anchor="middle" font-family="Georgia,serif" font-size="5.8" font-weight="600" fill="#C9960C" letter-spacing="1.5">WHOLESALE</text>
</svg>`;

document.getElementById('logoBox').innerHTML = logoSvg;

async function ensurePricesDoc() {
    const ref = doc(db, 'prices', 'current');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            garlic: 120,
            jute: 45,
            raida: 80,
            methi: 160,
            salt: 12,
            copra: 350,
            updatedAt: new Date().toISOString()
        });
    }
}

ensurePricesDoc();
