/**
 * Payment Page for Mercado Pago
 * 
 * Shows after order submission, handles payment flow
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { 
  createPaymentPreference, 
  getPaymentStatus,
  getStatusDisplay,
  type PaymentStatus,
} from '@/services/mercadopago';

interface LocationState {
  orderId?: string;
  amount?: number;
  items?: { menuItemId: string; name: string; quantity: number; totalPrice: number }[];
}

export default function PaymentPage() {
  const location = useLocation<LocationState>();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  
  // Determine base path from current URL
  const basePath = location.pathname.startsWith('/srpapa') ? '/srpapa' : '/admin';
  
  // Get order info from location state or URL params
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('orderId') || location.state?.orderId;
  const orderAmount = location.state?.amount;
  const orderItems = location.state?.items;
  const isReturnFromMP = searchParams.has('collection_id') || 
                         searchParams.has('payment_id') ||
                         location.pathname.includes('/payment/success') ||
                         location.pathname.includes('/payment/failure') ||
                         location.pathname.includes('/payment/pending');

  const initiatePayment = useCallback(async () => {
    if (!orderId || !orderItems || !orderAmount) return;
    
    try {
      setLoading(true);
      
      const preference = await createPaymentPreference({
        orderId,
        items: orderItems,
        amount: orderAmount,
      });

      // Redirect to Mercado Pago checkout
      window.location.href = preference.initPoint;
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago');
      setLoading(false);
    }
  }, [orderId, orderItems, orderAmount]);

  const checkPaymentStatusNow = useCallback(async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      const status = await getPaymentStatus(orderId);
      setPaymentStatus(status);
    } catch (err) {
      console.error('Status check error:', err);
      setPaymentStatus({ status: 'pending' });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setError('No se encontró el pedido');
      setLoading(false);
      return;
    }

    if (isReturnFromMP) {
      checkPaymentStatusNow();
    } else if (orderItems && orderAmount) {
      initiatePayment();
    } else {
      checkPaymentStatusNow();
    }
  }, [orderId, isReturnFromMP, orderItems, orderAmount, checkPaymentStatusNow, initiatePayment]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">
            {isReturnFromMP ? 'Verificando pago...' : 'Preparando pago...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center"
        >
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => history.push('\$\{basePath\}/menu')}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold"
          >
            Volver al menú
          </button>
        </motion.div>
      </div>
    );
  }

  // Payment status display
  const statusInfo = paymentStatus ? getStatusDisplay(paymentStatus.status) : null;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center"
      >
        {/* Status Icon */}
        <div className="mb-6">
          {paymentStatus?.status === 'approved' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto" />
            </motion.div>
          )}
          {paymentStatus?.status === 'pending' && (
            <ClockIcon className="w-20 h-20 text-amber-500 mx-auto" />
          )}
          {paymentStatus?.status === 'in_process' && (
            <ArrowPathIcon className="w-20 h-20 text-amber-500 mx-auto animate-spin" />
          )}
          {(paymentStatus?.status === 'rejected' || paymentStatus?.status === 'cancelled') && (
            <ExclamationCircleIcon className="w-20 h-20 text-red-500 mx-auto" />
          )}
        </div>

        {/* Status Text */}
        <h2 className={`text-2xl font-bold mb-2 ${statusInfo?.color || 'text-slate-800'}`}>
          {statusInfo?.label || 'Procesando...'}
        </h2>

        {/* Order Number */}
        <p className="text-slate-500 mb-6">
          Pedido #{orderId?.slice(-6).toUpperCase()}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          {paymentStatus?.status === 'approved' && (
            <>
              <p className="text-green-600 mb-4">
                ¡Tu pedido está siendo preparado!
              </p>
              <button
                onClick={() => history.push(`${basePath}/orders`)}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold"
              >
                Ver mis pedidos
              </button>
            </>
          )}

          {(paymentStatus?.status === 'pending' || paymentStatus?.status === 'in_process') && (
            <>
              <p className="text-amber-600 mb-4">
                Esperando confirmación del pago...
              </p>
              <button
                onClick={checkPaymentStatusNow}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <ArrowPathIcon className="w-5 h-5" />
                Actualizar estado
              </button>
              <button
                onClick={() => history.push(`${basePath}/orders`)}
                className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                Ver mis pedidos
              </button>
            </>
          )}

          {(paymentStatus?.status === 'rejected' || paymentStatus?.status === 'cancelled') && (
            <>
              <p className="text-red-600 mb-4">
                {paymentStatus.status === 'rejected' 
                  ? 'El pago fue rechazado. Intenta con otro método.'
                  : 'El pago fue cancelado.'}
              </p>
              <button
                onClick={initiatePayment}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <CreditCardIcon className="w-5 h-5" />
                Reintentar pago
              </button>
              <button
                onClick={() => history.push(`${basePath}/menu`)}
                className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                Volver al menú
              </button>
            </>
          )}
        </div>

        {/* Payment ID */}
        {paymentStatus?.paymentId && (
          <p className="text-xs text-slate-400 mt-6">
            ID de pago: {paymentStatus.paymentId}
          </p>
        )}
      </motion.div>
    </div>
  );
}
