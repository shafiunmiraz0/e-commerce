document.addEventListener('DOMContentLoaded', () => {
  const mainImage = document.querySelector('.gallery-main-img');
  if (!mainImage) return;

  const galleryContainer = document.querySelector('.product-gallery');

  const zoomLens = document.createElement('div');
  zoomLens.className = 'zoom-lens';

  const zoomResult = document.createElement('div');
  zoomResult.className = 'zoom-result';

  mainImage.parentElement.appendChild(zoomLens);
  galleryContainer.appendChild(zoomResult);

  mainImage.addEventListener('mousemove', (e) => {
    const rect = mainImage.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    zoomLens.style.left = `${x * 100}%`;
    zoomLens.style.top = `${y * 100}%`;
    zoomLens.style.display = 'block';

    zoomResult.style.display = 'block';
    zoomResult.style.backgroundImage = `url(${mainImage.src})`;
    zoomResult.style.backgroundPosition = `${x * 100}% ${y * 100}%`;
  });

  mainImage.addEventListener('mouseleave', () => {
    zoomLens.style.display = 'none';
    zoomResult.style.display = 'none';
  });

  const thumbnails = document.querySelectorAll('.gallery-thumb');
  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbnails.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      mainImage.src = thumb.dataset.full || thumb.src;
    });
  });

  const lightboxBtn = document.querySelector('.gallery-lightbox-btn');
  if (lightboxBtn) {
    lightboxBtn.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.innerHTML = `
        <div class="lightbox-content">
          <img src="${mainImage.src}" alt="Product">
          <button class="lightbox-close" onclick="this.closest('.lightbox-overlay').remove()">&times;</button>
        </div>
      `;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
      document.body.appendChild(overlay);
    });
  }
});
