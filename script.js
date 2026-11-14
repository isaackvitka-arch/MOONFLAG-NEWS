/* =========================================================
   MOONFLAG NEWS — Propuesta B: "Sala de exposición"
   Lee ../noticias.json. Rutas: ?id=12 (nota) · ?cat=arte (sala).
   ========================================================= */

const RAIZ = '../';      // dónde está noticias.json
const RAIZ_IMG = './';   // dónde está la carpeta img/ (en el sitio final: la misma que noticias.json)
const SALAS = {
    musica: { nombre: 'Música', intro: 'Voces, beats y proyectos que están empezando a sonar.' },
    arte: { nombre: 'Arte', intro: 'Obra visual de creadores que vale la pena seguir de cerca.' },
    conciertos: { nombre: 'Conciertos', intro: 'Lo que pasó en el escenario y por qué importa.' },
    deportes: { nombre: 'Deportes', intro: 'Atletas emergentes, disciplinas urbanas y el talento que se juega en la cancha.' }
};

let notas = [];
let primeraVez = true;

// Vista previa del CMS: ?vista-previa=1 — sin animaciones, datos inyectados por mensaje.
const MODO_PREVIA = new URLSearchParams(location.search).has('vista-previa');
let publicadas = [];

/* ---------- Utilidades ---------- */
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rico = (t) => esc(t).replace(/&lt;(\/?)(strong|b|em|i)&gt;/gi, '<$1$2>');
const ruta = (src) => (/^(https?:)?\//.test(src) ? src : RAIZ_IMG + src);
const salaDe = (n) => norm(n.categoria);
const nombreSala = (n) => SALAS[salaDe(n)]?.nombre || n.categoria;
const recientes = (l) => [...l].sort((a, b) => Number(b.id) - Number(a.id));
const buscar = (id) => notas.find((n) => String(n.id) === String(id) || n.slug === String(id));
const quieto = () => MODO_PREVIA || matchMedia('(prefers-reduced-motion: reduce)').matches;
const num = (n) => (n.id ? `Nº ${String(n.id).padStart(2, '0')}` : 'Nº —');
const urlDe = ({ id, cat } = {}) => (id ? `?id=${encodeURIComponent(id)}` : cat ? `?cat=${encodeURIComponent(cat)}` : './');

function fecha(f) {
    const m = String(f ?? '').toLowerCase().match(/(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de)?\s+(\d{4})/);
    return m ? `${m[1]} de ${m[2]} de ${m[3]}` : String(f ?? '');
}
function mesAnio(f) {
    const m = String(f ?? '').toLowerCase().match(/de\s+([a-záéíóú]+)(?:\s+de)?\s+(\d{4})/);
    return m ? `${m[1]} de ${m[2]}` : '';
}
function minutos(n) {
    const txt = (n.contenido || []).filter((b) => b.tipo === 'texto').map((b) => b.valor).join(' ');
    return Math.max(1, Math.round(txt.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200));
}

const marco = (src, alt = '', clase = '', extra = 'loading="lazy" decoding="async"') =>
    `<div class="marco ${clase}"><img src="${esc(ruta(src))}" alt="${esc(alt)}" ${extra}></div>`;

// Imagen que no carga: el marco muestra un placeholder; el logo cae a texto.
document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    const logo = img.closest('.barra-logo');
    if (logo) { logo.classList.add('sin-logo'); return; }
    img.closest('.marco, .conv-mascota')?.classList.add('sin-imagen');
}, true);

// Imágenes estáticas que fallaron antes de que este script cargara.
document.querySelectorAll('.barra-logo img, .conv-mascota img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
});

/* ---------- Navegación ---------- */
function leerRuta() {
    const p = new URLSearchParams(location.search);
    const cat = p.get('cat') ? norm(p.get('cat')) : null;
    return { id: p.get('id') || p.get('nota'), cat: SALAS[cat] ? cat : null };
}

function ir(destino, origen = null) {
    history.pushState(destino, '', urlDe(destino));
    transicion(() => pintar(true), destino.id ? origen : null);
}

