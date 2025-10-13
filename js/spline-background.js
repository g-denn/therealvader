(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var heroBackground = document.querySelector('.hero-background');
        if (!heroBackground) {
            return;
        }

        var viewer = heroBackground.querySelector('spline-viewer');
        var fallback = heroBackground.querySelector('.hero-background__fallback');

        if (!viewer) {
            if (fallback) {
                fallback.textContent = 'Interactive background unavailable';
            }
            return;
        }

        var hideFallback = function () {
            if (fallback) {
                fallback.classList.add('is-hidden');
            }
        };

        var showError = function () {
            if (fallback) {
                fallback.textContent = 'Interactive background unavailable';
                fallback.classList.remove('is-hidden');
            }
        };

        viewer.addEventListener('load', hideFallback);
        viewer.addEventListener('scene-load', hideFallback);
        viewer.addEventListener('error', showError);

        if (viewer.hasAttribute('data-spline-loaded')) {
            hideFallback();
        }

        // Ensure the fallback transitions away after a delay to reduce overlap during slow loads.
        setTimeout(function () {
            if (viewer.hasAttribute('url') && viewer.getAttribute('url') !== '') {
                hideFallback();
            }
        }, 6000);
    });
})();
