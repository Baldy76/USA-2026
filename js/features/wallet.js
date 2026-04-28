
import { getVal, setVal } from '../store.js';

export async function handleFileUpload(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.onload = async (e) => {
        let docs = await getVal('offline_docs') || []; docs.push({ id: Date.now().toString(), name: file.name, type: file.type, data: e.target.result });
        await setVal('offline_docs', docs); renderWallet();
    }; reader.readAsDataURL(file);
}

export async function renderWallet() {
    const docs = await getVal('offline_docs') || []; 
    const gallery = document.getElementById('wallet-gallery'); if(!gallery) return;
    if(docs.length === 0) { gallery.innerHTML = '<div style="grid-column: span 2; opacity:0.5; text-align:center;">No docs yet.</div>'; return; }
    
    gallery.innerHTML = docs.map(doc => {
        const isImg = doc.type.startsWith('image/');
        const linkTag = isImg 
            ? `<a class="wallet-doc-link" data-src="${doc.data}" style="position:absolute; inset:0; z-index:1; cursor:pointer;"></a>`
            : `<a href="${doc.data}" download="${doc.name}" style="position:absolute; inset:0; z-index:1; cursor:pointer;"></a>`;
            
        return `<div class="wallet-item" style="background: ${isImg ? `url(${doc.data})` : 'var(--ios-grey)'}; background-size: cover; background-position: center;">${isImg ? '' : '📄'}<button class="delete-doc-btn" data-id="${doc.id}">×</button>${linkTag}</div>`;
    }).join('');
}

export function openLightbox(src) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    img.style.transform = 'scale(0.95)'; img.src = src;
    modal.style.display = 'flex'; setTimeout(() => { modal.classList.add('active'); img.style.transform = 'scale(1)'; }, 10);
}

export function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); document.getElementById('lightbox-img').src = ''; }, 300);
}
