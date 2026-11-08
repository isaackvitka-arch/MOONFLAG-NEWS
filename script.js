const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

let todasLasNoticias = [];

document.addEventListener('DOMContentLoaded', () => {
    
    
    fetch('./noticias.json')
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status}`);
            }
            return respuesta.json();
        })
        .then(datos => {
            todasLasNoticias = datos;
            
            
            renderizarMenuLateral(todasLasNoticias);

            
            const urlParams = new URLSearchParams(window.location.search);
            const notaId = urlParams.get('id') || urlParams.get('nota');

            if (notaId) {
                verArticuloCompleto(notaId, false);
            } else {
                mostrarNoticias(todasLasNoticias);
            }
        })
        .catch(error => console.error('Error cargando las noticias de MOONFLAG NEWS:', error));

    
    window.addEventListener('popstate', (event) => {
        const urlParams = new URLSearchParams(window.location.search);
        const notaId = urlParams.get('id') || urlParams.get('nota');

        if (notaId) {
            verArticuloCompleto(notaId, false);
        } else {
            mostrarNoticias(todasLasNoticias, false);
        }
    });

    
    inicializarMenu();
});




function renderizarMenuLateral(listaNoticias) {
    const contenedorMenu = document.getElementById('menu-archivo-noticias');
    if (!contenedorMenu) return;

    contenedorMenu.innerHTML = '';

    if (listaNoticias.length === 0) {
        contenedorMenu.innerHTML = `<li style="font-size: 0.8rem; padding: 10px 0; color: #666;">No hay registros disponibles.</li>`;
        return;
    }

    listaNoticias.forEach(noticia => {
        const li = document.createElement('li');
        li.className = 'aside-news-item';

        
        li.innerHTML = `
            <a href="#" class="aside-news-link" data-id="${noticia.id}">
                <img src="${noticia.imagen}" alt="${noticia.titulo}" class="aside-news-thumb">
                <div class="aside-news-info">
                    <span class="aside-news-title">${noticia.titulo}</span>
                    <span class="aside-news-meta">${noticia.categoria} &bull; ${noticia.fecha}</span>
                </div>
            </a>
        `;

        const enlace = li.querySelector('a');
        enlace.addEventListener('click', (e) => {
            e.preventDefault();
            verArticuloCompleto(noticia.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        contenedorMenu.appendChild(li);
    });
}


function mostrarNoticias(listaDeNoticias, actualizarURL = true) {
    
    if (actualizarURL) {
        
        const urlLimpia = window.location.pathname.replace('index.html', '');
        history.pushState({}, '', urlLimpia || '/');
    }

    document.title = 'MOONFLAG NEWS';

    const contenedorHero = document.getElementById('hero-noticia');
    const contenedorGrid = document.getElementById('contenedor-noticias');
    const tituloSeccion = document.querySelector('.latest-section h2');
    

    if (tituloSeccion) {
        tituloSeccion.style.display = 'block';
    }
    
    if (!contenedorGrid) return;

    if (contenedorHero) contenedorHero.innerHTML = '';
    contenedorGrid.innerHTML = '';

    if (listaDeNoticias.length === 0) {
        contenedorGrid.innerHTML = `<p class="no-news">Por el momento no hay noticias en esta sección.</p>`;
        return;
    }

    
    let noticiasOrdenadas = [...listaDeNoticias].sort((a, b) => Number(b.id) - Number(a.id));

    let noticiaPrincipal;
    let noticiasRestantes = [];
    let destacadas = [];

    
    const totalDestacadas = noticiasOrdenadas.length >= 4 ? 3 : 1;
    destacadas = noticiasOrdenadas.slice(0, totalDestacadas);
    noticiaPrincipal = destacadas[0];
    noticiasRestantes = noticiasOrdenadas.slice(totalDestacadas);

    
    if (contenedorHero && noticiaPrincipal) {
        contenedorHero.innerHTML = `
            <div class="hero-card" style="cursor: pointer;">
                <div class="hero-image-wrapper">
                    <img src="${noticiaPrincipal.imagen}" alt="${noticiaPrincipal.titulo}">
                </div>
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    <span class="badge badge-hero">${noticiaPrincipal.categoria}</span>
                    <h1>${noticiaPrincipal.titulo}</h1>
                    <p>${noticiaPrincipal.resumen}</p>
                    <span class="hero-read-more">Leer artículo completo →</span>
                </div>
            </div>
        `;

        const tarjetaHero = contenedorHero.querySelector('.hero-card');
        if (tarjetaHero) {
            tarjetaHero.addEventListener('click', () => {
                verArticuloCompleto(noticiaPrincipal.id);
            });
        }

        heroDinamico(contenedorHero, destacadas);
    }

    
    noticiasRestantes.forEach(noticia => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'noticia-card';
        tarjeta.style.cursor = 'pointer';
        
        tarjeta.innerHTML = `
            <img src="${noticia.imagen}" alt="${noticia.titulo}" loading="lazy">
            <span class="badge">${noticia.categoria}</span>
            <h3>${noticia.titulo}</h3>
            <p>${noticia.resumen}</p>
        `;

        tarjeta.addEventListener('click', () => {
            verArticuloCompleto(noticia.id);
        });

        contenedorGrid.appendChild(tarjeta);
    });
}


function verArticuloCompleto(id, actualizarURL = true) {
    const contenedorHero = document.getElementById('hero-noticia');
    const contenedorGrid = document.getElementById('contenedor-noticias');
    const tituloSeccion = document.querySelector('.latest-section h2');
    

    const noticia = todasLasNoticias.find(item => String(item.id) === String(id) || item.slug === String(id));

    if (noticia && contenedorGrid) {
       
        if (actualizarURL) {
            history.pushState({ id: noticia.id }, '', `?id=${noticia.id}`);
        }

        document.title = `${noticia.titulo} | MOONFLAG NEWS`;

        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
            ogImage.setAttribute('content', noticia.imagenSocial || noticia.imagen);
        }

        if (contenedorHero) contenedorHero.innerHTML = '';
        if (tituloSeccion) tituloSeccion.style.display = 'none';

        let bloquesHTML = '';
        if (noticia.contenido && Array.isArray(noticia.contenido)) {
            noticia.contenido.forEach(bloque => {
                if (bloque.tipo === 'texto') {
                    bloquesHTML += `<p>${bloque.valor}</p>`;
                } else if (bloque.tipo === 'imagen') {
                    bloquesHTML += `
                        <div class="bloque-imagen-container">
                            <img src="${bloque.valor}" alt="${noticia.titulo}" class="articulo-imagen-secundaria">
                            ${bloque.pie ? `<p class="pie-de-foto">${bloque.pie}</p>` : ''}
                        </div>
                    `;
                }
            });
        } else {
            bloquesHTML = `<p>${noticia.texto || ''}</p>`;
        }

        contenedorGrid.innerHTML = `
            <article class="articulo-completo">
                <button class="btn-volver" id="btn-regresar">← Volver a últimas noticias</button>
                <div class="articulo-header">
                    <span class="badge">${noticia.categoria}</span>
                    <h1>${noticia.titulo}</h1>
                    <div class="articulo-meta">
                        <span>Por <strong>${noticia.autor}</strong></span> | 
                        <span>${noticia.fecha}</span>
                    </div>
                </div>
                <img src="${noticia.imagen}" alt="${noticia.titulo}" class="articulo-imagen">
                <div class="articulo-cuerpo">
                    ${bloquesHTML}
                </div>
            </article>
        `;

        const btnRegresar = document.getElementById('btn-regresar');
        if (btnRegresar) {
            btnRegresar.addEventListener('click', () => {
                mostrarNoticias(todasLasNoticias);
            });
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!noticia && todasLasNoticias.length > 0) {
        mostrarNoticias(todasLasNoticias);
    }
}


function inicializarMenu() {
    const enlacesCategorias = document.querySelectorAll('.main-nav a, .footer-column a[href^="#"]');
    const menuBtn = document.getElementById('menu-btn');
    const mainNav = document.getElementById('main-navigation');

    enlacesCategorias.forEach(enlace => {
        enlace.addEventListener('click', (evento) => {
            const categoriaSeleccionada = enlace.textContent.trim();

            if (['Inicio', 'Musica', 'Música', 'Arte', 'Conciertos', 'Obras'].includes(categoriaSeleccionada)) {
                evento.preventDefault();

                if (categoriaSeleccionada === 'Inicio') {
                    mostrarNoticias(todasLasNoticias);
                } else {
                    const noticiasFiltradas = todasLasNoticias.filter(noticia => 
                        norm(noticia.categoria) === norm(categoriaSeleccionada)
                    );
                    mostrarNoticias(noticiasFiltradas);
                }

                if (mainNav) mainNav.classList.remove('active');
                if (menuBtn) menuBtn.textContent = '☰';
                
                const seccionMain = document.querySelector('.main-content');
                if (seccionMain) {
                    seccionMain.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    if (menuBtn && mainNav) {
        menuBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            const abierto = mainNav.classList.contains('active');
            menuBtn.textContent = abierto ? '✕' : '☰';
            menuBtn.setAttribute('aria-expanded', abierto);
        });
    }
}



(function () {
    const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const idActual = () => {
        const p = new URLSearchParams(location.search);
        return p.get('id') || p.get('nota');
    };

    const buscar = (id) => todasLasNoticias.find(
        (n) => String(n.id) === String(id) || n.slug === String(id)
    );

    
    const barra = document.createElement('div');
    barra.className = 'progreso-lectura';
    barra.setAttribute('aria-hidden', 'true');

    const btnArriba = document.createElement('button');
    btnArriba.className = 'volver-arriba';
    btnArriba.setAttribute('aria-label', 'Volver arriba');
    btnArriba.textContent = '↑';
    btnArriba.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    document.addEventListener('DOMContentLoaded', () => {
        document.body.append(barra, btnArriba);
        window.addEventListener('scroll', alHacerScroll, { passive: true });
        iniciarCuandoHayDatos();
    });

    function alHacerScroll() {
        btnArriba.classList.toggle('visible', window.scrollY > 600);

        const cuerpo = document.querySelector('.articulo-completo');
        if (!cuerpo) { barra.style.width = '0'; return; }
        const inicio = cuerpo.offsetTop;
        const total = cuerpo.offsetHeight - window.innerHeight;
        const avance = total > 0 ? (window.scrollY - inicio) / total : 0;
        barra.style.width = Math.min(Math.max(avance, 0), 1) * 100 + '%';
    }

    
    function iniciarCuandoHayDatos() {
        let intentos = 0;
        const reloj = setInterval(() => {
            intentos++;
            if (typeof todasLasNoticias !== 'undefined' && todasLasNoticias.length) {
                clearInterval(reloj);
                crearTicker();
                crearBandaTalento();
                vigilarContenido();
            } else if (intentos > 80) {
                clearInterval(reloj); 
            }
        }, 100);
    }

    
    function crearTicker() {
        const cabecera = document.querySelector('.main-header');
        if (!cabecera) return;

        const ultimas = [...todasLasNoticias]
            .sort((a, b) => Number(b.id) - Number(a.id))
            .slice(0, 6);

        const botones = ultimas
            .map((n) => `<button type="button" data-id="${esc(n.id)}">${esc(n.titulo)}</button>`)
            .join('');

        const ticker = document.createElement('div');
        ticker.className = 'ticker';
        ticker.innerHTML = `
            <span class="ticker-label">Lo último</span>
            <div class="ticker-viewport">
                <div class="ticker-track">${botones}${botones}</div>
            </div>`;

        ticker.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-id]');
            if (b) verArticuloCompleto(b.dataset.id);
        });

        cabecera.appendChild(ticker);
    }

    
    function crearBandaTalento() {
        const hero = document.getElementById('hero-noticia');
        if (!hero) return;

        const banda = document.createElement('section');
        banda.className = 'cta-talento';
        banda.setAttribute('aria-label', 'Convocatoria para artistas');
        banda.innerHTML = `
            <div>
                <h2>¿Eres artista o creador emergente?</h2>
                <p>Cuéntanos qué haces y te damos un espacio para mostrar tu trabajo.</p>
            </div>
            <a href="mailto:kavitkaaligas@outlook.es?subject=Quiero%20aparecer%20en%20MOONFLAG%20NEWS">Escríbenos</a>`;

        hero.insertAdjacentElement('afterend', banda);
    }

    
    function vigilarContenido() {
        const contenedor = document.getElementById('contenedor-noticias');
        if (!contenedor) return;

        const revisar = () => {
            const articulo = contenedor.querySelector('.articulo-completo');
            document.body.classList.toggle('en-articulo', !!articulo);
            if (articulo && !articulo.querySelector('.articulo-extras')) {
                agregarExtras(articulo);
            }
            alHacerScroll();
        };

        new MutationObserver(revisar).observe(contenedor, { childList: true });
        revisar();
    }

    
    function agregarExtras(articulo) {
        const noticia = buscar(idActual());
        if (!noticia) return;

        const url = location.href;
        const texto = encodeURIComponent(`${noticia.titulo} | MOONFLAG NEWS`);

        const relacionadas = todasLasNoticias
            .filter((n) => String(n.id) !== String(noticia.id) && n.categoria === noticia.categoria)
            .sort((a, b) => Number(b.id) - Number(a.id))
            .slice(0, 3);

        const tarjetas = relacionadas.map((n) => `
            <a class="relacionada" href="?id=${esc(n.id)}" data-id="${esc(n.id)}">
                <img src="${esc(n.imagen)}" alt="" loading="lazy">
                <strong>${esc(n.titulo)}</strong>
            </a>`).join('');

        const extras = document.createElement('div');
        extras.className = 'articulo-extras';
        extras.innerHTML = `
            <div class="compartir">
                <span>Compartir</span>
                <button type="button" data-red="https://www.instagram.com/">Instagram</button>
                <a href="https://x.com/intent/post?text=${texto}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer">X</a>
                <button type="button" data-red="https://www.tiktok.com/">TikTok</button>
                <button type="button" data-copiar>Copiar enlace</button>
            </div>
            ${tarjetas ? `<div class="relacionadas"><h3>Sigue leyendo</h3><div class="relacionadas-grid">${tarjetas}</div></div>` : ''}`;

        extras.addEventListener('click', async (e) => {
            const rel = e.target.closest('.relacionada');
            if (rel) {
                e.preventDefault();
                verArticuloCompleto(rel.dataset.id);
                return;
            }
            const red = e.target.closest('[data-red]');
            if (red) {
                const nombre = red.textContent;
                window.open(red.dataset.red, '_blank', 'noopener');
                try {
                    await navigator.clipboard.writeText(location.href);
                    red.textContent = '¡Enlace copiado!';
                } catch {
                    red.textContent = 'No se pudo copiar';
                }
                setTimeout(() => (red.textContent = nombre), 2000);
                return;
            }
            const copiar = e.target.closest('[data-copiar]');
            if (copiar) {
                try {
                    await navigator.clipboard.writeText(location.href);
                    copiar.textContent = '¡Enlace copiado!';
                } catch {
                    copiar.textContent = 'No se pudo copiar';
                }
                setTimeout(() => (copiar.textContent = 'Copiar enlace'), 2000);
            }
        });

        articulo.appendChild(extras);
    }
})();



function escaparHTML(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function heroDinamico(contenedor, lista) {
    const base = contenedor.querySelector('.hero-card');
    if (!base || lista.length < 2) return;

    const DURACION = 7000;
    const card = base.cloneNode(false);
    card.classList.add('hero-dinamico');
    card.style.setProperty('--hero-dur', DURACION + 'ms');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'link');

    const slidesHTML = lista.map((n, i) => `
        <div class="hero-slide${i === 0 ? ' is-active' : ''}"${i === 0 ? '' : ' aria-hidden="true"'}>
            <div class="hero-image-wrapper"><img src="${escaparHTML(n.imagen)}" alt="${escaparHTML(n.titulo)}"></div>
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <span class="badge badge-hero">${escaparHTML(n.categoria)}</span>
                <h1>${escaparHTML(n.titulo)}</h1>
                <p>${escaparHTML(n.resumen)}</p>
                <span class="hero-read-more">Leer artículo completo →</span>
            </div>
        </div>`).join('');

    const lunasHTML = lista.map((n, i) =>
        `<button type="button" class="luna" data-i="${i}" aria-label="Ver destacada ${i + 1}"><i></i></button>`).join('');

    card.innerHTML = slidesHTML + `<div class="hero-lunas"><span class="hero-contador"></span>${lunasHTML}</div>`;
    base.replaceWith(card);

    const slides = [...card.querySelectorAll('.hero-slide')];
    const lunas = [...card.querySelectorAll('.luna')];
    const contador = card.querySelector('.hero-contador');
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let actual = 0;
    let reloj = null;

    function programar() {
        clearTimeout(reloj);
        if (sinMovimiento) return;
        reloj = setTimeout(() => {
            if (!document.body.contains(card)) return;
            mostrar((actual + 1) % lista.length);
        }, DURACION);
    }

    function reiniciarLuna() {
        lunas[actual].classList.remove('is-active');
        void card.offsetWidth;
        lunas[actual].classList.add('is-active');
    }

    function mostrar(i) {
        actual = i;
        slides.forEach((s, j) => {
            s.classList.toggle('is-active', j === i);
            s.setAttribute('aria-hidden', j === i ? 'false' : 'true');
        });
        lunas.forEach((l, j) => {
            l.classList.remove('is-active');
            l.classList.toggle('is-done', j < i);
        });
        void card.offsetWidth;
        lunas[i].classList.add('is-active');
        contador.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(lista.length).padStart(2, '0');
        programar();
    }

    function pausar() { clearTimeout(reloj); card.classList.add('pausado'); }
    function reanudar() { card.classList.remove('pausado'); reiniciarLuna(); programar(); }

    card.addEventListener('mouseenter', pausar);
    card.addEventListener('mouseleave', reanudar);
    card.addEventListener('focusin', pausar);
    card.addEventListener('focusout', reanudar);

    card.addEventListener('click', (e) => {
        const luna = e.target.closest('.luna');
        if (luna) { mostrar(Number(luna.dataset.i)); return; }
        verArticuloCompleto(lista[actual].id);
    });
    card.addEventListener('keydown', (e) => {
        if (e.target === card && e.key === 'Enter') verArticuloCompleto(lista[actual].id);
    });

    let inicioX = 0;
    card.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - inicioX;
        if (Math.abs(dx) < 40) return;
        mostrar((actual + (dx < 0 ? 1 : lista.length - 1)) % lista.length);
    });

    mostrar(0);
}