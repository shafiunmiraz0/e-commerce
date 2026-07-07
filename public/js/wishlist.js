document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.wishlist-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const productId = btn.dataset.productId;
      const result = await api.post('/api/wishlist/toggle', { product_id: parseInt(productId) });

      if (result.success) {
        const icon = btn.querySelector('i');
        if (result.inWishlist) {
          icon.classList.remove('far');
          icon.classList.add('fas');
          btn.classList.add('active');
        } else {
          icon.classList.remove('fas');
          icon.classList.add('far');
          btn.classList.remove('active');
        }
        updateWishlistBadge(result.count);
        showToast(result.message, 'success');
      } else {
        showToast(result.message || 'Please login to use wishlist', 'error');
      }
    });
  });

  loadWishlistBadge();
});

function updateWishlistBadge(count) {
  let badge = document.querySelector('.wishlist-badge');
  if (!badge) {
    const link = document.querySelector('.wishlist-link');
    if (link) {
      badge = document.createElement('span');
      badge.className = 'wishlist-badge';
      link.appendChild(badge);
    }
  }
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

async function loadWishlistBadge() {
  const result = await api.get('/api/wishlist/count');
  if (result.success) updateWishlistBadge(result.count);
}
