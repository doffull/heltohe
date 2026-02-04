import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle,
  Eye
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS: { value: OrderStatus; label: string; icon: typeof Clock; color: string }[] = [
  { value: 'Pending', label: 'En attente', icon: Clock, color: 'text-yellow-500' },
  { value: 'Processing', label: 'En cours', icon: Package, color: 'text-blue-500' },
  { value: 'Shipped', label: 'Expédiée', icon: Truck, color: 'text-purple-500' },
  { value: 'Delivered', label: 'Livrée', icon: CheckCircle, color: 'text-green-500' },
  { value: 'Cancelled', label: 'Annulée', icon: XCircle, color: 'text-destructive' },
];

export default function AdminOrders() {
  const { toast } = useToast();
  const { data: orders = [], isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status });
      toast({ title: 'Statut mis à jour', description: `La commande est maintenant "${status}"` });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut', variant: 'destructive' });
    }
  };

  const getStatusStyle = (status: OrderStatus) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option?.color || 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold hud-text">COMMANDES</h1>
        <p className="text-muted-foreground mt-1">{orders.length} commandes au total</p>
      </div>

      {/* Orders Table */}
      <div className="chamfer-hud bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune commande</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-xs font-bold hud-text">N° COMMANDE</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">CLIENT</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">DATE</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">TOTAL</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">STATUT</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <code className="text-sm font-bold">{order.orderNumber}</code>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-sm">{order.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(order.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold">{order.total.toFixed(2)}€</span>
                    </td>
                    <td className="p-4">
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value as OrderStatus)}
                      >
                        <SelectTrigger className={`w-[140px] text-xs ${getStatusStyle(order.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <option.icon className={`h-3 w-3 ${option.color}`} />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
