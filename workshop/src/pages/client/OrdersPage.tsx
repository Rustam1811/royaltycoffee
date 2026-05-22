import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  XMarkIcon,
  PencilSquareIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';
import { useCart } from '@/contexts/CartContext';
import { Textarea, WorkshopLoader } from '@/components/ui';
import { getClientOrders, getClientByUid, cancelOrder, updateOrderItems, getWorkshopSettings, getProducts, getAllOrders } from '@/services';
import { WorkshopOrder, OrderStatus, OrderItem, LocalizedString, WorkshopProduct } from '@/types';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'info'; icon: React.ElementType }> = {
  pending: { label: 'Ожидает', variant: 'warning', icon: ClockIcon },
  confirmed: { label: 'Подтверждён', variant: 'info', icon: CheckCircleIcon },
  in_production: { label: 'Готовится', variant: 'info', icon: ClipboardDocumentListIcon },
  ready: { label: 'Готов', variant: 'success', icon: CheckCircleIcon },
  delivered: { label: 'Доставлен', variant: 'success', icon: TruckIcon },
  cancelled: { label: 'Отменён', variant: 'danger', icon: XCircleIcon },
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

// ─── Inline quantity editor for edit modal ───
const EditQtyInput: React.FC<{ value: number; onChange: (q: number) => void }> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 1) onChange(n);
    else setDraft(value.toString());
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        className="w-10 h-7 text-center text-sm font-semibold text-slate-900 border border-workshop-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-workshop-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ width: 40, height: 28, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#0f172a', border: '1px solid #d4a574', borderRadius: 8, background: '#fff', outline: 'none' }}
        min={1}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value.toString()); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
      style={{ width: 40, height: 28, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#0f172a', borderRadius: 8, background: 'none', border: 'none', cursor: 'text' }}
    >
      {value}
    </button>
  );
};

/**
 * Страница заказов клиента
 * С возможностью отменить или редактировать заказ в статусе pending
 */
