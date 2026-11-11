import { useEffect, useRef, useState, type RefObject } from 'react';

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Adds the `is-visible` class to the element once it enters the viewport (one-shot).
 * Animations are pure CSS so nothing runs on the main thread after the class flips.
 */
export function useReveal<T extends HTMLElement>(options: IntersectionObserverInit = { rootMargin: '0px 0px -10% 0px' }) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already on screen (first paint, anchor arrival) or no observer support: show it right away.
    const rect = el.getBoundingClientRect();
    const onScreen = rect.top < window.innerHeight * 0.95 && rect.bottom > 0;
    if (onScreen || reduceMotion() || !('IntersectionObserver' in window)) {
      el.classList.add('is-visible');
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      });
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/** Live "is in viewport" flag, used to pause the inline 3D scene when scrolled away. */
export function useInView<T extends HTMLElement>(ref: RefObject<T | null>, rootMargin = '0px') {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin, threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
