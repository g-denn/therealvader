document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('animations-enabled');

    const addAnimationClass = (elements, baseDelay = 0, step = 0.08, extraClass = '') => {
        elements.forEach((el, index) => {
            if (!el) return;
            el.classList.add('animate-on-load');
            if (extraClass) {
                el.classList.add(extraClass);
            }
            const existingDelay = parseFloat(el.dataset.delay || 0);
            const delay = existingDelay || baseDelay + index * step;
            el.style.setProperty('--animation-delay', `${delay}s`);
        });
    };

    addAnimationClass([
        document.querySelector('.nav .nav-brand'),
        ...document.querySelectorAll('.nav .nav-links > *')
    ], 0.1, 0.06);

    addAnimationClass([
        ...document.querySelectorAll('.hero .hero-headline-line'),
        document.querySelector('.hero p'),
        ...document.querySelectorAll('.hero .hero-quote p, .hero .hero-quote .quote-author')
    ], 0.35, 0.12, 'text-glow');

    const heroStats = document.querySelectorAll('.hero .hero-stat');
    heroStats.forEach((stat, index) => {
        stat.classList.add('animate-on-load');
        stat.style.setProperty('--animation-delay', `${0.75 + index * 0.05}s`);
    });

    const loadElements = document.querySelectorAll('.animate-on-load');
    requestAnimationFrame(() => {
        loadElements.forEach(el => {
            el.classList.add('is-visible');
        });
    });

    const scrollElements = document.querySelectorAll([
        'section h2',
        'section h3',
        'section h4',
        'section p',
        'section li',
        '.tokenization .step',
        '.protocol-card',
        '.code-showcase',
        '.property-lookup-container'
    ].join(', '));

    scrollElements.forEach((el, index) => {
        el.classList.add('animate-on-scroll');
        el.style.setProperty('--animation-delay', `${(index % 6) * 0.08}s`);
    });

    const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px'
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => animationObserver.observe(el));
});
