// Excalidraw Canvas Rendering
class ExcalidrawRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private compressedData: string = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.init();
  }

  private init(): void {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;

    // Listen for data updates
    if (this.canvas.dataset.compressed) {
      this.setCompressedData(this.canvas.dataset.compressed);
    }
  }

  setCompressedData(data: string): void {
    this.compressedData = data;
    this.render();
  }

  private decompressData(): any {
    try {
      // Base64 decode
      const decoded = atob(this.compressedData);
      // Parse JSON
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to decompress Excalidraw data:', error);
      return null;
    }
  }

  private render(): void {
    const decompressed = this.decompressData();
    if (!decompressed) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw elements (simplified for demo)
    // In a real implementation, you'd parse and draw all Excalidraw elements
    this.ctx.fillStyle = '#4F46E5';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Excalidraw', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText('Content', this.canvas.width / 2, this.canvas.height / 2 + 30);
  }
}

// Initialize Excalidraw renderers
function initExcalidrawRenderers(): void {
  const canvases = document.querySelectorAll('.excalidraw-canvas');
  canvases.forEach(canvas => {
    new ExcalidrawRenderer(canvas as HTMLCanvasElement);
  });
}

// Smooth scrolling for navigation
document.addEventListener('DOMContentLoaded', () => {
  // Navigation smooth scrolling
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = (e.target as HTMLAnchorElement).getAttribute('href');
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

  // Initialize Excalidraw renderers
  initExcalidrawRenderers();

  // Add loading states
  const videos = document.querySelectorAll('.video-item video');
  videos.forEach(video => {
    const videoElement = video as HTMLVideoElement;
    videoElement.addEventListener('loadedmetadata', () => {
      console.log('Video loaded:', videoElement.src);
    });
  });
});

// Lesson interaction
function openLesson(index: number): void {
  const lessons = document.querySelectorAll('.lesson-card');
  const lesson = lessons[index] as HTMLElement;

  if (lesson) {
    // Scroll to media gallery
    const mediaGallery = document.getElementById('media-gallery');
    if (mediaGallery) {
      mediaGallery.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
}

// Performance optimization - lazy loading
function setupLazyLoading(): void {
  const images = document.querySelectorAll('.gallery-svg, .excalidraw-canvas');

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupLazyLoading();
});

// Copy anchor link to clipboard
async function copyAnchor(idOrElement: string | HTMLElement): Promise<void> {
  let id: string;
  let button: Element | null = null;

  if (typeof idOrElement === 'string') {
    id = idOrElement;
    const escapedId = id.replace(/:/g, '\\:');
    const heading = document.getElementById(escapedId);
    if (heading) {
      button = heading.querySelector('.copy-anchor');
    }
  } else {
    // It's an element (the button itself from markdown-it-anchor)
    button = idOrElement;
    const anchor = button?.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('#')) {
        id = href.substring(1);
      } else {
        return;
      }
    } else {
      return;
    }
  }

  const url = new URL(window.location.href);
  url.hash = id!;

  try {
    await navigator.clipboard.writeText(url.toString());

    // Show feedback
    if (button) {
      button.classList.add('copied');
      setTimeout(() => {
        button?.classList.remove('copied');
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

// Make copyAnchor available globally for the onclick handlers
(window as any).copyAnchor = copyAnchor;

// Export for module usage
export {
  ExcalidrawRenderer,
  initExcalidrawRenderers,
  openLesson,
  setupLazyLoading,
  copyAnchor
};