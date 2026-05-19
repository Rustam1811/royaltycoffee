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
import { Card, CardBody, Badge, Button, Textarea, WorkshopLoader } from '@/components/ui';
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
        min={1}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value.toString()); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
      className="w-10 h-7 text-center text-sm font-semibold text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-text"
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <h1 className="text-xl font-bold">{isSuperowner ? 'Все заказы' : 'Мои заказы'}</h1>
        <p className="text-white/60 text-sm mt-0.5">{isSuperowner ? 'Управление и одобрение заказов' : 'История заказов продукции'}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10 overflow-x-auto">
        {([
          ...(isSuperowner ? [{ key: 'needs_approval' as const, label: '⚠️ Одобрение' }] : []),
          { key: 'all' as const, label: 'Все' },
          { key: 'active' as const, label: 'Активные' },
          { key: 'completed' as const, label: 'Завершённые' },
        ]).map(f => {
          const count = f.key === 'needs_approval'
            ? orders.filter(o => o.requiresApproval && !o.approvedBy && o.status === 'pending').length
            : undefined;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5
                ${filter === f.key
                  ? 'bg-workshop-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
              {count !== undefined && count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.key ? 'bg-white/20' : 'bg-amber-200 text-amber-800'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="px-4 py-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <ClipboardDocumentListIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Нет заказов
              </h3>
              <p className="text-slate-500">
                {filter === 'active' ? 'Нет активных заказов' : 'История заказов пуста'}
              </p>
            </CardBody>
          </Card>
        ) : (
          filteredOrders.map((order, index) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            const isPending = order.status === 'pending';
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardBody>
                    {/* Approval banner (for superowner) */}
                    {order.requiresApproval && order.status === 'pending' && isSuperowner && (
                      <div className={`-mx-4 -mt-4 mb-3 px-4 py-2 text-xs font-semibold rounded-t-xl ${
                        order.approvedBy
                          ? 'bg-green-50 text-green-700 border-b border-green-100'
                          : 'bg-amber-50 text-amber-700 border-b border-amber-100'
                      }`}>
                        {order.approvedBy
                          ? '✅ Одобрено руководителем'
                          : `⚠️ Требуется одобрение (сумма ${order.totalAmount.toLocaleString()} ₸)`
                        }
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-slate-500">
                          {formatDate(order.createdAt)}
                        </p>
                        {order.updatedAt && order.updatedAt.getTime() - order.createdAt.getTime() > 60000 && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            ✏️ Изменён: {formatDate(order.updatedAt)}
                          </p>
                        )}
                        <h3 className="font-semibold text-slate-900 mt-0.5">
                          {order.outletName}
                        </h3>
                      </div>
                      <Badge variant={statusConfig.variant}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Estimated delivery */}
                    {order.estimatedDelivery && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5">
                        <TruckIcon className="w-3.5 h-3.5 shrink-0" />
                        Время доставки: <strong>{order.estimatedDelivery}</strong>
                      </div>
                    )}

                    {/* Client-requested delivery date */}
                    {(order as any).deliveryDate && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-violet-700 bg-violet-50 rounded-lg px-2.5 py-1.5">
                        📅 Дата доставки: <strong>{(order as any).deliveryDate}</strong>
                      </div>
                    )}
                    
                    {/* Items Preview */}
                    <div className="space-y-1 py-3 border-y border-slate-100">
                      {order.items.slice(0, 3).map(item => (
                        <div key={item.productId} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {getLocalizedName(item.productName)} × {item.quantity}
                          </span>
                          <span className="text-slate-900 font-medium">
                            {item.subtotal.toLocaleString()} ₸
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-slate-500">
                          +{order.items.length - 3} ещё...
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                        💬 {order.notes}
                      </div>
                    )}
                    
                    {/* Total + Actions */}
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-lg font-bold text-slate-900">
                        {order.totalAmount.toLocaleString()} ₸
                      </span>

                      {/* Cancel & Edit buttons for pending orders */}
                      {isPending && (
                        <div className="flex gap-2">
                          {/* Approval button for superowner on big orders */}
                          {isSuperowner && order.requiresApproval && !order.approvedBy && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveOrder(order.id)}
                              loading={approvingId === order.id}
                              disabled={approvingId === order.id}
                            >
                              ✅ Одобрить
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(order)}
                          >
                            <PencilSquareIcon className="w-4 h-4 mr-1" />
                            Изменить
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleCancel(order.id)}
                            loading={cancellingId === order.id}
                            disabled={cancellingId === order.id}
                          >
                            <XCircleIcon className="w-4 h-4 mr-1" />
                            Отменить
                          </Button>
                        </div>
                      )}

                      {/* Repeat order button for delivered orders */}
                      {!isPending && !isSuperowner && (order.status === 'delivered' || order.status === 'ready') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRepeatOrder(order)}
                        >
                          <ArrowPathIcon className="w-4 h-4 mr-1" />
                          Повторить
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Edit Order Modal ─── */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setEditingOrder(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-lg flex flex-col"
              style={{ maxHeight: 'calc(100vh - 2rem)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header — pinned */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Редактировать заказ</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{editingOrder.outletName}</p>
                </div>
                <button onClick={() => setEditingOrder(null)} className="p-2 -mr-2 rounded-xl hover:bg-slate-100">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                {/* Current items */}
                <div className="space-y-2 mb-4">
                  {editItems.length === 0 && (
                    <p className="text-center text-slate-400 py-4">Все позиции удалены</p>
                  )}
                  {editItems.map(item => (
                    <div key={item.productId} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{getLocalizedName(item.productName)}</p>
                        <p className="text-xs text-slate-400">{item.price.toLocaleString()} ₸/{item.unit}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditQty(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all"
                        >
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <EditQtyInput value={item.quantity} onChange={q => handleEditQty(item.productId, q)} />
                        <button
                          onClick={() => handleEditQty(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-workshop-500 text-white flex items-center justify-center hover:bg-workshop-600 active:scale-95 transition-all"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-16 text-right shrink-0">
                        {item.subtotal.toLocaleString()} ₸
                      </span>
                      <button
                        onClick={() => handleEditRemove(item.productId)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ── Add new products section ── */}
                {!showAddPanel ? (
                  <button
                    onClick={() => setShowAddPanel(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-workshop-300 rounded-xl text-workshop-600 font-medium text-sm hover:bg-workshop-50 active:scale-[0.98] transition-all mb-4"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Добавить позицию
                  </button>
                ) : (
                  <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Поиск продукции..."
                        value={addSearch}
                        onChange={e => setAddSearch(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 text-sm border-b border-slate-200 focus:outline-none focus:ring-0"
                        autoFocus
                      />
                      <button
                        onClick={() => { setShowAddPanel(false); setAddSearch(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100"
                      >
                        <XMarkIcon className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {availableToAdd.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-4">
                          {addSearch ? 'Ничего не найдено' : 'Все продукты уже добавлены'}
                        </p>
                      ) : (
                        availableToAdd.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleAddProduct(product)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">{getLocalizedName(product.name)}</p>
                              <p className="text-xs text-slate-400">{product.price.toLocaleString()} ₸/{product.unit}</p>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-workshop-500 text-white flex items-center justify-center shrink-0 ml-2">
                              <PlusIcon className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="mb-3">
                  <Textarea
                    label="Комментарий"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Комментарий к заказу"
                    rows={2}
                  />
                </div>
              </div>

              {/* Footer — pinned above BottomNavBar */}
              <div className="shrink-0 border-t border-slate-200 bg-white rounded-b-3xl px-5 pt-3 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">Итого:</span>
                  <span className="text-xl font-bold text-slate-900">{editTotal.toLocaleString()} ₸</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setEditingOrder(null)}>Отмена</Button>
                  <Button
                    fullWidth
                    onClick={handleSaveEdit}
                    loading={savingEdit}
                    disabled={savingEdit || editItems.length === 0}
                  >
                    Сохранить
                  </Button>
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
