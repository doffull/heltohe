import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Product } from '@/types';
import QuickAddSizeDialog from '../QuickAddSizeDialog';

// --- Mocks -----------------------------------------------------------------

const stockState: { data: { bySize: Record<string, number>; total: number } | undefined; isLoading: boolean } = {
  data: { bySize: {}, total: 0 },
  isLoading: false,
};
const addItem = vi.fn().mockResolvedValue(undefined);
const toast = vi.fn();

vi.mock('@/hooks/useProductStock', () => ({
  useProductStock: () => stockState,
}));

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({ addItem }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const product = {
  id: 'p1',
  name: 'WILSON',
  price: 120,
  image: '/w.png',
  category: 'Homme',
  stock: 50,
  sku: 'W-1',
  sizes: ['S', 'M', 'L'],
} as Product;

function open(p: Product = product) {
  return render(<QuickAddSizeDialog product={p} open onOpenChange={() => {}} />);
}

beforeEach(() => {
  addItem.mockClear();
  toast.mockClear();
  stockState.isLoading = false;
});

describe('QuickAddSizeDialog', () => {
  it('bloque l\'ajout tant qu\'aucune taille n\'est choisie', () => {
    stockState.data = { bySize: { S: 4, M: 2, L: 7 }, total: 13 };
    open();

    expect(screen.getByRole('button', { name: /Sélectionnez une taille/i })).toBeDisabled();
    expect(addItem).not.toHaveBeenCalled();
  });

  it('transmet la taille choisie à addItem', async () => {
    stockState.data = { bySize: { S: 4, M: 2, L: 7 }, total: 13 };
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Taille M' }));
    fireEvent.click(screen.getByRole('button', { name: /Ajouter au panier/i }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem.mock.calls[0][0]).toMatchObject({
      productId: 'p1',
      size: 'M',
      quantity: 1,
    });
  });

  it('désactive les tailles en rupture', () => {
    stockState.data = { bySize: { S: 0, M: 3, L: 0 }, total: 3 };
    open();

    expect(screen.getByRole('button', { name: /Taille S — épuisée/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Taille M' })).toBeEnabled();
  });

  // Le cas qui a motivé le repli : 4 produits en production (Stellar, summit,
  // Steve 2, Middle block) déclarent des tailles mais n'ont qu'une ligne
  // `stock_levels` avec `size = NULL`, rangée sous la clé `'_'`. Sans repli,
  // toutes leurs tailles paraîtraient épuisées et ils seraient inachetables.
  it('laisse choisir toutes les tailles quand le stock n\'est pas ventilé', () => {
    stockState.data = { bySize: { _: 50 }, total: 50 };
    open();

    for (const size of ['S', 'M', 'L']) {
      expect(screen.getByRole('button', { name: `Taille ${size}` })).toBeEnabled();
    }
    expect(screen.queryByText(/toutes les tailles sont épuisées/i)).toBeNull();
  });

  it('signale la rupture totale', () => {
    stockState.data = { bySize: { S: 0, M: 0, L: 0 }, total: 0 };
    open();

    expect(screen.getByText(/Toutes les tailles sont épuisées/i)).toBeInTheDocument();
  });

  // Sans ventilation par taille, `products.stock` fait seul autorité : un
  // produit à 0 ne doit pas rester achetable par le repli.
  it('reste fermé quand le stock global est nul et non ventilé', () => {
    stockState.data = { bySize: { _: 0 }, total: 0 };
    open({ ...product, stock: 0 });

    expect(screen.getByRole('button', { name: /Taille S/ })).toBeDisabled();
  });

  it('plafonne la quantité au stock de la taille choisie', () => {
    stockState.data = { bySize: { S: 4, M: 2, L: 7 }, total: 13 };
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Taille M' }));
    const plus = screen.getByRole('button', { name: 'Augmenter la quantité' });

    fireEvent.click(plus);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(plus).toBeDisabled();
  });
});
