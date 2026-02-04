import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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

const TAX_RATE = 0.20; // 20% TVA
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_COST = 9.99;

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
  
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const subtotalAfterPromo = subtotal - promoDiscount;
  const tax = subtotalAfterPromo * TAX_RATE;
  const total = subtotalAfterPromo + tax + shippingCost;

  const addItem = useCallback(async (newItem: Omit<CartItem, 'id'>) => {
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
  }, [user]);

  const applyPromoCode = useCallback(async (code: string): Promise<{ success: boolean; discount: number; message: string }> => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { success: false, discount: 0, message: 'Code promo invalide' };
      }

      // Check if code has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { success: false, discount: 0, message: 'Ce code promo a expiré' };
      }

      // Check minimum purchase
      if (data.min_purchase && subtotal < data.min_purchase) {
        return { 
          success: false, 
          discount: 0, 
          message: `Montant minimum requis: ${data.min_purchase}€` 
        };
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        return { success: false, discount: 0, message: 'Ce code promo a atteint sa limite d\'utilisation' };
      }

      // Calculate discount
      let discount = 0;
      if (data.type === 'percentage') {
        discount = subtotal * (data.value / 100);
        if (data.max_discount) {
          discount = Math.min(discount, data.max_discount);
        }
      } else if (data.type === 'fixed_amount') {
        discount = data.value;
      }

      setPromoDiscount(discount);
      setPromoCode(code.toUpperCase());

      return { 
        success: true, 
        discount, 
        message: `Code appliqué! -${discount.toFixed(2)}€` 
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
