(() => {
    'use strict';

    /* ============ CONFIG ============ */
    // wa.me exige formato internacional sin "+": código de país 1 (RD) + 829 + número.
    const WHATSAPP_NUMBER = '18299371403';
    const STORAGE_KEY = 'cozzu_cart_v2';

    // Datos bancarios (configurables): edita solo este bloque.
    const BANK_INFO = {
        bank:    'Banco Popular',            // Banco Popular / Banreservas / BHD
        type:    'Ahorros',                  // Corriente / Ahorros
        number:  '[Insertar número de cuenta]',
        holder:  'Anayelis Méndez (Cozzu Fast Food)'
    };
    const PAY_CASH = 'Efectivo al recibir';
    const PAY_TRANSFER = 'Transferencia Bancaria';

    // Imagen de respaldo (SVG embebido: no depende de ningún servidor externo)
    const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#E52E2E"/>' +
        '<text x="200" y="150" font-size="72" text-anchor="middle">🌭</text>' +
        '<text x="200" y="215" font-size="24" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle">Cozzu Fast Food</text></svg>');

    /* ============ DATOS DEL MENÚ ============ */
    const menuItems = [
        { id:'clasica', name:'Banderilla Clásica', category:'clasica', desc:'Simple y tradicional, con la masa dorada de siempre.', fillings:[{name:'Salchicha',price:150},{name:'Queso mozzarella',price:200},{name:'Mixta (queso + salchicha)',price:200}], tag:'Tradicional', badgeColor:'bg-stone-800', image:'assets/clasica.jpg' },
        { id:'papa', name:'Cubierta de Papa', category:'crunch', desc:'Cubierta de papa crujiente. Sabor clásico con papas.', fillings:[{name:'Salchicha',price:175},{name:'Queso mozzarella',price:225},{name:'Mixto (queso + salchicha)',price:225}], tag:'Papa', badgeColor:'bg-brand-orange', image:'assets/papa.jpg' },
        { id:'ramen', name:'Cubierta de Ramen', category:'crunch', desc:'Crujiente cubierta de ramen.', fillings:[{name:'Salchicha',price:175},{name:'Queso mozzarella',price:225},{name:'Mixto (queso + salchicha)',price:225}], tag:'Ramen', badgeColor:'bg-amber-600', image:'assets/ramen.jpg' },
        { id:'flamin', name:'Cubierta de Cheetos Flamin Hot', category:'crunch', desc:'Spicy Cheetos por fuera, para quien le gusta el picante.', fillings:[{name:'Salchicha',price:175},{name:'Queso mozzarella',price:225},{name:'Mixto (queso + salchicha)',price:225}], tag:'🔥 Spicy', badgeColor:'bg-brand-red', image:'assets/flamin.jpg' },
        { id:'cheetos', name:'Cubierta de Cheetos Queso', category:'crunch', desc:'Cubierta de Cheetos de queso, crujiente y con mucho sabor.', fillings:[{name:'Salchicha',price:175},{name:'Queso mozzarella',price:225},{name:'Mixto (queso + salchicha)',price:225}], tag:'Cheetos', badgeColor:'bg-brand-yellow text-brand-dark', image:'assets/cheetos.jpg' },
        { id:'pollo', name:'Cozzu Chicken - Clásica de pollo', category:'pollo', desc:'Nuestra banderilla de pollo con cubierta crujiente.', fillings:[{name:'Clásica de pollo',price:300}], tag:'Pollo', badgeColor:'bg-emerald-600', image:'assets/pollo.jpg' }
    ];

    /* ============ ESTADO ============ */
    let cart = loadCart();            // [{id, name, price, filling, qty}]
    let activeFilter = 'all';
    const chosenFilling = {};         // relleno elegido por producto (se conserva al filtrar)

    /* ============ UTILIDADES ============ */
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const money = n => 'RD$ ' + n.toLocaleString('es-DO');
    const oneLine = s => s.replace(/\s+/g, ' ').trim();

    function loadCart() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            // Revalida contra el menú: el precio siempre sale del menú actual
            return data.map(c => ({ ...c, price: priceOf(c.id, c.filling) }))
                       .filter(c => c.price && c.qty > 0);
        } catch { return []; }
    }
    function priceOf(id, filling) {
        const item = menuItems.find(m => m.id === id);
        const f = item && item.fillings.find(x => x.name === filling);
        return f ? f.price : 0;
    }
    function saveCart() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* modo privado: se ignora */ }
    }

    let toastTimer;
    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    }

    /* ============ IMÁGENES: fallback + fade ============ */
    function useFallback(img) {
        if (img.dataset.fb) return;           // evita bucles si el respaldo también fallara
        img.dataset.fb = '1';
        img.src = FALLBACK_IMG;
    }
    // 'error' no burbujea: se captura a nivel de documento
    document.addEventListener('error', e => { if (e.target.tagName === 'IMG') useFallback(e.target); }, true);

    /* ============ MENÚ ============ */
    function renderMenu() {
        const grid = $('#menuGrid');
        const items = activeFilter === 'all' ? menuItems : menuItems.filter(i => i.category === activeFilter);
        grid.innerHTML = '';

        items.forEach(item => {
            const selected = chosenFilling[item.id] || item.fillings[0].name;
            const card = document.createElement('article');
            card.className = 'min-w-0 bg-white rounded-3xl border border-stone-200/80 shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col justify-between group';
            card.innerHTML = `
                <div>
                    <div class="relative aspect-[4/3] overflow-hidden bg-stone-100">
                        <img alt="${item.name}" loading="lazy" decoding="async"
                             class="img-fade w-full h-full object-cover group-hover:scale-105">
                        <span class="absolute top-3 right-3 ${item.badgeColor} text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">${item.tag}</span>
                    </div>
                    <div class="p-5 space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <h3 class="font-heading text-lg font-bold text-brand-dark leading-snug min-w-0">${item.name}</h3>
                            <span class="font-heading text-lg font-bold text-brand-red whitespace-nowrap" id="price-${item.id}">${money(priceOf(item.id, selected))}</span>
                        </div>
                        <p class="text-xs text-stone-500 leading-relaxed">${item.desc}</p>
                        <div class="pt-2">
                            <label for="filling-${item.id}" class="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">Relleno:</label>
                            <select id="filling-${item.id}" data-filling="${item.id}"
                                    class="w-full text-base sm:text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-red">
                                ${item.fillings.map(f => `<option value="${f.name}" ${f.name === selected ? 'selected' : ''}>${f.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="p-5 pt-0">
                    <button type="button" data-add="${item.id}"
                            class="w-full bg-brand-red hover:bg-brand-darkRed text-white font-bold text-sm py-3.5 rounded-xl shadow transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-plus" aria-hidden="true"></i><span>Agregar al Pedido</span>
                    </button>
                </div>`;

            // La imagen se configura por JS para enganchar load/error antes de asignar src
            const img = $('img', card);
            img.addEventListener('load', () => img.classList.add('loaded'));
            img.addEventListener('error', () => img.classList.add('loaded'));
            img.src = item.image;
            if (img.complete && img.naturalWidth > 0) img.classList.add('loaded');
            grid.appendChild(card);
        });
    }

    function setFilter(filter) {
        activeFilter = filter;
        $$('.filter-btn').forEach(btn => {
            const on = btn.dataset.filter === filter;
            btn.setAttribute('aria-pressed', on);
            btn.classList.toggle('bg-brand-red', on);
            btn.classList.toggle('text-white', on);
            btn.classList.toggle('shadow-sm', on);
            btn.classList.toggle('bg-stone-100', !on);
            btn.classList.toggle('text-stone-700', !on);
            btn.classList.toggle('hover:bg-stone-200', !on);
        });
        renderMenu();
    }

    /* ============ CARRITO ============ */
    function addToCart(id) {
        const item = menuItems.find(i => i.id === id);
        const filling = $(`#filling-${id}`).value;          // relleno propio de esta tarjeta
        const line = cart.find(c => c.id === id && c.filling === filling);
        if (line) line.qty += 1;
        else cart.push({ id, name: item.name, price: priceOf(id, filling), filling, qty: 1 });
        updateCartUI();
        toast(`✓ ${item.name} (${filling}) agregada`);
    }

    function changeQty(index, delta) {
        if (!cart[index]) return;
        cart[index].qty += delta;
        if (cart[index].qty <= 0) cart.splice(index, 1);
        updateCartUI();
    }

    const cartTotal = () => cart.reduce((s, c) => s + c.price * c.qty, 0);

    function updateCartUI() {
        const count = cart.reduce((s, c) => s + c.qty, 0);
        $('#cartCountBadge').textContent = count;       // badge del header
        $('#floatingCartCount').textContent = count;    // badge del botón flotante móvil
        $('#cartTotal').textContent = money(cartTotal());
        saveCart();

        const box = $('#cartItemsContainer');
        if (!cart.length) {
            box.innerHTML = `
                <div class="text-center py-10 space-y-3">
                    <div class="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400 text-2xl"><i class="fa-solid fa-basket-shopping" aria-hidden="true"></i></div>
                    <p class="font-heading font-bold text-stone-700">Tu bolsa está vacía</p>
                    <p class="text-xs text-stone-500">Añade algunas banderillas coreanas para empezar tu pedido.</p>
                </div>`;
            return;
        }
        $('#cartError').hidden = true;
        box.innerHTML = cart.map((c, i) => `
            <div class="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                <div class="space-y-0.5 min-w-0">
                    <h4 class="font-heading text-sm font-bold text-stone-800">${c.name}</h4>
                    <p class="text-xs text-stone-500">Relleno: <strong class="text-brand-orange">${c.filling}</strong></p>
                    <p class="text-sm font-bold text-brand-red">${money(c.price * c.qty)}</p>
                </div>
                <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 flex-none">
                    <button type="button" data-qty="-1" data-index="${i}" aria-label="Quitar una unidad" class="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold flex items-center justify-center">−</button>
                    <span class="text-sm font-bold w-6 text-center" aria-live="polite">${c.qty}</span>
                    <button type="button" data-qty="1" data-index="${i}" aria-label="Agregar una unidad" class="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold flex items-center justify-center">+</button>
                </div>
            </div>`).join('');
    }

    /* ============ MODAL ============ */
    let lastFocus = null;
    function openCart() {
        lastFocus = document.activeElement;
        $('#cartModal').hidden = false;
        document.documentElement.classList.add('modal-open');   // bloquea el scroll del fondo
        $('[data-close-cart][aria-label]').focus();
    }
    function closeCart() {
        $('#cartModal').hidden = true;
        document.documentElement.classList.remove('modal-open');
        if (lastFocus) lastFocus.focus();
    }

    /* ============ MÉTODO DE PAGO ============ */
    function renderBankInfo() {
        $('#bankName').textContent = BANK_INFO.bank;
        $('#bankType').textContent = BANK_INFO.type;
        $('#bankNumber').textContent = BANK_INFO.number;
        $('#bankHolder').textContent = BANK_INFO.holder;
    }

    function togglePaymentPanel() {
        const open = $('#custPayment').value === PAY_TRANSFER;
        const panel = $('#bankPanel');
        panel.classList.toggle('open', open);
        panel.setAttribute('aria-hidden', String(!open));
        $('#custPayment').setAttribute('aria-expanded', String(open));
        if (open) {
            // lleva el panel a la vista dentro del scroll del carrito (sin saltos)
            setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
        }
    }

    async function copyAccountNumber(btn) {
        const text = BANK_INFO.number;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback para navegadores/móviles sin Clipboard API
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch { /* se ignora */ }
            ta.remove();
        }
        toast('✓ Número de cuenta copiado');
    }

    /* ============ VALIDACIÓN + WHATSAPP ============ */
    function validate() {
        const rules = [
            ['custName', v => oneLine(v).length >= 2],
            ['custAddress', v => oneLine(v).length >= 5]
        ];
        let firstBad = null;
        rules.forEach(([id, ok]) => {
            const input = $('#' + id), err = $('#err-' + id), valid = ok(input.value);
            input.setAttribute('aria-invalid', !valid);
            err.hidden = valid;
            if (!valid && !firstBad) firstBad = input;
        });
        const emptyCart = !cart.length;
        $('#cartError').hidden = !emptyCart;
        if (emptyCart) $('.cart-scroll').scrollTo({ top: 0, behavior: 'smooth' });
        else if (firstBad) firstBad.focus();
        return !emptyCart && !firstBad;
    }

    function buildMessage() {
        const name = oneLine($('#custName').value);
        const address = oneLine($('#custAddress').value);
        const payment = $('#custPayment').value;
        const notes = $('#custNotes').value.trim();

        const lines = ['¡Hola *Cozzu Fast Food*! 🌭😋', 'Quiero hacer el siguiente pedido para delivery:', '', '*DETALLE DEL PEDIDO:*'];
        cart.forEach((c, i) => {
            lines.push(`${i + 1}. *${c.name}* (x${c.qty})`,
                       `   - Relleno: ${c.filling}`,
                       `   - Subtotal: ${money(c.price * c.qty)}`);
        });
        lines.push('', `*TOTAL ESTIMADO:* ${money(cartTotal())}`, '',
                   '*DATOS DE ENTREGA:*',
                   `👤 *Cliente:* ${name}`,
                   `📍 *Dirección/Sector (Constanza):* ${address}`,
                   `💳 *Método de pago:* ${payment}`);
        if (notes) lines.push(`📝 *Notas:* ${notes}`);
        if (payment === PAY_TRANSFER) {
            lines.push('',
                       '🏦 *Pagaré por transferencia bancaria.*',
                       '📎 *Recordatorio:* adjuntaré el comprobante de pago en este chat para confirmar mi pedido.');
        }
        lines.push('', '¡Quedo a la espera de su confirmación!');
        return lines.join('\n');
    }

    function sendWhatsAppOrder() {
        if (!validate()) return;
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
        // Si el navegador bloquea la ventana nueva (algunos móviles), se navega en la misma pestaña
        const w = window.open(url, '_blank', 'noopener');
        if (!w) window.location.href = url;
    }

    /* ============ EVENTOS (delegación) ============ */
    document.addEventListener('click', e => {
        const t = e.target.closest('[data-open-cart],[data-close-cart],[data-filter],[data-add],[data-qty],[data-copy-account]');
        if (!t) return;
        if ('openCart' in t.dataset) openCart();
        else if ('closeCart' in t.dataset) closeCart();
        else if (t.dataset.filter) setFilter(t.dataset.filter);
        else if (t.dataset.add) addToCart(t.dataset.add);
        else if (t.dataset.qty) changeQty(+t.dataset.index, +t.dataset.qty);
        else if ('copyAccount' in t.dataset) copyAccountNumber(t);
    });

    document.addEventListener('change', e => {
        if (e.target.id === 'custPayment') { togglePaymentPanel(); return; }
        const id = e.target.dataset.filling;
        if (!id) return;
        chosenFilling[id] = e.target.value;
        $('#price-' + id).textContent = money(priceOf(id, e.target.value));   // precio según relleno
    });

    $('#orderForm').addEventListener('submit', e => { e.preventDefault(); sendWhatsAppOrder(); });
    $$('#custName,#custAddress').forEach(inp => inp.addEventListener('input', () => {
        inp.removeAttribute('aria-invalid'); $('#err-' + inp.id).hidden = true;
    }));

    document.addEventListener('keydown', e => {
        if ($('#cartModal').hidden) return;
        if (e.key === 'Escape') return closeCart();
        if (e.key === 'Tab') {                          // atrapa el foco dentro del modal
            const f = $$('button, input, select, textarea', $('.cart-panel')).filter(el => !el.disabled);
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    /* ============ INICIO ============ */
    $('#year').textContent = new Date().getFullYear();
    renderMenu();
    updateCartUI();
    renderBankInfo();
    togglePaymentPanel();
    // Imágenes ya presentes en el HTML (hero) que fallaron antes de cargar este script
    $$('img').forEach(img => { if (img.complete && img.naturalWidth === 0) useFallback(img); });
})();
