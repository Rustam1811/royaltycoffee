import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ClockIcon } from '@heroicons/react/24/outline';
import { 
  OrderStatus, 
  OrderType,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_META,
} from '@/types/orderStatus';

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  orderType: OrderType;
  compact?: boolean;
}

/**
 * Timeline статусов заказа
 * 
 * Показывает прогресс выполнения заказа в виде временной шкалы
 * Адаптируется под тип заказа (доставка/самовывоз)
 */
export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  currentStatus,
  orderType,
  compact = false,
}) => {
  const statusFlow = ORDER_STATUS_FLOW[orderType];
  const currentIndex = statusFlow.indexOf(currentStatus);
  
  return (
    <div className={`${compact ? 'p-3' : 'p-6'} bg-white rounded-lg border border-gray-200`}>
      {!compact && (
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Статус заказа
        </h3>
      )}
      
      <div className="relative">
        {/* Вертикальная линия */}
        <div className="absolute left-[15px] top-[10px] bottom-[10px] w-0.5 bg-gray-200" />
        
        {/* Прогресс линия */}
        <motion.div
          className="absolute left-[15px] top-[10px] w-0.5 bg-gradient-to-b from-green-500 to-blue-500"
          initial={{ height: 0 }}
          animate={{
            height: `${(currentIndex / (statusFlow.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        
        {/* Статусы */}
        <div className="space-y-4">
          {statusFlow.map((status, index) => {
            const statusMeta = ORDER_STATUS_META[status];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            
            return (
              <motion.div
                key={status}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start gap-3"
              >
                {/* Иконка статуса */}
                <div className="relative z-10 flex-shrink-0">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-md"
                    >
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(59, 130, 246, 0.4)',
                          '0 0 0 10px rgba(59, 130, 246, 0)',
                          '0 0 0 0 rgba(59, 130, 246, 0)',
                        ],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
                    >
                      <span className="text-white text-lg">{statusMeta.icon}</span>
                    </motion.div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Информация о статусе */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className={`
                      text-sm font-medium
                      ${isCompleted ? 'text-green-700' : ''}
                      ${isCurrent ? 'text-blue-700 font-semibold' : ''}
                      ${isPending ? 'text-gray-400' : ''}
                    `}>
                      {statusMeta.label}
                    </h4>
                    
                    {isCurrent && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"
                      >
                        Сейчас
                      </motion.span>
                    )}
                  </div>
                  
                  {!compact && (
                    <p className={`
                      text-xs mt-0.5
                      ${isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'}
                    `}>
                      {statusMeta.description}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Прогресс бар (опционально) */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Прогресс</span>
            <span className="font-medium">
              {Math.round((currentIndex / (statusFlow.length - 1)) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{
                width: `${(currentIndex / (statusFlow.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
