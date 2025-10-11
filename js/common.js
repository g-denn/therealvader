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
    // Smooth scrolling for dropdown links
    document.querySelectorAll('.scroll-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('/#')) {
                // If we're not on the homepage, navigate there first
                if (window.location.pathname !== '/') {
                    window.location.href = href;
                    return;
                }
                
                e.preventDefault();
                const targetId = href.substring(2);
                const targetSection = document.querySelector('#' + targetId);
                
                if (targetSection) {
                    const navHeight = document.querySelector('.nav').offsetHeight;
                    const targetPosition = targetSection.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
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
