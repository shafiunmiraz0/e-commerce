document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ajax-add-to-cart').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const productId = btn.dataset.productId;
      const quantity = btn.dataset.quantity || 1;

      btn.classList.add('btn-loading');
      btn.disabled = true;

      const result = await api.post('/api/cart/add', { product_id: parseInt(productId), quantity: parseInt(quantity) });

      btn.classList.remove('btn-loading');
      btn.disabled = false;

      if (result.success) {
        showToast(result.message, 'success');
        updateCartBadge(result.cartCount);
      } else {
        showToast(result.message, 'error');
      }
    });
  });

  loadCartBadge();
});

function updateCartBadge(count) {
  let badge = document.querySelector('.cart-badge');
  if (!badge) {
    const cartLink = document.querySelector('.cart-link');
    if (cartLink) {
      badge = document.createElement('span');
      badge.className = 'cart-badge';
      cartLink.appendChild(badge);
    }
  }
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

async function loadCartBadge() {
  const result = await api.get('/api/cart/count');
  if (result.success) updateCartBadge(result.count);
}
