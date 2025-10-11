document.addEventListener('DOMContentLoaded', function() {
    // Update active states based on current page
    const currentPage = normalizePath(window.location.pathname);
    document.querySelectorAll('.nav-page').forEach(link => {
        const href = link.getAttribute('href');
        const linkPath = normalizePath(href);

        if (linkPath && linkPath === currentPage) {
            link.classList.add('active');
        }
    });

    // Initialize scroll behavior
    initializeNavigation();
});

function initializeNavigation() {
    // Smooth scrolling for in-page navigation links
    const hashLinks = document.querySelectorAll('a[href^="#"], a[href^="/#"]');
    hashLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const href = link.getAttribute('href');
            if (!href) {
                return;
            }

            const normalizedHref = href.startsWith('/#') ? href.slice(1) : href;
            if (!normalizedHref.startsWith('#')) {
                return;
            }

            const targetId = normalizedHref.slice(1);
            if (!targetId) {
                return;
            }

            const onHomepage = normalizePath(window.location.pathname) === '/';
            if (!onHomepage) {
                window.location.href = `/#${targetId}`;
                return;
            }

            event.preventDefault();
            const targetSection = document.getElementById(targetId);
            if (!targetSection) {
                return;
            }

            const navElement = document.querySelector('.nav');
            const navHeight = navElement ? navElement.offsetHeight : 0;
            const targetPosition = targetSection.getBoundingClientRect().top + window.scrollY - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });
}

function normalizePath(path) {
    if (!path || path.startsWith('#')) {
        return '';
    }

    try {
        // Allow passing full URLs as well as relative paths
        const url = new URL(path, window.location.origin);
        path = url.pathname;
    } catch (error) {
        // Fallback to the raw path if URL parsing fails
    }

    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    if (path === '/index.html') {
        return '/';
    }

    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    return path;
}