/* Transición de vista: si el navegador la soporta, la foto de la tarjeta "viaja" a la portada de la nota. */
function transicion(actualizar, origen) {
    if (!document.startViewTransition || quieto()) { actualizar(); return; }
    const marcoOrigen = origen?.closest('.obra, .principal, .tira-item, .plano-sala, .cat-fila, .foco')?.querySelector('.marco');
    if (marcoOrigen) marcoOrigen.style.viewTransitionName = 'portada';
    const vt = document.startViewTransition(() => {
        if (marcoOrigen) marcoOrigen.style.viewTransitionName = '';
        actualizar();
    });
    vt.finished.finally(() => { if (marcoOrigen) marcoOrigen.style.viewTransitionName = ''; });
}

function pintar(desplazar = false) {
    const { id, cat } = leerRuta();
    const nota = id && buscar(id);

    document.body.classList.toggle('en-nota', !!nota);
    if (nota) vistaNota(nota);
    else if (cat) vistaSala(cat);
    else vistaPortada();

    marcarSalas(nota ? salaDe(nota) : cat);
    document.getElementById('vista').setAttribute('aria-busy', 'false');
    primeraVez = false;
    if (desplazar) window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}

function marcarSalas(cat) {
    document.querySelectorAll('.salas a[data-cat]').forEach((a) => {
        const activo = cat ? a.dataset.cat === cat : a.dataset.cat === 'inicio';
        if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
}

document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[data-id], a[data-cat]');
    if (!a) return;
    e.preventDefault();
    cerrarMenu();
    if (a.dataset.id) ir({ id: a.dataset.id }, a);
    else ir({ cat: a.dataset.cat === 'inicio' ? null : a.dataset.cat });
});

window.addEventListener('popstate', () => transicion(() => pintar(true)));

/* ---------- Menú móvil ---------- */
const btnMenu = document.getElementById('btn-menu');
const salasNav = document.getElementById('salas');

function cerrarMenu() {
    salasNav.classList.remove('abierto');
    btnMenu.setAttribute('aria-expanded', 'false');
}
btnMenu.addEventListener('click', () => {
    const abrir = !salasNav.classList.contains('abierto');
    salasNav.classList.toggle('abierto', abrir);
    btnMenu.setAttribute('aria-expanded', String(abrir));
    if (abrir) salasNav.querySelector('a')?.focus();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && salasNav.classList.contains('abierto')) { cerrarMenu(); btnMenu.focus(); }
});
document.addEventListener('click', (e) => {
    if (salasNav.classList.contains('abierto') && !salasNav.contains(e.target) && !btnMenu.contains(e.target)) cerrarMenu();
});
// "Catálogo" desde cualquier vista: vuelve a la portada y baja al catálogo.
salasNav.querySelector('a[href="#catalogo"]').addEventListener('click', (e) => {
    cerrarMenu();
    if (!document.getElementById('catalogo')) {
        e.preventDefault();
        history.pushState({}, '', './#catalogo');
        pintar();
        document.getElementById('catalogo')?.scrollIntoView();
    }
});

/* ---------- Arranque ---------- */
fetch(RAIZ + 'noticias.json')
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((datos) => {
        publicadas = datos.filter((n) => n.estado !== 'borrador');
        notas = publicadas;
        pintar();
        if (location.hash === '#catalogo') document.getElementById('catalogo')?.scrollIntoView();
        if (MODO_PREVIA && window.parent !== window) window.parent.postMessage({ tipo: 'moonflag:lista' }, location.origin);
    })
    .catch((err) => {
        console.error('MOONFLAG: no se pudo leer noticias.json', err);
        const v = document.getElementById('vista');
        v.setAttribute('aria-busy', 'false');
        v.innerHTML = `
            <div class="vacio" role="alert">
                <h2>La sala no abrió</h2>
                <p>No pudimos leer el archivo de noticias. Revisa tu conexión y vuelve a cargar la página.</p>
                <button type="button" class="btn" onclick="location.reload()">Volver a cargar</button>
            </div>`;
    });

/* ---------- Piezas ---------- */
function ficha(n, { conAutor = false, conLectura = false } = {}) {
    return `
        <dl class="ficha">
            <dt>Catálogo</dt><dd>${num(n)}</dd>
            <dt>Sala</dt><dd><a href="${urlDe({ cat: salaDe(n) })}" data-cat="${esc(salaDe(n))}">${esc(nombreSala(n))}</a></dd>
            ${conAutor ? `<dt>Texto</dt><dd>${esc(n.autor)}</dd>` : ''}
            <dt>Fecha</dt><dd>${esc(fecha(n.fecha))}</dd>
            ${conLectura ? `<dt>Lectura</dt><dd>${minutos(n)} min</dd>` : ''}
        </dl>`;
}

