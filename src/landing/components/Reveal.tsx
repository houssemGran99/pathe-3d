import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

interface Props {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger delay in ms. */
  delay?: number;
  id?: string;
  style?: CSSProperties;
  'aria-labelledby'?: string;
}

/** Wraps content in a scroll-triggered fade/slide reveal. */
export function Reveal({ children, as: Tag = 'div', className = '', delay = 0, ...rest }: Props) {
  const ref = useReveal<HTMLElement>();
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ ...rest.style, transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
