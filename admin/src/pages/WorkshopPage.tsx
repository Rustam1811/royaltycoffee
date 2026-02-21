import React from 'react';
import { motion } from 'framer-motion';
import { BuildingOffice2Icon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

/**
 * Страница-редирект на модуль цеха
 * Показывается в админке для superowner
 */
const WorkshopPage: React.FC = () => {
  const workshopUrl = '/workshop/';

  const handleGoToWorkshop = () => {
    window.open(workshopUrl, '_blank');
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BuildingOffice2Icon className="w-10 h-10 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Модуль Цеха
        </h1>

        <p className="text-slate-500 mb-6">
          Управляйте заказами продукции от ваших клиентов. 
          Круассаны, выпечка, сэндвичи и другая продукция.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleGoToWorkshop}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
          >
            <BuildingOffice2Icon className="w-5 h-5" />
            Открыть цех
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </button>

          <a
            href={workshopUrl}
            className="block w-full text-center px-6 py-3 border-2 border-amber-500 text-amber-600 font-semibold rounded-xl hover:bg-amber-50 transition-colors"
          >
            Открыть в этом окне
          </a>
        </div>

        <div className="mt-8 p-4 bg-white rounded-xl text-left">
          <h3 className="font-semibold text-slate-900 mb-2">Возможности:</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>📦 Управление заказами от клиентов</li>
            <li>🥐 Каталог продукции цеха</li>
            <li>👥 Управление клиентами и их точками</li>
            <li>📊 Аналитика продаж</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkshopPage;
