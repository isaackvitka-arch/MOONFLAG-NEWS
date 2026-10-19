let todasLasNoticias = [];

document.addEventListener('DOMContentLoaded', () => {
    
    // Cargar las noticias desde el archivo JSON
    fetch('./noticias.json')
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status}`);
            }
            return respuesta.json();
        })
        .then(datos => {
            todasLasNoticias = datos;
            
            // Renderizar el menú lateral de archivos con miniaturas
            renderizarMenuLateral(todasLasNoticias);

            // Verificar si hay un parámetro en la URL para abrir una nota directamente
            const urlParams = new URLSearchParams(window.location.search);
            const notaId = urlParams.get('id') || urlParams.get('nota');

            if (notaId) {
                verArticuloCompleto(notaId, false);
            } else {
                mostrarNoticias(todasLasNoticias);
            }
        })
        .catch(error => console.error('Error cargando las noticias de MOONFLAG NEWS:', error));

    // Manejar el botón de retroceso/avance del navegador (historial)
    window.addEventListener('popstate', (event) => {
        const urlParams = new URLSearchParams(window.location.search);
        const notaId = urlParams.get('id') || urlParams.get('nota');

        if (notaId) {
            verArticuloCompleto(notaId, false);
        } else {
            mostrarNoticias(todasLasNoticias, false);
        }
    });

    // Inicializar la barra de navegación móvil
    inicializarMenu();
});


function alternarHeroPresentacion(mostrar) {
    const heroPresentacion = document.querySelector('.hero-presentacion');
    if (heroPresentacion) {
        heroPresentacion.style.display = mostrar ? 'block' : 'none';
    }
}


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

        // Estructura con miniatura, título y metadatos
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
    
    if (actualizarURL && window.location.search !== '') {
        history.pushState({}, '', window.location.pathname);
    }

    document.title = 'MOONFLAG NEWS';

    const contenedorHero = document.getElementById('hero-noticia');
    const contenedorGrid = document.getElementById('contenedor-noticias');
    const tituloSeccion = document.querySelector('.latest-section h2');
    
    const esInicioCompleto = listaDeNoticias.length === todasLasNoticias.length;
    alternarHeroPresentacion(esInicioCompleto);

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

    // Ordenar las noticias de la más nueva a la más antigua según su ID de forma descendente
    let noticiasOrdenadas = [...listaDeNoticias].sort((a, b) => Number(b.id) - Number(a.id));

    let noticiaPrincipal;
    let noticiasRestantes = [];

    // La más nueva siempre va al Hero
    noticiaPrincipal = noticiasOrdenadas[0];
    noticiasRestantes = noticiasOrdenadas.slice(1);

    // Renderizar la noticia principal (Hero)
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
    }

    // Renderizar la cuadrícula de noticias secundarias
    noticiasRestantes.forEach(noticia => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'noticia-card';
        tarjeta.style.cursor = 'pointer';
        
        tarjeta.innerHTML = `
            <img src="${noticia.imagen}" alt="${noticia.titulo}">
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
    
    alternarHeroPresentacion(false);

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
                        noticia.categoria.toLowerCase() === categoriaSeleccionada.toLowerCase()
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
            menuBtn.textContent = mainNav.classList.contains('active') ? '✕' : '☰';
        });
    }
}