const OrdersPage: React.FC = () => {
  const { user } = useUser();
  const { loadFromTemplate } = useCart();
  const history = useHistory();
  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'needs_approval'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkshopOrder | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [approvalThreshold, setApprovalThreshold] = useState(20000);
  const [allProducts, setAllProducts] = useState<WorkshopProduct[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const isSuperowner = user?.role === 'superowner' || user?.role === 'workshop_owner';

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;
      try {
        const [settings, products] = await Promise.all([
          getWorkshopSettings(),
          getProducts(),
        ]);
        setApprovalThreshold(settings.bonusApprovalThreshold);
        setAllProducts(products);

        if (isSuperowner) {
          // Суперовнер видит ВСЕ заказы (для одобрения крупных)
          const allOrdersData = await getAllOrders();
          setOrders(allOrdersData);
        } else {
          const client = await getClientByUid(user.uid);
          if (client) {
            const ordersData = await getClientOrders(client.id);
            setOrders(ordersData);
          }
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.uid, isSuperowner]);

  // ─── Repeat order ───
  const handleRepeatOrder = (order: WorkshopOrder) => {
    loadFromTemplate(order.items);
    history.push(`/client/cart?outletId=${encodeURIComponent(order.outletId)}&outletName=${encodeURIComponent(order.outletName)}`);
  };

  // ─── Cancel order ───
  const handleCancel = async (orderId: string) => {
    if (!confirm('Отменить заказ? Это действие нельзя отменить.')) return;
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o));
    } catch (err) {
      console.error('Error cancelling order:', err);
    } finally {
      setCancellingId(null);
    }
  };

  // ─── Approve order (superowner only) ───
  const handleApproveOrder = async (orderId: string) => {
    if (!user?.uid || !isSuperowner) return;
    setApprovingId(orderId);
    try {
      await updateDoc(doc(db, 'workshop_orders', orderId), {
        approvedBy: user.uid,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, approvedBy: user.uid, approvedAt: new Date() } : o)
      );
    } catch (err) {
      console.error('Error approving order:', err);
    } finally {
      setApprovingId(null);
    }
  };

  // ─── Open edit modal ───
  const handleStartEdit = (order: WorkshopOrder) => {
    setEditingOrder(order);
    setEditItems(order.items.map(i => ({ ...i })));
    setEditNotes(order.notes || '');
    setShowAddPanel(false);
    setAddSearch('');
  };

  // ─── Edit: update quantity ───
  const handleEditQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setEditItems(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setEditItems(prev => prev.map(i =>
      i.productId === productId ? { ...i, quantity: qty, subtotal: qty * i.price } : i
    ));
  };

  // ─── Edit: remove item ───
  const handleEditRemove = (productId: string) => {
    setEditItems(prev => prev.filter(i => i.productId !== productId));
  };

  // ─── Save edit ───
  const handleSaveEdit = async () => {
    if (!editingOrder || editItems.length === 0) return;
    setSavingEdit(true);
    try {
      const newTotal = editItems.reduce((s, i) => s + i.subtotal, 0);
      await updateOrderItems(editingOrder.id, editItems, newTotal, editNotes);
      setOrders(prev => prev.map(o =>
        o.id === editingOrder.id
          ? { ...o, items: editItems, totalAmount: newTotal, notes: editNotes || undefined, requiresApproval: newTotal > approvalThreshold || undefined }
          : o
      ));
      setEditingOrder(null);
    } catch (err) {
      console.error('Error saving edit:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Add new product to edit items ───
  const handleAddProduct = (product: WorkshopProduct) => {
    const exists = editItems.find(i => i.productId === product.id);
    if (exists) {
      handleEditQty(product.id, exists.quantity + 1);
    } else {
      const qty = product.minOrder || 1;
      setEditItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        price: product.price,
        unit: product.unit,
        subtotal: qty * product.price,
      }]);
    }
    setAddSearch('');
    setShowAddPanel(false);
  };

  // Products available for adding (not already in order), filtered by search
  const availableToAdd = useMemo(() => {
    const editIds = new Set(editItems.map(i => i.productId));
    let list = allProducts.filter(p => !editIds.has(p.id));
    if (addSearch.trim()) {
      const q = addSearch.toLowerCase();
      list = list.filter(p => {
        const n = p.name.ru || p.name.en || p.name.kz || '';
        return n.toLowerCase().includes(q);
      });
    }
    return list;
  }, [allProducts, editItems, addSearch]);

  const editTotal = editItems.reduce((s, i) => s + i.subtotal, 0);

  const filteredOrders = orders.filter(order => {
    if (filter === 'active') {
      return ['pending', 'confirmed', 'in_production', 'ready'].includes(order.status);
    }
    if (filter === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    if (filter === 'needs_approval') {
      return order.requiresApproval && !order.approvedBy && order.status === 'pending';
    }
    return true;
  });

  if (loading) {
    return <WorkshopLoader text="Загрузка заказов..." />;
  }

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    warning: { bg: '#fffbeb', text: '#d97706' },
    info: { bg: '#eff6ff', text: '#2563eb' },
    success: { bg: '#f0fdf4', text: '#16a34a' },
    danger: { bg: '#fef2f2', text: '#dc2626' },
    default: { bg: '#f8fafc', text: '#475569' },
  };

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #3D0A11 0%, #4D0E16 50%, #5A0D17 100%)', color: '#fff', padding: '40px 20px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{isSuperowner ? 'Все заказы' : 'Мои заказы'}</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 }}>{isSuperowner ? 'Управление и одобрение заказов' : 'История заказов продукции'}</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '16px', background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10, overflowX: 'auto' }}>
        {([
          ...(isSuperowner ? [{ key: 'needs_approval' as const, label: '⚠️ Одобрение' }] : []),
          { key: 'all' as const, label: 'Все' },
          { key: 'active' as const, label: 'Активные' },
          { key: 'completed' as const, label: 'Завершённые' },
        ]).map(f => {
          const count = f.key === 'needs_approval'
            ? orders.filter(o => o.requiresApproval && !o.approvedBy && o.status === 'pending').length
            : undefined;
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ padding: '8px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', background: isActive ? '#92400e' : '#f1f5f9', color: isActive ? '#fff' : '#475569', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              {f.label}
              {count !== undefined && count > 0 && (
                <span style={{ padding: '2px 6px', borderRadius: 9999, fontSize: 11, background: isActive ? 'rgba(255,255,255,0.2)' : '#fde68a', color: isActive ? '#fff' : '#92400e' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredOrders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: '48px 16px', textAlign: 'center' }}>
            <ClipboardDocumentListIcon style={{ width: 64, height: 64, color: '#cbd5e1', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Нет заказов</h3>
            <p style={{ color: '#64748b', margin: 0 }}>{filter === 'active' ? 'Нет активных заказов' : 'История заказов пуста'}</p>
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            const isPending = order.status === 'pending';
            const sc = STATUS_COLORS[statusConfig.variant] || STATUS_COLORS.default;
            
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                  {/* Approval banner */}
                  {order.requiresApproval && order.status === 'pending' && isSuperowner && (
                    <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: order.approvedBy ? '#f0fdf4' : '#fffbeb', color: order.approvedBy ? '#15803d' : '#b45309', borderBottom: `1px solid ${order.approvedBy ? '#bbf7d0' : '#fde68a'}` }}>
                      {order.approvedBy ? '✅ Одобрено руководителем' : `⚠️ Требуется одобрение (сумма ${order.totalAmount.toLocaleString()} ₸)`}
                    </div>
                  )}

                  <div style={{ padding: 16 }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{formatDate(order.createdAt)}</p>
                        {order.updatedAt && order.updatedAt.getTime() - order.createdAt.getTime() > 60000 && (
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>✏️ Изменён: {formatDate(order.updatedAt)}</p>
                        )}
                        <h3 style={{ fontWeight: 600, color: '#0f172a', margin: '2px 0 0', fontSize: 15 }}>{order.outletName}</h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 9999, background: sc.bg, color: sc.text, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        <StatusIcon style={{ width: 14, height: 14 }} />
                        {statusConfig.label}
                      </div>
                    </div>

                    {/* Estimated delivery */}
                    {order.estimatedDelivery && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: '#1d4ed8', background: '#eff6ff', borderRadius: 8, padding: '6px 10px' }}>
                        <TruckIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                        Время доставки: <strong>{order.estimatedDelivery}</strong>
                      </div>
                    )}

                    {/* Delivery date */}
                    {!!(order as WorkshopOrder & { deliveryDate?: string }).deliveryDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: '#6d28d9', background: '#f5f3ff', borderRadius: 8, padding: '6px 10px' }}>
                        📅 Дата доставки: <strong>{(order as WorkshopOrder & { deliveryDate?: string }).deliveryDate}</strong>
                      </div>
                    )}

                    {/* Items */}
                    <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', paddingTop: 12, paddingBottom: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {order.items.slice(0, 3).map(item => (
                        <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span style={{ color: '#64748b' }}>{getLocalizedName(item.productName)} × {item.quantity}</span>
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>{item.subtotal.toLocaleString()} ₸</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>+{order.items.length - 3} ещё...</p>
                      )}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div style={{ marginBottom: 8, fontSize: 14, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                        💬 {order.notes}
                      </div>
                    )}

                    {/* Total + Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{order.totalAmount.toLocaleString()} ₸</span>
                      {isPending && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {isSuperowner && order.requiresApproval && !order.approvedBy && (
                            <button
                              onClick={() => handleApproveOrder(order.id)}
                              disabled={approvingId === order.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#dcfce7', color: '#15803d', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                            >
                              ✅ Одобрить
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(order)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            <PencilSquareIcon style={{ width: 15, height: 15, display: 'block' }} />
                            Изменить
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={cancellingId === order.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: cancellingId === order.id ? 'not-allowed' : 'pointer', opacity: cancellingId === order.id ? 0.6 : 1 }}
                          >
                            <XCircleIcon style={{ width: 15, height: 15, display: 'block' }} />
                            {cancellingId === order.id ? '...' : 'Отменить'}
                          </button>
                        </div>
                      )}
                      {!isPending && !isSuperowner && (order.status === 'delivered' || order.status === 'ready') && (
                        <button
                          onClick={() => handleRepeatOrder(order)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <ArrowPathIcon style={{ width: 15, height: 15, display: 'block' }} />
                          Повторить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Edit Order Modal ─── */}
      <AnimatePresence>
        {editingOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setEditingOrder(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 512, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 2rem)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Редактировать заказ</h2>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{editingOrder.outletName}</p>
                </div>
                <button onClick={() => setEditingOrder(null)} style={{ padding: 8, marginRight: -8, borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <XMarkIcon style={{ width: 20, height: 20, color: '#94a3b8' }} />
                </button>
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', minHeight: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {editItems.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>Все позиции удалены</p>
                  )}
                  {editItems.map(item => (
                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: '#f8fafc', borderRadius: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, color: '#0f172a', fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLocalizedName(item.productName)}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{item.price.toLocaleString()} ₸/{item.unit}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => handleEditQty(item.productId, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <MinusIcon style={{ width: 14, height: 14 }} />
                        </button>
                        <EditQtyInput value={item.quantity} onChange={q => handleEditQty(item.productId, q)} />
                        <button onClick={() => handleEditQty(item.productId, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#92400e', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <PlusIcon style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', width: 64, textAlign: 'right', flexShrink: 0 }}>{item.subtotal.toLocaleString()} ₸</span>
                      <button onClick={() => handleEditRemove(item.productId)} style={{ padding: 4, color: '#f87171', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <TrashIcon style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add products */}
                {!showAddPanel ? (
                  <button onClick={() => setShowAddPanel(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', border: '2px dashed #d4a574', borderRadius: 14, color: '#92400e', fontWeight: 600, fontSize: 14, background: 'none', cursor: 'pointer', marginBottom: 16 }}>
                    <PlusIcon style={{ width: 18, height: 18, display: 'block' }} />Добавить позицию
                  </button>
                ) : (
                  <div style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                    {/* Search bar */}
                    <div style={{ position: 'relative', borderBottom: '1px solid #f1f5f9' }}>
                      <MagnifyingGlassIcon style={{ width: 16, height: 16, color: '#94a3b8', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'block' }} />
                      <input type="text" placeholder="Поиск продукции..." value={addSearch} onChange={e => setAddSearch(e.target.value)}
                        style={{ width: '100%', paddingLeft: 36, paddingRight: 36, paddingTop: 11, paddingBottom: 11, fontSize: 14, border: 'none', outline: 'none', background: '#fff', boxSizing: 'border-box' }} autoFocus />
                      <button onClick={() => { setShowAddPanel(false); setAddSearch(''); }}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XMarkIcon style={{ width: 14, height: 14, color: '#64748b', display: 'block' }} />
                      </button>
                    </div>
                    {/* Product grid with images */}
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {availableToAdd.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: '20px 16px' }}>
                          {addSearch ? 'Ничего не найдено' : 'Все продукты уже добавлены'}
                        </p>
                      ) : availableToAdd.map(product => (
                        <button key={product.id} onClick={() => handleAddProduct(product)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #f8fafc' }}>
                          {/* Thumbnail */}
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f5f0eb', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {product.image ? (
                              <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: 20 }}>🥐</span>
                            )}
                          </div>
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLocalizedName(product.name)}</p>
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{product.price.toLocaleString()} ₸ / {product.unit}</p>
                          </div>
                          {/* Add btn */}
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <PlusIcon style={{ width: 14, height: 14, display: 'block' }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div style={{ marginBottom: 12 }}>
                  <Textarea label="Комментарий" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Комментарий к заказу" rows={2} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: '0 0 24px 24px', padding: '12px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: '#64748b' }}>Итого:</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{editTotal.toLocaleString()} ₸</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setEditingOrder(null)}
                    style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                  >Отмена</button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit || editItems.length === 0}
                    style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: savingEdit || editItems.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: savingEdit || editItems.length === 0 ? '#94a3b8' : '#fff', fontWeight: 600, fontSize: 15, cursor: savingEdit || editItems.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {savingEdit ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrdersPage;
