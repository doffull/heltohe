import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock framer-motion to render plain divs (avoids animation flakiness in jsdom)
vi.mock('framer-motion', async () => {
  const actual: any = await vi.importActual('framer-motion');
  const passthrough = new Proxy(
    {},
    {
      get: () => (props: any) => {
        const { children, ...rest } = props || {};
        return rest.as ? rest.as(props) : <div {...rest}>{children}</div>;
      },
    },
  );
  return {
    ...actual,
    motion: passthrough,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useScroll: () => ({ scrollY: { get: () => 0, on: () => () => {} } }),
    useTransform: () => 0,
    useInView: () => true,
    useReducedMotion: () => true,
  };
});

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    designSettings: {
      sliderAutoPlay: false,
      sliderSpeed: 5000,
      sliderGrayscale: false,
      heroSlides: [],
    },
    updateDesignSettings: () => {},
    setCurrentView: () => {},
    t: (k: string) => k,
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/components/visual-editor/VisualEditorProvider', () => ({
  useVisualEditor: () => ({ isOpen: false, setIsDirty: () => {} }),
}));
vi.mock('@/components/visual-editor/InlineEditable', () => ({
  InlineEditable: ({ children, value }: any) => <span>{value ?? children}</span>,
}));

import { HeroSlider } from '@/components/home/HeroSlider';

describe('Home — HeroSlider visual fallback', () => {
  it('renders the fallback hero slide when no slides are configured', () => {
    render(
      <BrowserRouter>
        <HeroSlider />
      </BrowserRouter>,
    );
    expect(screen.getByText(/HELVETICA-MP/i)).toBeInTheDocument();
    expect(screen.getByText(/COLLECTION TECHNIQUE PREMIUM/i)).toBeInTheDocument();
  });
});
