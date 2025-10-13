import { Application } from 'https://unpkg.com/@splinetool/runtime?module';

const SCENE_URL = 'https://prod.spline.design/gxgXLmiwIASvMdmE/scene.splinecode';

const hideFallback = (fallback) => {
    if (!fallback) {
        return;
    }

    fallback.classList.add('is-hidden');
};

const showFallback = (fallback, message) => {
    if (!fallback) {
        return;
    }

    if (message) {
        fallback.textContent = message;
    }

    fallback.classList.remove('is-hidden');
};

const initializeSplineBackground = () => {
    const canvas = document.getElementById('canvas3d');
    if (!canvas) {
        return;
    }

    const fallback = canvas.parentElement?.querySelector('.hero-background__fallback');

    if (fallback) {
        fallback.textContent = 'Interactive background loading';
    }

    try {
        const app = new Application(canvas);
        const loadPromise = app.load(SCENE_URL);

        if (loadPromise && typeof loadPromise.then === 'function') {
            loadPromise
                .then(() => {
                    hideFallback(fallback);
                })
                .catch(() => {
                    showFallback(fallback, 'Interactive background unavailable');
                });
        } else {
            hideFallback(fallback);
        }
    } catch (error) {
        console.error('Failed to initialize Spline background', error);
        showFallback(fallback, 'Interactive background unavailable');
    }
};

document.addEventListener('DOMContentLoaded', initializeSplineBackground);
