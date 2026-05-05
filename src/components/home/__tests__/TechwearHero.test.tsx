import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TechwearHero } from '../TechwearHero';
import { INITIAL_DESIGN_SETTINGS } from '@/data/initialData';
import type { TechwearHeroConfig } from '@/types';

// Mock useApp to inject a controlled config
vi.mock('@/context/AppContext', () => ({
  __esModule: true,
  useApp: () => ({ designSettings: mockSettings }),
}));

// Mock useProducts (no linked product needed for these tests)
vi.mock('@/hooks/useProducts', () => ({
  __esModule: true,
  useProducts: () => ({ data: [] }),
}));

let mockSettings: any = { ...INITIAL_DESIGN_SETTINGS };

function setConfig(cfg: Partial<TechwearHeroConfig>) {
  mockSettings = {
    ...INITIAL_DESIGN_SETTINGS,
    techwearHero: { ...INITIAL_DESIGN_SETTINGS.techwearHero, ...cfg },
  };
}

function renderHero() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TechwearHero />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TechwearHero', () => {
  it('renders nothing when disabled', () => {
    setConfig({ enabled: false });
    const { container } = renderHero();
    expect(container.querySelector('[data-testid="techwear-hero"]')).toBeNull();
  });

  it('renders stats, colors, sizes and badge when enabled', () => {
    setConfig({ enabled: true });
    renderHero();
    expect(screen.getByTestId('techwear-hero')).toBeInTheDocument();
    // 3 stats
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
    // colors via radio role
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(INITIAL_DESIGN_SETTINGS.techwearHero.colorOptions.length);
    // model badge
    expect(screen.getByText('MODEL')).toBeInTheDocument();
    // primary CTA
    expect(screen.getByText('SHOP NOW')).toBeInTheDocument();
  });

  it('updates active color and image when a swatch is clicked', () => {
    setConfig({ enabled: true, defaultColor: 0 });
    renderHero();
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(radios[2]);
    const updated = screen.getAllByRole('radio');
    expect(updated[2]).toHaveAttribute('aria-checked', 'true');
    const img = screen.getByAltText(/Modèle/i) as HTMLImageElement;
    expect(img.src).toContain(INITIAL_DESIGN_SETTINGS.techwearHero.colorOptions[2].image);
  });

  it('exposes accessible region label', () => {
    setConfig({ enabled: true });
    renderHero();
    const region = screen.getByRole('region', { name: /hero produit/i });
    expect(region).toBeInTheDocument();
  });
});
