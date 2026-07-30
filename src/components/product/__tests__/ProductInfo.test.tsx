import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Product } from '@/types';

// --- Mocks -----------------------------------------------------------------
const authState = { isAdmin: false };
const editorState = { isOpen: false };

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: () => (props: Record<string, unknown>) => {
      const { children, className } = props as { children?: React.ReactNode; className?: string };
      return <div className={className}>{children}</div>;
    },
  }),
}));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({ designSettings: {} }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/visual-editor/VisualEditorProvider', () => ({
  useVisualEditor: () => editorState,
}));

vi.mock('@/components/visual-editor/EditableProductField', () => ({
  EditableProductField: ({ product, field, children }: { product: Product; field: string; children?: React.ReactNode }) => (
    <span data-testid={`field-${field}`}>{children ?? String((product as never as Record<string, unknown>)[field] ?? '')}</span>
  ),
}));

vi.mock('@/components/visual-editor/EditableBadgeLabel', () => ({
  EditableBadgeLabel: ({ currentLabel }: { currentLabel: string }) => <span>{currentLabel}</span>,
}));

vi.mock('@/components/product/SizeGuideAIModal', () => ({
  SizeGuideAIModal: () => null,
}));

import ProductInfo from '../ProductInfo';

const baseProduct: Product = {
  id: 'p1',
  name: 'Doudoune',
  price: 100,
  image: '',
  category: 'Homme',
  stock: 5,
  sku: 'SKU1',
  sizes: [],
  colors: [],
  colorOptions: [],
  attributes: {},
} as unknown as Product;

const emptyProduct: Product = {
  ...baseProduct,
  description: null,
  material: null,
  careInstructions: null,
  modelName: null,
  modelHeight: null,
  modelSizeWorn: null,
} as unknown as Product;

describe('ProductInfo — blocs conditionnels', () => {
  it('n’affiche ni mannequin, ni Description, ni Matière/Entretien quand les champs sont null (visiteur)', () => {
    authState.isAdmin = false;
    editorState.isOpen = false;

    render(<ProductInfo product={emptyProduct} />);

    expect(screen.queryByText(/mesure/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
    expect(screen.queryByText('Matière')).not.toBeInTheDocument();
    expect(screen.queryByText('Entretien')).not.toBeInTheDocument();
  });

  it('affiche les blocs quand le produit a du contenu', () => {
    authState.isAdmin = false;
    editorState.isOpen = false;

    render(
      <ProductInfo
        product={{
          ...emptyProduct,
          description: 'Une belle doudoune',
          material: '100% polyester',
          careInstructions: 'Lavage 30°C',
          modelName: 'Léa',
          modelHeight: '1m75',
          modelSizeWorn: 'M',
        } as unknown as Product}
      />
    );

    expect(screen.getByText(/mesure/i)).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Matière')).toBeInTheDocument();
    expect(screen.getByText('Entretien')).toBeInTheDocument();
  });

  it('affiche les blocs vides en mode éditeur admin pour permettre l’édition inline', () => {
    authState.isAdmin = true;
    editorState.isOpen = true;

    render(<ProductInfo product={emptyProduct} />);

    expect(screen.getByText(/mesure/i)).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Matière')).toBeInTheDocument();
    expect(screen.getByText('Entretien')).toBeInTheDocument();
  });
});