function obra(n) {
    return `
        <article class="obra">
            ${marco(n.imagen)}
            <div class="cedula">
                <span class="cedula-num">${num(n)}</span>
                <h3><a href="${urlDe({ id: n.id })}" data-id="${esc(n.id)}">${esc(n.titulo)}</a></h3>
                <span class="cedula-pie"><b>${esc(nombreSala(n))}</b>, ${esc(fecha(n.fecha))}</span>
            </div>
        </article>`;
}

// El largo del título decide su tamaño, para que el texto quepa junto a la foto sin descuadrarla.
const largoTitulo = (t) => (t.length > 110 ? ' titulo-muy-largo' : t.length > 70 ? ' titulo-largo' : '');

function principal(n) {
    return `
        <section class="principal${largoTitulo(n.titulo || '')}" aria-label="Obra principal">
            ${marco(n.imagen, '', '', 'fetchpriority="high"')}
            <div class="principal-cedula">
                <h2><a href="${urlDe({ id: n.id })}" data-id="${esc(n.id)}">${esc(n.titulo)}</a></h2>
                <p>${esc(n.resumen)}</p>
                ${ficha(n)}
                <a class="btn" href="${urlDe({ id: n.id })}" data-id="${esc(n.id)}" tabindex="-1">Leer la nota</a>
            </div>
        </section>`;
}

function catalogo(lista, idActivo = null) {
    return `
        <section class="catalogo" id="catalogo" aria-labelledby="t-catalogo">
            <div class="catalogo-cab">
                <h2 id="t-catalogo">Catálogo</h2>
                <span>${lista.length} ${lista.length === 1 ? 'obra' : 'obras'}</span>
            </div>
            <ol>
                ${recientes(lista).map((n) => `
                    <li class="cat-fila">
                        <a href="${urlDe({ id: n.id })}" data-id="${esc(n.id)}"${String(n.id) === String(idActivo) ? ' aria-current="page"' : ''}>
                            <span class="cat-num">${num(n)}</span>
                            <span class="cat-titulo">${esc(n.titulo)}</span>
                            <span class="cat-sala">${esc(nombreSala(n))}</span>
                            <span class="cat-fecha">${esc(fecha(n.fecha))}</span>
                        </a>
                    </li>`).join('')}
            </ol>
        </section>`;
}

function muro(lista, titulo) {
    if (!lista.length) return '';
    return `
        <section aria-labelledby="t-muro">
            <div class="muro-cab">
                <h2 id="t-muro">${esc(titulo)}</h2>
                <span>${lista.length} ${lista.length === 1 ? 'obra' : 'obras'}</span>
            </div>
            <div class="muro">${lista.map(obra).join('')}</div>
        </section>`;
}

/* ---------- Ajuste del rótulo gigante al ancho exacto ---------- */
function ajustarRotulo() {
    const t = document.querySelector('.mast-titulo');
    if (!t) return;
    t.style.fontSize = '';
    const base = parseFloat(getComputedStyle(t).fontSize);
    const ratio = t.clientWidth / t.scrollWidth;
    if (ratio < 1 || ratio > 1.02) t.style.fontSize = `${base * Math.min(ratio, 1.15) * 0.995}px`;
}
document.fonts?.ready.then(ajustarRotulo);
let relojRotulo;
window.addEventListener('resize', () => { clearTimeout(relojRotulo); relojRotulo = setTimeout(ajustarRotulo, 100); });

/* ---------- Frames premium ---------- */
function citaDe(n, desde = 0) {
    if (n.cita) return n.cita.replace(/"([^"]+)"/g, '‘$1’');
    const texto = (n.contenido || []).filter((b) => b.tipo === 'texto').map((b) => b.valor).join('\n');
    const frases = texto
        .replace(/<(strong|b)>[\s\S]*?<\/\1>/gi, '\n')                         // los subtítulos van en negritas: fuera
        .replace(/<[^>]+>/g, '')
        .split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 60)
        .flatMap((l) => l.split(/(?<=[.!?])\s+/))
        .map((f) => f.trim())
        .filter((f) => f.length >= 80 && f.length <= 200 && /^[A-ZÁÉÍÓÚÑ¿¡"“]/.test(f) && /[.!?]$/.test(f));
    const utiles = frases.filter((f) => !/moonflag/i.test(f));
    return (utiles[Math.min(desde, utiles.length - 1)] || n.resumen).replace(/"([^"]+)"/g, '‘$1’');
}

