import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useCheckoutConfig } from '@/hooks/useCheckoutConfig';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  size?: string;
  color?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  itemCount: number;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ success: boolean; discount: number; message: string }>;
  promoDiscount: number;
  promoCode: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// NOTE: product prices are stored TTC (VAT included). Tax is derived from the
// final TTC total to stay consistent with checkout and the server-side
// validate_and_create_order RPC (see src/pages/Checkout.tsx).
const TAX_RATE = 0.20; // 20% TVA

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: checkoutConfig } = useCheckoutConfig();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState<string | null>(null);

  // Load cart from localStorage or DB
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      
      if (user) {
        // Load from database for authenticated users
        try {
          const { data, error } = await supabase
            .from('cart_items')
            .select(`
              id,
              product_id,
              size,
              color,
              quantity,
              products:product_id (
                name,
                price,
                sale_price,
                image
              )
            `)
            .eq('user_id', user.id);

          if (!error && data) {
            const cartItems: CartItem[] = data.map((item: any) => ({
              id: item.id,
              productId: item.product_id,
              name: item.products?.name || '',
              price: item.products?.price || 0,
              salePrice: item.products?.sale_price,
              image: item.products?.image || '',
              size: item.size,
              color: item.color,
              quantity: item.quantity,
            }));
            setItems(cartItems);
          }
        } catch (err) {
          console.error('Error loading cart:', err);
        }
      } else {
        // Load from localStorage for guests
        const savedCart = localStorage.getItem('lvtk6_cart');
        if (savedCart) {
          try {
            setItems(JSON.parse(savedCart));
          } catch {
            setItems([]);
          }
        }
      }
      
      setIsLoading(false);
    };

    loadCart();
  }, [user]);

  // Save to localStorage for guests
  useEffect(() => {
    if (!user && !isLoading) {
      localStorage.setItem('lvtk6_cart', JSON.stringify(items));
    }
  }, [items, user, isLoading]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = items.reduce((sum, item) => {
    const price = item.salePrice || item.price;
    return sum + price * item.quantity;
  }, 0);
  
  // Align with Checkout: default to home-delivery pricing (Cart doesn't know
  // the delivery mode yet). Prices are TTC, so tax is derived from the total.
  const shippingCost = computeShippingCost(checkoutConfig, subtotal, 'home');

  const subtotalAfterPromo = Math.max(0, subtotal - promoDiscount);
  const total = Math.max(0, subtotalAfterPromo + shippingCost);
  const tax = total * TAX_RATE / (1 + TAX_RATE);

  const addItem = useCallback(async (newItem: Omit<CartItem, 'id'>) => {
    // Signal global : pop-up de confirmation + déclencheur « ajout au panier ».
    try {
      window.dispatchEvent(
        new CustomEvent('lvtk:add-to-cart', {
          detail: {
            productId: newItem.productId,
            name: newItem.name,
            image: newItem.image,
            size: newItem.size,
            color: newItem.color,
            quantity: newItem.quantity,
            price: newItem.salePrice ?? newItem.price,
          },
        }),
      );
    } catch {
      /* ignore */
    }


    const existingItem = items.find(
      item => 
        item.productId === newItem.productId && 
        item.size === newItem.size && 
        item.color === newItem.color
    );

    if (existingItem) {
      await updateQuantity(existingItem.id, existingItem.quantity + newItem.quantity);
    } else {
      const id = crypto.randomUUID();
      const itemWithId = { ...newItem, id };

      if (user) {
        try {
          const { data, error } = await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              product_id: newItem.productId,
              size: newItem.size,
              color: newItem.color,
              quantity: newItem.quantity,
            })
            .select()
            .single();

          if (!error && data) {
            setItems(prev => [...prev, { ...itemWithId, id: data.id }]);
          }
        } catch (err) {
          console.error('Error adding to cart:', err);
        }
      } else {
        setItems(prev => [...prev, itemWithId]);
      }
    }
  }, [items, user]);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id);
      return;
    }

    if (user) {
      try {
        await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', id);
      } catch (err) {
        console.error('Error updating quantity:', err);
      }
    }

    setItems(prev => 
      prev.map(item => item.id === id ? { ...item, quantity } : item)
    );
  }, [user]);

  const removeItem = useCallback(async (id: string) => {
    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.error('Error removing item:', err);
      }
    }

    setItems(prev => prev.filter(item => item.id !== id));
  }, [user]);

  const clearCart = useCallback(async () => {
    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Error clearing cart:', err);
      }
    }

    setItems([]);
    setPromoDiscount(0);
    setPromoCode(null);
    try { localStorage.removeItem('roulette_reward_code'); } catch { /* ignore */ }
  }, [user]);

  const applyPromoCode = useCallback(async (code: string): Promise<{ success: boolean; discount: number; message: string }> => {
    try {
      const { data, error } = await supabase.rpc('preview_promo_code' as any, {
        p_code: code,
        p_subtotal: subtotal,
      });

      if (error || !data) {
        return { success: false, discount: 0, message: 'Code promo invalide' };
      }

      const result = data as { success: boolean; discount?: number; message?: string };
      if (!result.success) {
        return { success: false, discount: 0, message: result.message || 'Code promo invalide' };
      }

      const discount = Number(result.discount || 0);
      setPromoDiscount(discount);
      setPromoCode(code.toUpperCase());

      return {
        success: true,
        discount,
        message: result.message || `Code appliqué! -${discount.toFixed(2)}€`,
      };
    } catch (err) {
      return { success: false, discount: 0, message: 'Erreur lors de l\'application du code' };
    }
  }, [subtotal]);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        itemCount,
        subtotal,
        tax,
        shippingCost,
        total,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        applyPromoCode,
        promoDiscount,
        promoCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
