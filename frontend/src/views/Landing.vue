<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const openFaq = ref(null);
const clientLinkInput = ref('');
const clientLinkError = ref('');

function goLogin()    { router.push({ name: 'login' }); }
function goAdmin()    { router.push({ name: 'adminLogin' }); }
function goStaff()    { router.push({ name: 'staffLogin' }); }
function goRegister() { router.push({ name: 'register' }); }
function goJoin() { router.push({ name: 'join' }); }
function toggleFaq(i) { openFaq.value = openFaq.value === i ? null : i; }

function mailtoHref() {
  const subject = encodeURIComponent('MediFlow client registration link');
  const body = encodeURIComponent(
    'Hello,\n\nPlease send me the MediFlow client registration link for your pharmacy.\n\nThank you.'
  );
  return 'mailto:?subject=' + subject + '&body=' + body;
}

function openPharmacyClientLink() {
  clientLinkError.value = '';
  const raw = (clientLinkInput.value || '').trim();
  if (!raw) { clientLinkError.value = 'Paste the link your pharmacy gave you.'; return; }
  let slug = raw;
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/\/register-client\/([^/?#]+)/);
    if (m) slug = m[1];
  } catch {
    slug = raw.replace(/^\/+/, '').replace(/^register-client\//, '');
  }
  slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '');
  if (!slug) { clientLinkError.value = "That doesn't look like a valid pharmacy link."; return; }
  router.push({ name: 'registerClient', params: { slug } });
}

const features = [
  { title: 'Real-time stock',    body: 'Every batch you receive is tracked with its own expiry date, cost price and selling price. Stock updates the moment a sale is recorded.' },
  { title: 'Role-based access',  body: 'Three roles — OWNER, PHARMACIST, STAFF. Each sees only what their job requires. Enforced on the server, not just hidden in the UI.' },
  { title: 'Audit trail',        body: 'Every login, sale, patient record and stock movement is written to an audit log with the user, action and timestamp.' },
  { title: 'Expiry alerts',      body: 'The dashboard shows which batches expire in the next 30, 60 or 90 days, so you can sell them in time or write them off cleanly.' },
  { title: 'Patients & prescriptions', body: 'Keep a record of the people who buy from you, their allergies, and the prescriptions they bring. Attach sales to patients when you want to.' },
  { title: 'PostgreSQL-backed',  body: 'All data lives in a real PostgreSQL database — not local files or a browser. You can back it up, restore it, and move it between servers.' }
];

const ownerSteps = [
  { n: '01', title: 'Create your pharmacy', body: 'Click "Register a pharmacy". Enter your name, email, and your pharmacy\'s name. You become the OWNER.' },
  { n: '02', title: 'Add your medicines',   body: 'Medicines page → add each product with name, SKU, category, unit and reorder level.' },
  { n: '03', title: 'Receive stock',        body: 'Inventory page → record each delivery: medicine, batch number, quantity, expiry, cost, selling price.' },
  { n: '04', title: 'Invite your team',     body: 'Users page → create accounts. Each gets a temporary password to change on first login.' },
  { n: '05', title: 'Start selling',        body: 'Sales page → pick a batch, enter quantity, optionally attach a patient. Stock is deducted and logged instantly.' },
  { n: '06', title: 'Watch your dashboard', body: 'Live sales, low stock, near-expiry batches and the last actions your team took.' }
];

const clientSteps = [
  { n: '01', title: 'Get the link',        body: 'Your pharmacy gives you a link that looks like /register-client/their-pharmacy-name.' },
  { n: '02', title: 'Fill in your details', body: 'Open the link, enter your name, phone, and optionally allergies or chronic conditions.' },
  { n: '03', title: "That's it",            body: 'Your record is created. Next time you visit, they find you by name or phone.' }
];

const faqs = [
  { q: 'Do I need to install anything?', a: 'No. MediFlow runs in the browser. Open the link your pharmacy gives you and sign in.' },
  { q: 'How do I create a pharmacy account?', a: 'Click "Register a pharmacy" at the top of this page. Fill in your details and your pharmacy name. You become the OWNER and can invite staff from inside the app.' },
  { q: 'How does my staff get accounts?', a: 'As OWNER, go to Users and click New user. Enter their name, email and role. MediFlow generates a temporary password shown once. They change it on first login.' },
  { q: 'How does a client register?', a: 'The OWNER enables "Allow clients to self-register" in the Pharmacy page and copies the registration link. They share it. Clients fill in the form once.' },
  { q: 'Can staff see the cost prices?', a: 'No. Only OWNER and PHARMACIST can see costs and reports. STAFF records sales against existing batches but cannot see cost, delete medicines, or manage users.' },
  { q: 'What happens when a batch expires?', a: 'MediFlow refuses to sell from an expired batch and lists near-expiry batches on the dashboard.' },
  { q: 'Can I attach a sale to a specific patient?', a: 'Yes. When recording a sale, there is an optional Patient dropdown. Choose one and the sale appears in their purchase history.' },
  { q: 'Where is my data stored?', a: 'In a PostgreSQL database on the server where MediFlow runs. Not in your browser, not shared with anyone else.' },
  { q: 'What if I work at two pharmacies?', a: 'Right now, one account belongs to one pharmacy. Multi-pharmacy access is planned. For now, ask each pharmacy to create their own account for you.' },
  { q: 'Is my data safe if I forget my password?', a: 'If staff forget, the OWNER can reset it from the Users page — a new temporary password is shown once. If the OWNER forgets, whoever installed MediFlow can reset it from the server.' },
  { q: 'How do I back up my data?', a: 'The install comes with a backup script that saves a full copy of the database and all uploaded files. You can schedule it.' },
  { q: 'Can I use MediFlow in Kinyarwanda?', a: 'Not yet. The interface is currently in English.' }
];
</script>

<template>
  <div class="landing">
    <!-- NAV -->
    <header class="landing-nav">
      <div class="brand">
        <span class="brand-mark small">✚</span>
        <div><strong>MediFlow</strong><small>PHARMACY</small></div>
      </div>
      <nav class="nav-links">
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <a href="#register">Get started</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div class="nav-actions">
        <button class="ghost" @click="goRegister">Register</button>
        <button class="primary" @click="goLogin">Sign in</button>
      </div>
    </header>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">PHARMACY OPERATIONS, DONE PROPERLY</p>
        <h1>Run your pharmacy without spreadsheets.</h1>
        <p class="lede">
          MediFlow tracks medicines, batches, expiry dates, patients and sales in one place —
          with real accounts, real roles, and a full audit trail.
        </p>
        <div class="hero-actions">
          <button class="primary large" @click="goRegister">Register a pharmacy</button>
          <button class="secondary large" @click="goLogin">Sign in</button>
          <button class="ghost large" @click="goJoin">Join a pharmacy</button>
        </div>
        <ul class="hero-points">
          <li><span class="dot"></span>PostgreSQL-backed</li>
          <li><span class="dot"></span>Role-aware interface</li>
          <li><span class="dot"></span>Audit trail on every action</li>
        </ul>
      </div>

      <!-- Illustration: inline SVG mockup of the app -->
      <div class="hero-visual">
        <svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" class="mockup" role="img" aria-label="MediFlow dashboard preview">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0f2f43"/><stop offset="100%" stop-color="#0b2231"/>
            </linearGradient>
            <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f5f9fb"/>
            </linearGradient>
            <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0d9c85"/><stop offset="100%" stop-color="#16b8a0"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="520" height="400" rx="16" fill="url(#bg)"/>
          <rect x="0" y="0" width="110" height="400" rx="16" fill="#0a2533"/>
          <rect x="16" y="20" width="24" height="24" rx="6" fill="url(#accent)"/>
          <text x="48" y="37" font-family="Manrope,sans-serif" font-size="11" font-weight="800" fill="#ffffff">MediFlow</text>
          <rect x="16" y="70" width="78" height="22" rx="6" fill="#164658"/>
          <text x="26" y="85" font-family="DM Sans,sans-serif" font-size="10" fill="#ffffff">▦ Dashboard</text>
          <rect x="16" y="98" width="78" height="22" rx="6" fill="#0d3949"/>
          <text x="26" y="113" font-family="DM Sans,sans-serif" font-size="10" fill="#9db4bf">☺ Patients</text>
          <rect x="16" y="126" width="78" height="22" rx="6" fill="#0d3949"/>
          <text x="26" y="141" font-family="DM Sans,sans-serif" font-size="10" fill="#9db4bf">℞ Prescriptions</text>
          <rect x="16" y="154" width="78" height="22" rx="6" fill="#0d3949"/>
          <text x="26" y="169" font-family="DM Sans,sans-serif" font-size="10" fill="#9db4bf">▤ Medicines</text>
          <rect x="16" y="182" width="78" height="22" rx="6" fill="#0d3949"/>
          <text x="26" y="197" font-family="DM Sans,sans-serif" font-size="10" fill="#9db4bf">▣ Inventory</text>
          <rect x="16" y="210" width="78" height="22" rx="6" fill="#0d3949"/>
          <text x="26" y="225" font-family="DM Sans,sans-serif" font-size="10" fill="#9db4bf">↗ Sales</text>
          <rect x="130" y="24" width="115" height="66" rx="10" fill="url(#card)"/>
          <text x="142" y="44" font-family="DM Sans,sans-serif" font-size="8" fill="#7b8d97">TODAY'S SALES</text>
          <text x="142" y="66" font-family="Manrope,sans-serif" font-size="16" font-weight="800" fill="#17384b">128K</text>
          <text x="142" y="80" font-family="DM Sans,sans-serif" font-size="8" fill="#0a927b">▲ 12%</text>
          <rect x="253" y="24" width="115" height="66" rx="10" fill="url(#card)"/>
          <text x="265" y="44" font-family="DM Sans,sans-serif" font-size="8" fill="#7b8d97">MEDICINES</text>
          <text x="265" y="66" font-family="Manrope,sans-serif" font-size="16" font-weight="800" fill="#17384b">46</text>
          <text x="265" y="80" font-family="DM Sans,sans-serif" font-size="8" fill="#94a1a8">in catalogue</text>
          <rect x="376" y="24" width="122" height="66" rx="10" fill="url(#card)"/>
          <text x="388" y="44" font-family="DM Sans,sans-serif" font-size="8" fill="#7b8d97">NEAR EXPIRY</text>
          <text x="388" y="66" font-family="Manrope,sans-serif" font-size="16" font-weight="800" fill="#c74957">7</text>
          <text x="388" y="80" font-family="DM Sans,sans-serif" font-size="8" fill="#94a1a8">next 90 days</text>
          <rect x="130" y="104" width="238" height="150" rx="10" fill="url(#card)"/>
          <text x="142" y="124" font-family="DM Sans,sans-serif" font-size="8" fill="#7b8d97">7-DAY SALES TREND</text>
          <polyline points="142,220 160,200 180,210 200,180 220,190 240,150 260,160 280,135 300,145 320,120 340,130 356,115"
                    fill="none" stroke="#0d9c85" stroke-width="2"/>
          <polygon points="142,220 160,200 180,210 200,180 220,190 240,150 260,160 280,135 300,145 320,120 340,130 356,115 356,240 142,240"
                   fill="rgba(13,156,133,0.12)"/>
          <rect x="376" y="104" width="122" height="150" rx="10" fill="url(#card)"/>
          <text x="388" y="124" font-family="DM Sans,sans-serif" font-size="8" fill="#7b8d97">TOP MEDICINES</text>
          <rect x="388" y="136" width="86" height="10" rx="4" fill="#0d9c85"/>
          <rect x="388" y="152" width="66" height="10" rx="4" fill="#16a085"/>
          <rect x="388" y="168" width="48" height="10" rx="4" fill="#1abc9c"/>
          <rect x="388" y="184" width="36" height="10" rx="4" fill="#48c9b0"/>
          <rect x="388" y="200" width="24" height="10" rx="4" fill="#a3e4d7"/>
          <rect x="130" y="266" width="368" height="112" rx="10" fill="url(#card)"/>
          <text x="142" y="286" font-family="DM Sans,sans-serif" font-size="8" fill="#7b8d97">LIVE ACTIVITY</text>
          <circle cx="150" cy="304" r="7" fill="#e2f7ed"/>
          <text x="150" y="307" font-family="DM Sans,sans-serif" font-size="8" fill="#0a927b" text-anchor="middle">↗</text>
          <rect x="166" y="298" width="140" height="6" rx="3" fill="#e2eaed"/>
          <rect x="166" y="308" width="80" height="4" rx="2" fill="#eef4f6"/>
          <circle cx="150" cy="330" r="7" fill="#eef7ff"/>
          <text x="150" y="333" font-family="DM Sans,sans-serif" font-size="8" fill="#1c7ed6" text-anchor="middle">＋</text>
          <rect x="166" y="324" width="120" height="6" rx="3" fill="#e2eaed"/>
          <rect x="166" y="334" width="70" height="4" rx="2" fill="#eef4f6"/>
          <circle cx="150" cy="356" r="7" fill="#fff4db"/>
          <text x="150" y="359" font-family="DM Sans,sans-serif" font-size="8" fill="#a9791b" text-anchor="middle">⬇</text>
          <rect x="166" y="350" width="100" height="6" rx="3" fill="#e2eaed"/>
          <rect x="166" y="360" width="60" height="4" rx="2" fill="#eef4f6"/>
        </svg>
      </div>
    </section>

    <!-- TWO ENTRY PORTALS -->
    <section class="portals">
      <div class="portal-card admin">
        <div class="portal-badge admin">PHARMACY OWNER</div>
        <h3>Admin portal</h3>
        <p>Full control: revenue, staff approvals, insurance claims, reports, catalogue, settings.</p>
        <ul>
          <li>See every sale across your pharmacy</li>
          <li>Approve new staff requests</li>
          <li>Track what insurers owe you</li>
          <li>Manage pricing, stock and reports</li>
        </ul>
        <button class="primary large" @click="goAdmin">Open admin portal →</button>
      </div>

      <div class="portal-card staff">
        <div class="portal-badge staff">COUNTER STAFF</div>
        <h3>Staff portal</h3>
        <p>Everything a sales attendant needs — nothing they don't.</p>
        <ul>
          <li>Record a sale in seconds</li>
          <li>Look up a patient by name or phone</li>
          <li>Check which medicines are out of stock</li>
          <li>See your own sales for the day</li>
        </ul>
        <button class="staff-btn large" @click="goStaff">Open staff portal →</button>
      </div>
    </section>

    <!-- STATS -->
    <section class="stats">
      <div class="stat"><div class="stat-value">3</div><div class="stat-label">User roles</div></div>
      <div class="stat"><div class="stat-value">90d</div><div class="stat-label">Expiry horizon</div></div>
      <div class="stat"><div class="stat-value">100%</div><div class="stat-label">Actions audited</div></div>
      <div class="stat"><div class="stat-value">0</div><div class="stat-label">Demo data</div></div>
    </section>

    <!-- FEATURES -->
    <section id="features" class="features">
      <div class="section-head">
        <h2>What you get</h2>
        <p class="section-sub">Everything a small pharmacy actually needs.</p>
      </div>
      <div class="feature-grid">
        <article v-for="f in features" :key="f.title" class="feature">
          <h3>{{ f.title }}</h3>
          <p>{{ f.body }}</p>
        </article>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how" class="how">
      <div class="section-head">
        <h2>How it works</h2>
        <p class="section-sub">Two paths. Pick the one that matches who you are.</p>
      </div>
      <div class="how-columns">
        <div class="how-col">
          <div class="how-col-head">
            <span class="how-col-badge">For pharmacies</span>
            <h3>Setting up your pharmacy</h3>
            <p class="muted">Six steps from new account to first recorded sale.</p>
          </div>
          <ol class="how-list">
            <li v-for="s in ownerSteps" :key="s.n" class="how-item">
              <span class="how-num">{{ s.n }}</span>
              <div><h4>{{ s.title }}</h4><p>{{ s.body }}</p></div>
            </li>
          </ol>
          <div class="how-cta">
            <button class="primary" @click="goRegister">Register a pharmacy →</button>
          </div>
        </div>
        <div class="how-col client">
          <div class="how-col-head">
            <span class="how-col-badge alt">For pharmacy clients</span>
            <h3>Registering as a client</h3>
            <p class="muted">No account needed — just a record at your pharmacy.</p>
          </div>
          <ol class="how-list">
            <li v-for="s in clientSteps" :key="s.n" class="how-item">
              <span class="how-num">{{ s.n }}</span>
              <div><h4>{{ s.title }}</h4><p>{{ s.body }}</p></div>
            </li>
          </ol>
          <div class="how-note">
            <strong>Note:</strong> Only your pharmacy can give you this link. If you don't have one,
            <a :href="mailtoHref()">email your pharmacy administrator</a> or use the form in
            <a href="#register">Get started</a> below.
          </div>
        </div>
      </div>
    </section>

    <!-- GET STARTED -->
    <section id="register" class="get-started">
      <div class="section-head">
        <h2>Get started</h2>
        <p class="section-sub">Choose how you want to begin.</p>
      </div>
      <div class="start-grid">
        <article class="start-card primary-card">
          <div class="start-badge">For pharmacies</div>
          <h3>Register a new pharmacy</h3>
          <p>
            Create your own MediFlow workspace. You will be the OWNER of that pharmacy.
            Add your medicines, invite your staff, and start recording sales the same day.
          </p>
          <ul class="start-list">
            <li>Free to set up</li>
            <li>Invite unlimited staff (roles enforced)</li>
            <li>Patient records and prescriptions included</li>
          </ul>
          <button class="primary large" @click="goRegister">Register a pharmacy</button>
        </article>
        <article class="start-card">
          <div class="start-badge alt">For pharmacy clients</div>
          <h3>Register as a client</h3>
          <p>
            You are a customer of a pharmacy that already uses MediFlow. Ask them for the
            registration link, then paste it below.
          </p>
          <div class="client-link-block">
            <label class="client-link-label" for="pharmacy-link">Paste the link your pharmacy gave you</label>
            <div class="client-link-row">
              <input
                id="pharmacy-link"
                v-model="clientLinkInput"
                type="text"
                placeholder="https://mediflow.rw/register-client/kigali-pharmacy"
                @keyup.enter="openPharmacyClientLink"
              >
              <button class="primary" type="button" @click="openPharmacyClientLink">Open</button>
            </div>
            <p v-if="clientLinkError" class="client-link-error">{{ clientLinkError }}</p>
            <p class="client-link-help">
              Don't have a link? Ask your pharmacy by phone or in person — only they can enable
              online client registration.
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- SCREENSHOTS -->
    <section class="screens">
      <div class="section-head">
        <h2>What the app looks like</h2>
        <p class="section-sub">Real UI — no placeholder data.</p>
      </div>
      <div class="screens-grid">
        <figure class="shot">
          <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dashboard preview">
            <rect width="400" height="240" rx="10" fill="#f5f8fa"/>
            <rect x="0" y="0" width="80" height="240" fill="#0f2f43"/>
            <rect x="12" y="14" width="18" height="18" rx="5" fill="#0d9c85"/>
            <rect x="12" y="52" width="56" height="14" rx="4" fill="#164658"/>
            <rect x="12" y="72" width="56" height="14" rx="4" fill="#0d3949"/>
            <rect x="12" y="92" width="56" height="14" rx="4" fill="#0d3949"/>
            <rect x="12" y="112" width="56" height="14" rx="4" fill="#0d3949"/>
            <rect x="94" y="14" width="90" height="50" rx="6" fill="#ffffff"/>
            <rect x="194" y="14" width="90" height="50" rx="6" fill="#ffffff"/>
            <rect x="294" y="14" width="90" height="50" rx="6" fill="#ffffff"/>
            <rect x="94" y="76" width="180" height="100" rx="6" fill="#ffffff"/>
            <rect x="284" y="76" width="100" height="100" rx="6" fill="#ffffff"/>
            <polyline points="104,150 120,140 140,144 160,124 180,132 200,110 220,118 240,98 260,104" fill="none" stroke="#0d9c85" stroke-width="2"/>
            <rect x="94" y="186" width="290" height="40" rx="6" fill="#ffffff"/>
          </svg>
          <figcaption>Dashboard with KPIs, sales trend and activity feed</figcaption>
        </figure>
        <figure class="shot">
          <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Inventory preview">
            <rect width="400" height="240" rx="10" fill="#f5f8fa"/>
            <rect x="16" y="16" width="368" height="30" rx="6" fill="#ffffff"/>
            <rect x="16" y="56" width="368" height="26" rx="4" fill="#f0f5f7"/>
            <rect x="16" y="88" width="368" height="22" rx="3" fill="#ffffff"/>
            <rect x="16" y="114" width="368" height="22" rx="3" fill="#ffffff"/>
            <rect x="16" y="140" width="368" height="22" rx="3" fill="#ffffff"/>
            <rect x="24" y="94" width="90" height="10" rx="3" fill="#c8d4da"/>
            <rect x="130" y="94" width="60" height="10" rx="3" fill="#c8d4da"/>
            <rect x="200" y="94" width="40" height="10" rx="3" fill="#c8d4da"/>
            <rect x="250" y="94" width="70" height="10" rx="3" fill="#c8d4da"/>
            <rect x="330" y="92" width="46" height="14" rx="4" fill="#e2f7ed"/>
            <rect x="24" y="120" width="100" height="10" rx="3" fill="#c8d4da"/>
            <rect x="330" y="118" width="46" height="14" rx="4" fill="#fff4db"/>
            <rect x="24" y="146" width="90" height="10" rx="3" fill="#c8d4da"/>
            <rect x="330" y="144" width="46" height="14" rx="4" fill="#e2f7ed"/>
          </svg>
          <figcaption>Inventory with per-batch expiry status</figcaption>
        </figure>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="faq">
      <div class="section-head">
        <h2>Frequently asked questions</h2>
        <p class="section-sub">Straight answers.</p>
      </div>
      <div class="faq-list">
        <div v-for="(f, i) in faqs" :key="i" class="faq-item" :class="{ open: openFaq === i }">
          <button class="faq-q" @click="toggleFaq(i)">
            <span>{{ f.q }}</span>
            <span class="faq-chevron">{{ openFaq === i ? '−' : '+' }}</span>
          </button>
          <div v-if="openFaq === i" class="faq-a">{{ f.a }}</div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <div class="cta-inner">
        <h2>Ready to run your pharmacy on MediFlow?</h2>
        <p>Create a pharmacy account, or sign in if your pharmacy already uses MediFlow.</p>
        <div class="cta-actions">
          <button class="primary large" @click="goRegister">Register a pharmacy</button>
          <button class="cta-ghost large" @click="goLogin">Sign in</button>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="landing-footer">
      <div class="footer-cols">
        <div class="footer-col">
          <div class="brand">
            <span class="brand-mark small">✚</span>
            <div><strong>MediFlow</strong><small>PHARMACY</small></div>
          </div>
          <p class="footer-note">Pharmacy operations, done properly.</p>
        </div>
        <div class="footer-col">
          <h5>Product</h5>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#register">Get started</a>
        </div>
        <div class="footer-col">
          <h5>Support</h5>
          <a href="#faq">FAQ</a>
          <a href="#how">How to register</a>
          <a :href="mailtoHref()">Contact your administrator</a>
        </div>
        <div class="footer-col">
          <h5>Built with</h5>
          <span>PostgreSQL 16</span>
          <span>Node.js 20</span>
          <span>Vue 3</span>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} MediFlow Pharmacy</span>
        <span>All data stored in PostgreSQL</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing { min-height: 100vh; background: linear-gradient(180deg, #f5f8fa 0%, #eef4f6 100%); color: #1c3a4c; }

/* NAV */
.landing-nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 48px; max-width: 1200px; margin: 0 auto; gap: 20px; }
.brand { display: flex; align-items: center; gap: 10px; color: #142f43; }
.brand strong { display: block; font: 800 16px Manrope, sans-serif; letter-spacing: -0.5px; }
.brand small { font-size: 9px; letter-spacing: 2px; color: #6c8290; }
.nav-links { display: flex; gap: 24px; }
.nav-links a { color: #465a67; font-size: 13px; text-decoration: none; font-weight: 600; }
.nav-links a:hover { color: #078c78; }
.nav-actions { display: flex; gap: 8px; }

/* HERO */
.hero { max-width: 1200px; margin: 40px auto; padding: 0 48px; display: grid; grid-template-columns: 1fr 1.05fr; gap: 48px; align-items: center; }
.hero-copy { max-width: 560px; }
.eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #0a927b; margin: 0 0 14px; }
.hero h1 { font: 800 48px/1.08 Manrope, sans-serif; color: #142f43; margin: 0 0 18px; letter-spacing: -1.2px; }
.lede { font-size: 17px; line-height: 1.6; color: #4a5c68; margin: 0 0 26px; }
.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
.hero-points { list-style: none; margin: 0; padding: 0; display: flex; gap: 18px; flex-wrap: wrap; }
.hero-points li { font-size: 12px; color: #4a5c68; display: inline-flex; align-items: center; gap: 6px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #0d9c85; display: inline-block; }
.hero-visual { position: relative; }
.mockup { width: 100%; height: auto; filter: drop-shadow(0 30px 60px rgba(15, 47, 67, 0.22)); }

/* STATS */
.stats { max-width: 1200px; margin: 0 auto; padding: 22px 48px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #ffffff; border-top: 1px solid #e5ecef; border-bottom: 1px solid #e5ecef; }
.stat { text-align: center; padding: 8px 0; }
.stat-value { font: 800 26px Manrope, sans-serif; color: #0a927b; letter-spacing: -0.5px; }
.stat-label { font-size: 11px; color: #6c8290; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

/* Sections */
.section-head { text-align: center; margin-bottom: 40px; }
.section-head h2 { font: 800 30px Manrope, sans-serif; color: #142f43; margin: 0 0 10px; letter-spacing: -0.6px; }
.section-sub { color: #5a6c78; font-size: 14px; margin: 0; }

/* Features */
.features { max-width: 1100px; margin: 0 auto; padding: 70px 24px; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
.feature { background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 24px; }
.feature h3 { font: 700 15px Manrope, sans-serif; color: #17384b; margin: 0 0 8px; }
.feature p { font-size: 13px; line-height: 1.6; color: #5a6c78; margin: 0; }

/* How it works */
.how { max-width: 1100px; margin: 0 auto; padding: 20px 24px 70px; }
.how-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.how-col { background: #fff; border: 1px solid #e5ecef; border-radius: 16px; padding: 28px; display: flex; flex-direction: column; }
.how-col.client { background: #f9fcfb; }
.how-col-head { margin-bottom: 20px; }
.how-col-badge { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: #0a927b; background: #e2f7ed; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; }
.how-col-badge.alt { background: #eef7ff; color: #1864ab; }
.how-col h3 { font: 800 20px Manrope, sans-serif; color: #142f43; margin: 0 0 6px; }
.how-col .muted { color: #7d8e99; font-size: 13px; margin: 0; }
.how-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; flex: 1; }
.how-item { display: flex; gap: 16px; align-items: flex-start; }
.how-num { font: 800 20px Manrope, sans-serif; color: #cfebe4; flex-shrink: 0; width: 40px; }
.how-item h4 { font: 700 14px Manrope, sans-serif; color: #17384b; margin: 0 0 4px; }
.how-item p { font-size: 13px; color: #5a6c78; line-height: 1.55; margin: 0; }
.how-cta { margin-top: 24px; }
.how-note { margin-top: 20px; padding: 14px; background: #fff; border: 1px solid #e5ecef; border-radius: 10px; font-size: 12px; color: #4a5c68; line-height: 1.55; }
.how-note a { color: #078c78; font-weight: 700; text-decoration: none; }

/* Get started */
.get-started { max-width: 1100px; margin: 0 auto; padding: 40px 24px 70px; }
.start-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.start-card { background: #fff; border: 1px solid #e5ecef; border-radius: 16px; padding: 30px; display: flex; flex-direction: column; gap: 14px; }
.start-card.primary-card { border-color: #cceee1; box-shadow: 0 12px 40px rgba(13, 156, 133, 0.08); }
.start-badge { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: #0a927b; background: #e2f7ed; padding: 4px 10px; border-radius: 20px; width: fit-content; }
.start-badge.alt { background: #eef7ff; color: #1864ab; }
.start-card h3 { font: 800 20px Manrope, sans-serif; color: #17384b; margin: 0; }
.start-card p { font-size: 13px; color: #5a6c78; line-height: 1.6; margin: 0; }
.start-list { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 6px; }
.start-list li { font-size: 13px; color: #4a5c68; padding-left: 20px; position: relative; }
.start-list li::before { content: '✓'; position: absolute; left: 0; color: #0a927b; font-weight: 700; }
.start-card .primary { align-self: flex-start; }

/* Client link widget */
.client-link-block { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.client-link-label { font-size: 12px; font-weight: 700; color: #354a58; }
.client-link-row { display: flex; gap: 8px; }
.client-link-row input { flex: 1; padding: 11px 13px; border: 1px solid #dce5e9; border-radius: 10px; font-size: 13px; font-family: ui-monospace, Menlo, monospace; }
.client-link-row input:focus { outline: none; border-color: #0d9c85; box-shadow: 0 0 0 3px rgba(13,156,133,0.08); }
.client-link-error { font-size: 12px; color: #c43c4c; margin: 0; }
.client-link-help { font-size: 12px; color: #94a1a8; margin: 4px 0 0; line-height: 1.55; }

/* Screens */
.screens { max-width: 1100px; margin: 0 auto; padding: 40px 24px 70px; }
.screens-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.shot { margin: 0; background: #fff; border: 1px solid #e5ecef; border-radius: 14px; padding: 14px; box-shadow: 0 20px 50px rgba(15, 47, 67, 0.06); }
.shot svg { width: 100%; height: auto; border-radius: 8px; display: block; }
.shot figcaption { font-size: 12px; color: #6c8290; text-align: center; padding-top: 10px; }

/* FAQ */
.faq { max-width: 780px; margin: 0 auto; padding: 40px 24px 70px; }
.faq-list { display: flex; flex-direction: column; gap: 10px; }
.faq-item { background: #fff; border: 1px solid #e5ecef; border-radius: 12px; overflow: hidden; }
.faq-item.open { border-color: #cceee1; }
.faq-q { display: flex; justify-content: space-between; align-items: center; width: 100%; border: 0; background: transparent; padding: 16px 20px; font-size: 14px; font-weight: 600; color: #1c3a4c; cursor: pointer; text-align: left; font-family: inherit; }
.faq-chevron { color: #0a927b; font-size: 20px; flex-shrink: 0; margin-left: 12px; }
.faq-a { padding: 0 20px 18px; font-size: 13px; color: #5a6c78; line-height: 1.65; }

/* CTA */
.cta { max-width: 1100px; margin: 0 auto; padding: 20px 24px 70px; }
.cta-inner { background: linear-gradient(135deg, #078c78, #0d9c85); color: #fff; border-radius: 18px; padding: 44px 32px; text-align: center; }
.cta-inner h2 { font: 800 26px Manrope, sans-serif; margin: 0 0 10px; letter-spacing: -0.4px; }
.cta-inner p { font-size: 14px; opacity: 0.9; margin: 0 0 22px; }
.cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.cta .primary { background: #fff; color: #078c78; }
.cta .primary:hover { background: #f0f5f3; }
.cta-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.6); border-radius: 10px; padding: 14px 22px; font-size: 14px; font-weight: 700; cursor: pointer; }
.cta-ghost:hover { background: rgba(255,255,255,0.12); }

/* Footer */
.landing-footer { border-top: 1px solid #e5ecef; background: #fff; padding: 40px 48px 24px; color: #5a6c78; }
.footer-cols { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 30px; max-width: 1200px; margin: 0 auto; }
.footer-col { display: flex; flex-direction: column; gap: 8px; }
.footer-col h5 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a1a8; margin: 0 0 6px; }
.footer-col a, .footer-col span { color: #4a5c68; font-size: 13px; text-decoration: none; }
.footer-col a:hover { color: #078c78; }
.footer-note { font-size: 12px; color: #94a1a8; margin: 8px 0 0; }
.footer-bottom { display: flex; justify-content: space-between; max-width: 1200px; margin: 30px auto 0; padding-top: 20px; border-top: 1px solid #eef4f6; font-size: 12px; color: #94a1a8; }

/* Buttons */
.primary { border: 0; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 700; background: #078c78; color: #fff; cursor: pointer; font-family: inherit; }
.primary:hover { background: #067563; }
.secondary { border: 1px solid #d3ebe4; background: #e9f5f2; color: #087b6b; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.secondary:hover { background: #d9ede8; }
.ghost { background: transparent; color: #078c78; border: 1px solid #cceee1; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.ghost:hover { background: #eefaf6; }
.large { padding: 14px 22px; font-size: 14px; }

section[id] { scroll-margin-top: 24px; }

@media (max-width: 960px) {
  .hero { grid-template-columns: 1fr; padding: 0 24px; }
  .hero h1 { font-size: 36px; }
  .stats { grid-template-columns: repeat(2, 1fr); }
  .how-columns { grid-template-columns: 1fr; }
  .start-grid { grid-template-columns: 1fr; }
  .screens-grid { grid-template-columns: 1fr; }
  .footer-cols { grid-template-columns: 1fr 1fr; }
  .nav-links { display: none; }
  .landing-nav, .landing-footer { padding: 16px 20px; }
}
.portals { max-width: 1100px; margin: 50px auto 20px; padding: 0 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.portal-card { background: #fff; border: 1px solid #e5ecef; border-radius: 18px; padding: 32px; display: flex; flex-direction: column; gap: 14px; }
.portal-card.admin { border-top: 5px solid #078c78; }
.portal-card.staff { border-top: 5px solid #f0a14b; }
.portal-badge { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1.6px; padding: 5px 12px; border-radius: 20px; width: fit-content; }
.portal-badge.admin { background: #e2f7ed; color: #07836c; }
.portal-badge.staff { background: #fff4db; color: #a9791b; }
.portal-card h3 { font: 800 22px Manrope, sans-serif; color: #142f43; margin: 0; }
.portal-card p { font-size: 13px; color: #5a6c78; margin: 0; line-height: 1.55; }
.portal-card ul { list-style: none; padding: 0; margin: 4px 0 8px; display: flex; flex-direction: column; gap: 6px; }
.portal-card li { font-size: 13px; color: #4a5c68; padding-left: 20px; position: relative; }
.portal-card li::before { content: '✓'; position: absolute; left: 0; color: #078c78; font-weight: 700; }
.portal-card.staff li::before { color: #d58430; }
.staff-btn { border: 0; border-radius: 10px; padding: 14px 22px; font-size: 14px; font-weight: 700; background: #f0a14b; color: #fff; cursor: pointer; font-family: inherit; }
.staff-btn:hover { background: #d58430; }
@media (max-width: 900px) { .portals { grid-template-columns: 1fr; } }
</style>
