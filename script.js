"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcalidrawRenderer = void 0;
exports.initExcalidrawRenderers = initExcalidrawRenderers;
exports.openLesson = openLesson;
exports.setupLazyLoading = setupLazyLoading;
exports.copyAnchor = copyAnchor;
class ExcalidrawRenderer {
    constructor(canvas) {
        this.compressedData = '';
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.init();
    }
    init() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        if (this.canvas.dataset.compressed) {
            this.setCompressedData(this.canvas.dataset.compressed);
        }
    }
    setCompressedData(data) {
        this.compressedData = data;
        this.render();
    }
    decompressData() {
        try {
            const decoded = atob(this.compressedData);
            return JSON.parse(decoded);
        }
        catch (error) {
            console.error('Failed to decompress Excalidraw data:', error);
            return null;
        }
    }
    render() {
        const decompressed = this.decompressData();
        if (!decompressed)
            return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#4F46E5';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Excalidraw', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText('Content', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
}
exports.ExcalidrawRenderer = ExcalidrawRenderer;
function initExcalidrawRenderers() {
    const canvases = document.querySelectorAll('.excalidraw-canvas');
    canvases.forEach(canvas => {
        new ExcalidrawRenderer(canvas);
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute('href');
            if (targetId) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    initExcalidrawRenderers();
    const videos = document.querySelectorAll('.video-item video');
    videos.forEach(video => {
        const videoElement = video;
        videoElement.addEventListener('loadedmetadata', () => {
            console.log('Video loaded:', videoElement.src);
        });
    });
});
function openLesson(index) {
    const lessons = document.querySelectorAll('.lesson-card');
    const lesson = lessons[index];
    if (lesson) {
        const mediaGallery = document.getElementById('media-gallery');
        if (mediaGallery) {
            mediaGallery.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
}
function setupLazyLoading() {
    const images = document.querySelectorAll('.gallery-svg, .excalidraw-canvas');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    images.forEach(img => imageObserver.observe(img));
}
document.addEventListener('DOMContentLoaded', () => {
    setupLazyLoading();
});
async function copyAnchor(idOrElement) {
    let id;
    let button = null;
    if (typeof idOrElement === 'string') {
        id = idOrElement;
        const escapedId = id.replace(/:/g, '\\:');
        const heading = document.getElementById(escapedId);
        if (heading) {
            button = heading.querySelector('.copy-anchor');
        }
    }
    else {
        button = idOrElement;
        const anchor = button?.closest('a');
        if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && href.startsWith('#')) {
                id = href.substring(1);
            }
            else {
                return;
            }
        }
        else {
            return;
        }
    }
    const url = new URL(window.location.href);
    url.hash = id;
    try {
        await navigator.clipboard.writeText(url.toString());
        if (button) {
            button.classList.add('copied');
            setTimeout(() => {
                button?.classList.remove('copied');
            }, 2000);
        }
    }
    catch (err) {
        console.error('Failed to copy: ', err);
    }
}
window.copyAnchor = copyAnchor;
//# sourceMappingURL=script.js.map