document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.search-bar input');
  if (!searchInput) return;

  let dropdown = document.querySelector('.search-autocomplete');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'search-autocomplete';
    searchInput.parentElement.appendChild(dropdown);
  }

  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();

    if (q.length < 2) {
      dropdown.classList.remove('show');
      return;
    }

    debounceTimer = setTimeout(async () => {
      const result = await api.get(`/api/search?q=${encodeURIComponent(q)}`);
      if (result.success && result.results.length > 0) {
        dropdown.innerHTML = result.results.map(p => `
          <a href="/product/${p.slug}" class="search-result-item">
            <img src="${p.image}" alt="${p.name}" class="search-result-img">
            <div class="search-result-info">
              <div class="search-result-name">${p.name}</div>
              <div class="search-result-price">$${parseFloat(p.price).toFixed(2)}</div>
            </div>
            ${p.original_price ? `<span class="search-result-discount">-${Math.round((1 - p.price / p.original_price) * 100)}%</span>` : ''}
          </a>
        `).join('') + `<a href="/products?search=${encodeURIComponent(q)}" class="search-result-all">View all results for "${q}"</a>`;
        dropdown.classList.add('show');
      } else {
        dropdown.innerHTML = `<div class="search-no-results">No products found</div>`;
        dropdown.classList.add('show');
      }
    }, 300);
  });

  searchInput.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.search-result-item');
    const active = dropdown.querySelector('.search-result-item.active');
    let index = Array.from(items).indexOf(active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      index = (index + 1) % items.length;
      items[index]?.classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      index = (index - 1 + items.length) % items.length;
      items[index]?.classList.add('active');
    } else if (e.key === 'Enter' && active) {
      e.preventDefault();
      window.location.href = active.href;
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('show');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
      dropdown.classList.remove('show');
    }
  });

  searchInput.addEventListener('focus', () => {
    if (dropdown.innerHTML.trim()) dropdown.classList.add('show');
  });
});
