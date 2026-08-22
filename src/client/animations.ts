// Ultra-Advanced Animatic Engine for Omkar Doiphode Photography

export interface TiltOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
}

export class AnimaticEngine {
  public static init(): void {
    document.addEventListener('DOMContentLoaded', () => {
      AnimaticEngine.initScrollReveal();
      AnimaticEngine.init3DTilt();
      AnimaticEngine.initParallaxHero();
      AnimaticEngine.initSmoothHover();
      AnimaticEngine.initCounterAnimations();
    });
  }

  // 1. Scroll Reveal Observer with Cascading Stagger
  public static initScrollReveal(): void {
    const observerOptions: IntersectionObserverInit = {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll, .collection-card, .package-card, .metric-card').forEach(el => {
      observer.observe(el);
    });
  }

  // 2. 3D Card Physics Tilt with Dynamic Light Sweep
  public static init3DTilt(options: TiltOptions = {}): void {
    const maxTilt = options.maxTilt || 12;
    const perspective = options.perspective || 1000;
    const scale = options.scale || 1.03;

    const cards = document.querySelectorAll<HTMLElement>('.collection-card, .package-card, .metric-card, .stat-card, .review-card');

    cards.forEach(card => {
      card.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease';
      card.style.transformStyle = 'preserve-3d';

      card.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        card.style.transform = `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      });
    });
  }

  // 3. Animated KPI Counter Engine
  public static animateCountUp(element: HTMLElement, targetNumber: number, duration: number = 1200): void {
    let startTimestamp: number | null = null;
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuad = progress * (2 - progress);
      const currentValue = Math.floor(easeOutQuad * (targetNumber - startValue) + startValue);

      element.textContent = currentValue.toLocaleString();

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = targetNumber.toLocaleString();
      }
    };

    window.requestAnimationFrame(step);
  }

  public static initCounterAnimations(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.count || '0', 10);
          if (target > 0 && !el.classList.contains('counted')) {
            el.classList.add('counted');
            AnimaticEngine.animateCountUp(el, target);
          }
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => observer.observe(el));
  }

  // 4. Parallax Hero Motion Engine
  public static initParallaxHero(): void {
    const heroSection = document.querySelector<HTMLElement>('.hero-bg, header');
    if (!heroSection) return;

    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      if (scrolled < 900) {
        heroSection.style.transform = `translateY(${scrolled * 0.2}px)`;
      }
    }, { passive: true });
  }

  // 5. Button Ripple & Micro-Interactions
  public static initSmoothHover(): void {
    const buttons = document.querySelectorAll<HTMLElement>('.cta-button, .nav-links a, .tab-btn, .submit-btn');

    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      });
    });
  }
}

// Initialize on script load
AnimaticEngine.init();