function foco(n) {
    return `
        <section class="foco a-sangre" aria-labelledby="t-foco">
            <div class="foco-in">
                ${marco(n.imagen)}
                <div class="foco-txt">
                    <p class="foco-etiqueta" id="t-foco">Pieza en foco</p>
                    <blockquote>
                        <p>“${esc(citaDe(n))}”</p>
                        <footer><b>${esc(n.autor)}</b>, sobre ${esc(n.titulo.split(':')[0])}</footer>
                    </blockquote>
                    <div class="foco-nota">
                        <h3><a href="${urlDe({ id: n.id })}" data-id="${esc(n.id)}">${esc(n.titulo)}</a></h3>
                        <a class="btn btn-claro" href="${urlDe({ id: n.id })}" data-id="${esc(n.id)}" tabindex="-1">Leer la nota</a>
                    </div>
                </div>
            </div>
        </section>`;
}

function archivoVisual() {
    const fotos = recientes(notas).flatMap((n) =>
        (n.contenido || []).filter((b) => b.tipo === 'imagen' && b.pie).map((b) => ({ n, src: b.valor, pie: b.pie })));
    if (fotos.length < 3) return '';
    const lista = fotos.slice(0, 12);
    return `
        <section class="archivo" aria-labelledby="t-archivo">
            <div class="archivo-cab">
                <div>
                    <h2 id="t-archivo">Archivo visual</h2>
                    <p>Las fotografías que acompañan nuestras notas.</p>
                </div>
                <div class="archivo-ctrl">
                    <button type="button" class="ctrl" data-tira="-1" aria-label="Fotos anteriores">←</button>
                    <button type="button" class="ctrl" data-tira="1" aria-label="Fotos siguientes">→</button>
                </div>
            </div>
            <div class="tira a-sangre" tabindex="0" role="region" aria-label="Archivo visual, desliza para ver más">
                ${lista.map(({ n, src, pie }) => `
                    <figure class="tira-item">
                        ${marco(src, pie)}
                        <figcaption class="cedula">
                            <span class="cedula-num">${num(n)}, ${esc(nombreSala(n))}</span>
                            <a href="${urlDe({ id: n.id })}" data-id="${esc(n.id)}">${esc(n.titulo.split(':')[0].trim())}</a>
                            <small>${esc(pie)}</small>
                        </figcaption>
                    </figure>`).join('')}
            </div>
        </section>`;
}

function recorrido() {
    return `
        <section class="recorrido" aria-labelledby="t-recorrido">
            <div class="recorrido-cab">
                <h2 id="t-recorrido">Recorrido por salas</h2>
                <p>Elige una sala y recorre todo lo que hemos expuesto en ella.</p>
            </div>
            <nav class="plano" aria-label="Salas de la exposición">
                ${Object.entries(SALAS).map(([clave, s]) => {
                    const obras = recientes(notas.filter((n) => salaDe(n) === clave));
                    return `
                        <a class="plano-sala" href="${urlDe({ cat: clave })}" data-cat="${clave}">
                            ${obras.length ? marco(obras[0].imagen) : '<div class="plano-vacia"><span>Próximamente</span></div>'}
                            <span class="plano-txt">
                                <strong>${esc(s.nombre)}</strong>
                                <span>${obras.length ? `${obras.length} ${obras.length === 1 ? 'obra' : 'obras'}` : 'En montaje'}</span>
                            </span>
                        </a>`;
                }).join('')}
            </nav>
        </section>`;
}

