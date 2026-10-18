import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (selector, root = document) => root.querySelector(selector);
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
const notify = (text, kind = '') => { const element = $('#notice'); element.textContent = text; element.className = `notice ${kind}`; element.hidden = false; };
const report = (context, error) => { console.error(context, error); notify(`${context}: ${error.message || 'Beklenmeyen bir hata.'}`, 'error'); };
const loginPanel = $('#login-panel');
const dashboard = $('#dashboard');
let products = [];

function showTab(name) {
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  document.querySelectorAll('.view').forEach((view) => { view.hidden = view.id !== `${name}-view`; });
}
function resetEditor() {
  const form = $('#product-form');
  form.reset();
  form.elements.id.value = '';
  form.elements.active.checked = false;
  form.hidden = true;
}
async function loadProducts() {
  const { data, error } = await supabase.from('products').select('id,name,price,category,stock,active,description,image_url').order('created_at', { ascending: false });
  if (error) return report('Çiçekler yüklenemedi', error);
  products = data;
  const root = $('#products-list');
  root.innerHTML = products.length ? `<table><thead><tr><th>Çiçek</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Yayın</th><th>İşlem</th></tr></thead><tbody>${products.map((item) => `<tr><td>${safe(item.name)}</td><td>${safe(item.category)}</td><td>${money(item.price)}</td><td>${item.stock}</td><td>${item.active ? 'Yayında' : 'Taslak'}</td><td><div class="row-actions"><button data-edit="${item.id}" type="button">Düzenle</button><button class="danger" data-delete="${item.id}" type="button">Sil</button></div></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Henüz ürün eklenmedi.</div>';
  root.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
    const product = products.find((item) => item.id === button.dataset.edit);
    const form = $('#product-form');
    for (const field of ['id', 'name', 'price', 'category', 'stock', 'image_url', 'description']) form.elements[field].value = product[field] ?? '';
    form.elements.active.checked = product.active;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  root.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Bu çiçek kaydını silmek istediğinize emin misiniz?')) return;
    const { error: deleteError } = await supabase.from('products').delete().eq('id', button.dataset.delete);
    if (deleteError) return report('Çiçek silinemedi', deleteError);
    notify('Çiçek silindi.', 'success');
    await loadProducts();
  }));
}
async function loadOrders() {
  const root = $('#orders-list');
  const { data, error } = await supabase.from('orders').select('id,customer_name,email,phone,address,total_amount,status,created_at,order_items(product_name,quantity,unit_price)').order('created_at', { ascending: false });
  if (error) return report('Siparişler yüklenemedi', error);
  if (!data.length) { root.innerHTML = '<div class="empty">Henüz sipariş yok.</div>'; return; }
  root.innerHTML = `<table><thead><tr><th>Sipariş / Müşteri</th><th>Ürünler</th><th>Teslimat adresi</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>${data.map((order) => `<tr><td><strong>${safe(order.id.slice(0, 8).toUpperCase())} · ${safe(order.customer_name)}</strong><br>${safe(order.email)}<br>${safe(order.phone)}<br>${new Date(order.created_at).toLocaleString('tr-TR')}</td><td>${order.order_items.map((item) => `${safe(item.product_name)} × ${item.quantity} (${money(item.unit_price)})`).join('<br>')}</td><td>${safe(order.address)}</td><td>${money(order.total_amount)}</td><td><select data-status="${order.id}" aria-label="Sipariş durumu"><option value="alindi">Alındı</option><option value="hazirlaniyor">Hazırlanıyor</option><option value="kargoda">Yola çıktı</option><option value="tamamlandi">Tamamlandı</option><option value="iptal">İptal</option></select></td></tr>`).join('')}</tbody></table>`;
  root.querySelectorAll('[data-status]').forEach((select) => {
    select.value = data.find((order) => order.id === select.dataset.status).status;
    select.addEventListener('change', async () => {
      const { error: updateError } = await supabase.from('orders').update({ status: select.value }).eq('id', select.dataset.status);
      if (updateError) return report('Sipariş güncellenemedi', updateError);
      notify('Sipariş durumu güncellendi.', 'success');
    });
  });
}
async function loadReviews() {
  const root = $('#reviews-list');
  const { data, error } = await supabase.from('reviews').select('id,rating,body,approved,created_at,products(name)').order('created_at', { ascending: false });
  if (error) return report('Yorumlar yüklenemedi', error);
  if (!data.length) { root.innerHTML = '<div class="empty">Henüz müşteri yorumu yok.</div>'; return; }
  root.innerHTML = `<table><thead><tr><th>Çiçek</th><th>Puan</th><th>Yorum</th><th>Tarih</th><th>Yayın / işlem</th></tr></thead><tbody>${data.map((review) => `<tr><td>${safe(review.products?.name || 'Silinmiş ürün')}</td><td class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</td><td>${safe(review.body)}</td><td>${new Date(review.created_at).toLocaleDateString('tr-TR')}</td><td><div class="row-actions"><span>${review.approved ? 'Yayında' : 'Bekliyor'}</span><button data-approve="${review.id}" data-value="${!review.approved}" type="button">${review.approved ? 'Gizle' : 'Yayımla'}</button><button class="danger" data-review-delete="${review.id}" type="button">Sil</button></div></td></tr>`).join('')}</tbody></table>`;
  root.querySelectorAll('[data-approve]').forEach((button) => button.addEventListener('click', async () => {
    const { error: updateError } = await supabase.from('reviews').update({ approved: button.dataset.value === 'true' }).eq('id', button.dataset.approve);
    if (updateError) return report('Yorum güncellenemedi', updateError);
    await loadReviews();
  }));
  root.querySelectorAll('[data-review-delete]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    const { error: deleteError } = await supabase.from('reviews').delete().eq('id', button.dataset.reviewDelete);
    if (deleteError) return report('Yorum silinemedi', deleteError);
    await loadReviews();
  }));
}
async function enterDashboard(user) {
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (error) return report('Yetki doğrulanamadı', error);
  if (profile?.role !== 'admin') {
    dashboard.hidden = true;
    loginPanel.hidden = false;
    notify('Bu hesap yönetici yetkisine sahip değil.', 'error');
    return;
  }
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await loadProducts();
}
if (!configured) {
  loginPanel.hidden = false;
  notify('Bu ayrı yönetim sitesini Supabase’e bağlamak için supabase-config.js ayarlarını doldurun.', 'error');
} else {
  supabase.auth.getUser().then(({ data, error }) => {
    if (error) return report('Oturum kontrol edilemedi', error);
    if (data.user) return enterDashboard(data.user);
    loginPanel.hidden = false;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) enterDashboard(session.user);
    else { loginPanel.hidden = false; dashboard.hidden = true; }
  });
}
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!configured) return;
  const form = new FormData(event.currentTarget);
  const { error } = await supabase.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) });
  if (error) report('Giriş başarısız', error);
});
$('#sign-out').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) report('Oturum kapatılamadı', error);
});
$('#add-product').addEventListener('click', () => { resetEditor(); $('#product-form').hidden = false; $('#product-form').scrollIntoView({ behavior: 'smooth' }); });
$('#cancel-edit').addEventListener('click', resetEditor);
$('#product-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const payload = {
    name: String(values.get('name')).trim(),
    price: Number(values.get('price')),
    category: String(values.get('category')),
    stock: Number(values.get('stock')),
    image_url: String(values.get('image_url')).trim() || null,
    description: String(values.get('description')).trim(),
    active: form.elements.active.checked
  };
  if (!Number.isFinite(payload.price) || payload.price <= 0 || !Number.isInteger(payload.stock) || payload.stock < 0) return notify('Geçerli bir fiyat ve stok adedi girin.', 'error');
  const id = String(values.get('id'));
  const result = id ? await supabase.from('products').update(payload).eq('id', id) : await supabase.from('products').insert(payload);
  if (result.error) return report('Çiçek kaydedilemedi', result.error);
  resetEditor();
  notify('Çiçek kaydedildi.', 'success');
  await loadProducts();
});
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', async () => {
  showTab(tab.dataset.tab);
  if (tab.dataset.tab === 'orders') await loadOrders();
  if (tab.dataset.tab === 'reviews') await loadReviews();
}));
