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