function activarTira(v) {
    const tira = v.querySelector('.tira');
    if (!tira) return;
    const [ant, sig] = v.querySelectorAll('[data-tira]');
    const actualizar = () => {
        ant.disabled = tira.scrollLeft < 8;
        sig.disabled = tira.scrollLeft + tira.clientWidth >= tira.scrollWidth - 8;
    };
    v.querySelectorAll('[data-tira]').forEach((b) => b.addEventListener('click', () => {
        const paso = tira.querySelector('.tira-item').offsetWidth + 24;
        tira.scrollBy({ left: Number(b.dataset.tira) * paso * 2, behavior: quieto() ? 'auto' : 'smooth' });
    }));
    tira.addEventListener('scroll', actualizar, { passive: true });
    actualizar();

    // Arrastrar con el ratón (en táctil ya se desliza de forma nativa).
    let x0 = 0, s0 = 0, movido = false, activo = false;
    tira.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        activo = true; movido = false; x0 = e.clientX; s0 = tira.scrollLeft;
    });
    tira.addEventListener('pointermove', (e) => {
        if (!activo) return;
        const dx = e.clientX - x0;
        if (!movido && Math.abs(dx) > 5) { movido = true; tira.classList.add('arrastrando'); tira.setPointerCapture(e.pointerId); }
        if (movido) tira.scrollLeft = s0 - dx;
    });
    const soltar = () => {
        if (!activo) return;
        activo = false;
        if (!movido) return;
        // Al soltar, se acomoda a la foto más cercana.
        tira.classList.remove('arrastrando');
        const paso = tira.querySelector('.tira-item').offsetWidth + 24;
        tira.scrollTo({ left: Math.round(tira.scrollLeft / paso) * paso, behavior: quieto() ? 'auto' : 'smooth' });
    };
    tira.addEventListener('pointerup', soltar);
    tira.addEventListener('pointercancel', soltar);
    tira.addEventListener('click', (e) => { if (movido) { e.preventDefault(); e.stopPropagation(); movido = false; } }, true);
}

// En pantallas táctiles no hay "hover": la foto que pasa por el centro de la pantalla toma color.
let observadorCentro = null;
function activarCentro(raiz) {
    observadorCentro?.disconnect();
    if (!matchMedia('(hover: none)').matches || !('IntersectionObserver' in window)) return;
    observadorCentro = new IntersectionObserver((entradas) => {
        entradas.forEach(({ isIntersecting, target }) => target.classList.toggle('en-centro', isIntersecting));
    }, { rootMargin: '-42% 0px -42% 0px' });
    raiz.querySelectorAll('.obra, .principal, .foco, .plano-sala, .nota-cuerpo figure').forEach((el) => observadorCentro.observe(el));
}

// Revelado al entrar en pantalla: una vez por foto.
let observadorRevelado = null;
function activarRevelado(raiz) {
    // Sin animación si el usuario la pidió reducida, o si la pestaña está oculta (el observador no correría).
    if (quieto() || document.hidden || !('IntersectionObserver' in window)) return;
    observadorRevelado?.disconnect();
    observadorRevelado = new IntersectionObserver((entradas) => {
        entradas.forEach(({ isIntersecting, target }) => {
            if (!isIntersecting) return;
            observadorRevelado.unobserve(target);
            target.classList.add('revelando');
            void target.offsetWidth; // fija el estado inicial antes de transicionar
            target.classList.remove('por-revelar');
            setTimeout(() => target.classList.remove('revelando'), 1200);
        });
    }, { threshold: 0.3 });
    raiz.querySelectorAll('.marco:not(.nota-portada)').forEach((m) => {
        const r = m.getBoundingClientRect();
        if (r.top < innerHeight * 0.9 && r.bottom > 0) return; // lo visible al cargar no parpadea
        m.classList.add('por-revelar');
        observadorRevelado.observe(m);
    });
}

/* ---------- Vistas ---------- */
function vistaPortada() {
    document.title = 'MOONFLAG NEWS';
    const orden = recientes(notas);
    const salasConObra = new Set(notas.map(salaDe)).size;
    const v = document.getElementById('vista');
    const notaPrincipal = orden.find((n) => n.destacada) || orden[0];
    const notaFoco = orden.find((n) => n.foco && n !== notaPrincipal) || orden.find((n) => n !== notaPrincipal);
    const resto = orden.filter((n) => n !== notaPrincipal && n !== notaFoco);

    v.innerHTML = `
        <header class="mast${primeraVez && !quieto() ? ' entra' : ''}">
            <div class="mast-folio">
                <p class="mast-lema">Espacio de exposición para talentos nuevos y emergentes</p>
                <p class="mast-edicion">Edición de ${esc(mesAnio(orden[0]?.fecha))}</p>
            </div>
            <h1 class="mast-titulo" aria-label="MOONFLAG NEWS">
                <span aria-hidden="true">M</span><span class="mast-luna" aria-hidden="true"></span><span aria-hidden="true">ONFLAG</span>
            </h1>
            <div class="mast-datos">
                <span>Música, arte, conciertos y deportes</span>
                <span>${notas.length} obras en exhibición</span>
                <span>${salasConObra} de ${Object.keys(SALAS).length} salas abiertas</span>
            </div>
        </header>
        ${notaPrincipal ? principal(notaPrincipal) : ''}
        ${notaFoco ? foco(notaFoco) : ''}
        ${muro(resto.slice(0, 10), 'En el muro')}
        ${archivoVisual()}
        ${recorrido()}
        ${catalogo(notas)}`;
    ajustarRotulo();
    activarTira(v);
    activarRevelado(v);
    activarCentro(v);
}

