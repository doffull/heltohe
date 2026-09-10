GRANT EXECUTE ON FUNCTION public.reserve_order_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_order_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_order_stock(uuid) TO authenticated;