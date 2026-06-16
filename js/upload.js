/**
 * Shared upload + rendering utilities
 * Depends on: db.js (imageDB), style.css
 */

const CARD_W = 150;
const CARD_H = 164;

/** Resize image to exact dimensions and return base64 data URL */
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CARD_W;
        canvas.height = CARD_H;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Create a DOM element for a single image card */
function createImageCard(imgData, onClick, onDeleteClick) {
  const card = document.createElement('div');
  card.className = 'img-card';
  card.draggable = true;
  card.dataset.id = imgData.id;
  card.dataset.category = imgData.category || '__candidate__';
  card.dataset.tag = imgData.tag || '';

  const img = document.createElement('img');
  img.src = imgData.data;
  img.alt = imgData.name || 'image';
  card.appendChild(img);

  // Tag badge (if tagged)
  if (imgData.tag) {
    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.textContent = imgData.tag;
    card.appendChild(badge);
  }

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '×';
  delBtn.title = '删除';
  delBtn.onclick = (e) => {
    e.stopPropagation();
    if (onDeleteClick) onDeleteClick(imgData.id, card);
  };
  card.appendChild(delBtn);

  // Click handler
  if (onClick) {
    card.addEventListener('click', () => onClick(imgData, card));
  }

  // Drag events
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: imgData.id, category: imgData.category, tag: imgData.tag }));
    card.style.opacity = '0.5';
  });
  card.addEventListener('dragend', (e) => {
    card.style.opacity = '1';
  });

  return card;
}

/** Render images into a container */
function renderImages(container, images, onClick, onDeleteClick) {
  container.innerHTML = '';
  if (images.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.textContent = '拖拽图片到此处 或 从候选区添加';
    container.appendChild(placeholder);
  } else {
    images.forEach(img => {
      container.appendChild(createImageCard(img, onClick, onDeleteClick));
    });
  }
}

/** Setup drop zone: allow images to be dropped here */
function setupDropZone(zone, onDrop) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (onDrop) onDrop(data, zone);
  });
}

/** Setup file input for uploading images */
function setupUpload(inputEl, gameName, onSuccess) {
  inputEl.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const full = await imageDB.isCandidateFull(gameName);
        if (full) {
          alert(`候选区已满 (${MAX_CANDIDATE} 张)，请先移除一些图片`);
          break;
        }
        const dataUrl = await resizeImage(file);
        const id = await imageDB.addImage(gameName, dataUrl, file.name);
        if (onSuccess) onSuccess(id, dataUrl, file.name);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    inputEl.value = '';
  });
}

/** Set category for an image (candidate → specific zone) */
async function moveToCategory(imgId, game, newCategory, onSuccess) {
  if (newCategory !== '__candidate__') {
    const full = await imageDB.isCategoryFull(game, newCategory);
    if (full) {
      alert(`该区域已满 (${MAX_CATEGORY} 张)`);
      return false;
    }
  }
  await imageDB.updateCategory(imgId, newCategory);
  if (onSuccess) onSuccess();
  return true;
}

/** Set tag for an image */
async function setImageTag(imgId, tag, onSuccess) {
  await imageDB.updateTag(imgId, tag);
  if (onSuccess) onSuccess();
}