function vistaSala(cat) {
    const lista = recientes(notas.filter((n) => salaDe(n) === cat));
    document.title = `${SALAS[cat].nombre} | MOONFLAG NEWS`;
    const v = document.getElementById('vista');

    const cab = `
        <header class="sala-cab">
            <p>Sala</p>
            <h1>${esc(SALAS[cat].nombre)}</h1>
            <div class="sala-cab-pie">
                <p>${esc(SALAS[cat].intro)}</p>
                <span>${lista.length} ${lista.length === 1 ? 'obra' : 'obras'}</span>
            </div>
        </header>`;

    if (!lista.length) {
        v.innerHTML = `${cab}
            <div class="vacio">
                <h2>Esta sala todavía está vacía</h2>
                <p>Estamos preparando las primeras notas de ${esc(SALAS[cat].nombre)}. Mientras tanto, recorre lo más reciente.</p>
                <a class="btn" href="./" data-cat="inicio">Ir a la portada</a>
            </div>`;
        return;
    }

    v.innerHTML = `${cab}${principal(lista[0])}${muro(lista.slice(1), 'Más en esta sala')}${recorrido()}`;
    activarRevelado(v);
    activarCentro(v);
}

function vistaNota(n) {
    document.title = `${n.titulo} | MOONFLAG NEWS`;
    const v = document.getElementById('vista');

    let parrafosVistos = 0;
    let citaPuesta = false;
    const cita = citaDe(n, 3); // una frase de más adelante, no la de apertura
    const totalParrafos = (n.contenido || []).filter((b) => b.tipo === 'texto')
        .reduce((t, b) => t + String(b.valor).split(/\n+/).filter((l) => l.trim()).length, 0);
    if ((n.contenido || []).some((b) => b.tipo === 'cita')) citaPuesta = true; // el editor ya puso sus citas

    const cuerpo = Array.isArray(n.contenido)
        ? n.contenido.map((b) => {
            if (b.tipo === 'subtitulo') return `<h2 class="subtitulo">${esc(b.valor)}</h2>`;
            if (b.tipo === 'cita') return `<blockquote class="cita-media"><p>“${esc(b.valor)}”</p></blockquote>`;
            if (b.tipo === 'texto' && n.v === 2) {
                parrafosVistos++;
                let html = `<p>${rico(b.valor)}</p>`;
                if (!citaPuesta && totalParrafos >= 6 && parrafosVistos === 3 && cita) {
                    citaPuesta = true;
                    html += `<blockquote class="cita-media" aria-hidden="true"><p>“${esc(cita)}”</p></blockquote>`;
                }
                return html;
            }
            if (b.tipo === 'texto') {
                return String(b.valor).split(/\n+/).map((l) => l.trim()).filter(Boolean).map((linea) => {
                    const plano = linea.replace(/<[^>]+>/g, '').trim();
                    const esSubtitulo = plano.length <= 90 && plano.split(/\s+/).length >= 2 && !/[.!?…:;,»"”)]$/.test(plano);
                    if (esSubtitulo) return `<h2 class="subtitulo">${esc(plano)}</h2>`;
                    parrafosVistos++;
                    let html = `<p>${rico(linea)}</p>`;
                    if (!citaPuesta && totalParrafos >= 6 && parrafosVistos === 3 && cita) {
                        citaPuesta = true;
                        html += `<blockquote class="cita-media" aria-hidden="true"><p>“${esc(cita)}”</p></blockquote>`;
                    }
                    return html;
                }).join('');
            }
            if (b.tipo === 'imagen') return `
                <figure>
                    ${marco(b.valor, b.pie || n.titulo)}
                    ${b.pie ? `<figcaption>${esc(b.pie)}</figcaption>` : ''}
                </figure>`;
            return '';
        }).join('')
        : `<p>${rico(n.texto || '')}</p>`;

    const relacionadas = recientes(notas.filter((x) => salaDe(x) === salaDe(n) && String(x.id) !== String(n.id))).slice(0, 3);

    v.innerHTML = `
        <article class="nota">
            <a class="nota-volver" href="./" data-cat="inicio">Volver a la portada</a>
            <header class="nota-cab">
                <p class="nota-kicker"><a href="${urlDe({ cat: salaDe(n) })}" data-cat="${esc(salaDe(n))}">${esc(nombreSala(n))}</a><span>${num(n)}</span><span>${esc(fecha(n.fecha))}</span></p>
                <h1 tabindex="-1">${esc(n.titulo)}</h1>
                ${n.resumen ? `<p class="nota-entrada">${esc(n.resumen)}</p>` : ''}
            </header>
            <aside class="nota-lateral" aria-label="Ficha de la nota">
                <div class="nota-lateral-in">
                    ${ficha(n, { conAutor: true, conLectura: true })}
                    <div class="compartir">
                        <p>Compartir</p>
                        <a class="btn btn-sm btn-borde" target="_blank" rel="noopener noreferrer"
                           href="https://x.com/intent/post?text=${encodeURIComponent(n.titulo + ' | MOONFLAG NEWS')}&url=${encodeURIComponent(location.href)}">Publicar en X</a>
                        ${navigator.share ? '<button type="button" class="btn btn-sm btn-borde" data-compartir>Más opciones</button>' : ''}
                        <button type="button" class="btn btn-sm" data-copiar>Copiar enlace</button>
                        <span class="sr-only" aria-live="polite" data-aviso></span>
                    </div>
                </div>
            </aside>
            ${marco(n.imagen, n.titulo, `nota-portada${quieto() || document.startViewTransition ? '' : ' revelar'}`, 'fetchpriority="high"')}
            <div class="nota-cuerpo">${cuerpo}<p class="fin" aria-hidden="true"><span class="fin-luna"></span></p></div>
        </article>
        ${relacionadas.length ? `<div class="mas">${muro(relacionadas, `Más en la sala de ${nombreSala(n)}`)}</div>` : ''}
        ${catalogo(notas, n.id)}`;

    const aviso = v.querySelector('[data-aviso]');
    v.querySelector('[data-copiar]').addEventListener('click', async (e) => {
        const b = e.currentTarget;
        try { await navigator.clipboard.writeText(location.href); b.textContent = 'Enlace copiado'; }
        catch { b.textContent = 'Copia la URL de arriba'; }
        aviso.textContent = b.textContent;
        setTimeout(() => { b.textContent = 'Copiar enlace'; }, 2000);
    });
    v.querySelector('[data-compartir]')?.addEventListener('click', () => {
        navigator.share({ title: n.titulo, url: location.href }).catch(() => {});
    });

    v.querySelector('.nota-portada').style.viewTransitionName = 'portada';
    setTimeout(() => { const p = v.querySelector('.nota-portada'); if (p) p.style.viewTransitionName = ''; }, 400);
    activarRevelado(v);
    activarCentro(v);
    requestAnimationFrame(() => v.querySelector('h1')?.focus({ preventScroll: true }));
}


/* ---------- Vista previa en vivo desde el CMS ---------- */
if (MODO_PREVIA) {
    document.documentElement.classList.add('modo-previa');
    window.addEventListener('message', (e) => {
        if (e.origin !== location.origin || !e.data || e.data.tipo !== 'moonflag:vista-previa') return;
        const { nota, portada } = e.data;
        let lista = publicadas.map((n) => ({ ...n }));
        if (nota) {
            const i = lista.findIndex((n) => String(n.id) === String(nota.id));
            if (i >= 0) lista[i] = nota; else lista.push(nota);
        }
        if (portada) {
            lista.forEach((n) => {
                n.destacada = String(n.id) === String(portada.principal);
                n.foco = String(n.id) === String(portada.foco);
            });
        }
        notas = lista;
        const destino = nota ? `?vista-previa=1&id=${encodeURIComponent(nota.id || 'nueva')}` : '?vista-previa=1';
        if (nota && !nota.id) nota.id = 'nueva';
        history.replaceState({}, '', destino);
        const y = window.scrollY;
        pintar();
        window.scrollTo(0, y);
    });
}
