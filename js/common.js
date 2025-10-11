document.addEventListener('DOMContentLoaded', function() {
    const currentPath = normalisePath(window.location.pathname);

    // Highlight the active page link (e.g. Investments / Wallet)
    document.querySelectorAll('.nav-page').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.includes('#')) {
            return;
        }

        const linkPath = normalisePath(href);
        if (linkPath && linkPath === currentPath) {
            link.classList.add('active');
        }
    });

    initialiseNavigation();
    hydrateHeroSpline();

    // If we land on the homepage with a hash, adjust the scroll position
    if (isHomePath(window.location.pathname) && window.location.hash) {
        scrollToSection(window.location.hash.replace('#', ''), { smooth: false });
    }
});

function initialiseNavigation() {
    const navSectionLinks = document.querySelectorAll('.nav-links a[href^="#"], .nav-links a[href^="/#"], .scroll-link[href^="/#"], .scroll-link[href^="#"]');

    navSectionLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const href = link.getAttribute('href');
            const targetId = extractTargetId(href);

            if (!targetId) {
                return;
            }

            const onHomepage = isHomePath(window.location.pathname);
            const targetExists = document.getElementById(targetId) !== null;

            if (onHomepage && targetExists) {
                event.preventDefault();
                scrollToSection(targetId);
                return;
            }

            if (!onHomepage) {
                event.preventDefault();
                window.location.href = `/#${targetId}`;
            }
        });
    });
}

function extractTargetId(href) {
    if (!href) return '';
    const match = href.match(/#(.+)$/);
    return match ? match[1] : '';
}

function isHomePath(pathname) {
    return pathname === '/' || pathname.endsWith('/index.html');
}

function normalisePath(pathname) {
    if (!pathname) return '';
    if (pathname === '/') return pathname;
    return pathname.replace(/\/index\.html$/, '/');
}

function scrollToSection(sectionId, options = { smooth: true }) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    const nav = document.querySelector('.nav');
    const navHeight = nav ? nav.offsetHeight : 0;
    const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset;
    const offset = Math.max(targetPosition - navHeight - 20, 0);

    window.scrollTo({
        top: offset,
        behavior: options.smooth ? 'smooth' : 'auto'
    });
}

function hydrateHeroSpline() {
    const heroBackground = document.querySelector('.hero-background');
    const splineElement = heroBackground ? heroBackground.querySelector('spline-viewer') : null;

    if (!heroBackground || !splineElement) {
        return;
    }

    if (!window.customElements || !customElements.get('spline-viewer')) {
        const existingScript = document.querySelector('script[src*="@splinetool/viewer"]');
        if (!existingScript) {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'https://unpkg.com/@splinetool/viewer@1.9.20/build/spline-viewer.js';
            document.head.appendChild(script);
        }
    }

    let fallbackTimeout = null;

    const markLoaded = () => {
        if (heroBackground.dataset.loaded === 'true') {
            return;
        }

        heroBackground.dataset.loaded = 'true';
        if (fallbackTimeout) {
            clearTimeout(fallbackTimeout);
            fallbackTimeout = null;
        }
    };

    const handleSplineLoad = () => {
        markLoaded();
        splineElement.removeEventListener('load', handleSplineLoad);
    };

    splineElement.addEventListener('load', handleSplineLoad);

    // If the canvas is already present (e.g. browser cached), mark as loaded immediately
    if (splineElement.shadowRoot && splineElement.shadowRoot.querySelector('canvas')) {
        requestAnimationFrame(markLoaded);
    }

    // Fallback in case the load event doesn't fire within a reasonable window
    fallbackTimeout = setTimeout(() => {
        if (heroBackground.dataset.loaded !== 'true') {
            heroBackground.dataset.loaded = 'fallback';
        }
    }, 8000);
}

