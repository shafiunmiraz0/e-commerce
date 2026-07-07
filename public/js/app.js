document.addEventListener('DOMContentLoaded', () => {
  // Auto-dismiss alerts after 5 seconds
  document.querySelectorAll('.alert').forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });

  // Lazy image fade-in
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    img.addEventListener('load', function() {
      this.style.opacity = '1';
    });
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.4s ease';
  });

  // ── Mobile drawer navigation ──
  const drawerOverlay = document.getElementById('mobile-drawer-overlay');
  const drawer = document.getElementById('mobile-drawer');
  const mobileBtns = document.querySelectorAll('.mobile-menu-btn');
  function openDrawer() {
    if (drawerOverlay) drawerOverlay.classList.add('active');
    if (drawer) drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
  }
  mobileBtns.forEach(btn => btn.addEventListener('click', openDrawer));
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
  document.querySelectorAll('.mobile-drawer-close').forEach(btn =>
    btn.addEventListener('click', closeDrawer)
  );

  // ── Scroll reveal (entrance animations) ──
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ── Page transition on link clicks ──
  const overlay = document.getElementById('page-transition');
  document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        this.target === '_blank' ||
        e.ctrlKey || e.metaKey || e.shiftKey
      ) return;
      if (href === window.location.pathname + window.location.search) return;
      if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => { window.location.href = href; }, 200);
        e.preventDefault();
      }
    });
  });
  if (overlay) overlay.classList.remove('active');

  // ── Back to top button ──
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Product card quick-add (hover overlay) ──
  document.addEventListener('click', async (e) => {
    const quickBtn = e.target.closest('.card-quick-add');
    if (!quickBtn) return;
    e.preventDefault();
    const productId = quickBtn.dataset.productId;
    if (!productId) return;
    quickBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    quickBtn.disabled = true;
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ product_id: parseInt(productId), quantity: 1 })
      });
      const data = await res.json();
      if (data.success) {
        const badge = document.getElementById('cart-count');
        if (badge) { badge.textContent = data.cartCount; badge.style.display = 'flex'; }
        if (typeof showToast === 'function') showToast('Added to cart!', 'success');
        quickBtn.innerHTML = '<i class="fas fa-check"></i> Added';
        setTimeout(() => {
          quickBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add';
          quickBtn.disabled = false;
        }, 1500);
      } else {
        if (typeof showToast === 'function') showToast(data.message || 'Could not add to cart', 'error');
        quickBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add';
        quickBtn.disabled = false;
      }
    } catch {
      if (typeof showToast === 'function') showToast('Network error', 'error');
      quickBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add';
      quickBtn.disabled = false;
    }
  });

  // ── Skeleton loader helper (exposed globally) ──
  window.createSkeletonCards = function(count, target) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width:80%"></div>
          <div class="skeleton skeleton-text-sm"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>`;
    }
    if (target) target.innerHTML = html;
    return html;
  };
});
