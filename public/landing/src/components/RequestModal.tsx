import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/i18n';

const WHATSAPP_NUMBER = '77053096206';

type Plan = 'subscription' | 'standard' | 'premium' | null;

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: Plan;
}

export function RequestModal({ isOpen, onClose, selectedPlan = null }: RequestModalProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    coffeeshopName: '',
    plan: selectedPlan || 'standard' as Plan,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update plan when modal opens with a specific plan
  useEffect(() => {
    if (selectedPlan) {
      setFormData(prev => ({ ...prev, plan: selectedPlan }));
    }
  }, [selectedPlan]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getPlanLabel = (plan: Plan) => {
    switch (plan) {
      case 'subscription': return t.modal.plans.subscription;
      case 'standard': return t.modal.plans.standard;
      case 'premium': return t.modal.plans.premium;
      default: return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const message = t.modal.whatsappMessage
      .replace('{name}', formData.name)
      .replace('{coffeeshopName}', formData.coffeeshopName)
      .replace('{city}', formData.city)
      .replace('{plan}', getPlanLabel(formData.plan));

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
    
    setIsSubmitting(false);
    onClose();
    
    // Reset form
    setFormData({
      name: '',
      city: '',
      coffeeshopName: '',
      plan: 'standard',
    });
  };

  const isFormValid = formData.name.trim() && formData.city.trim() && formData.coffeeshopName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="gradient-coffee p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label={t.modal.close}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold">{t.modal.title}</h2>
          <p className="text-white/80 mt-1">{t.modal.subtitle}</p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#4A2C2A] mb-2">
              {t.modal.fields.name} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t.modal.placeholders.name}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DDD4] focus:border-[#C68B59] focus:ring-2 focus:ring-[#C68B59]/20 outline-none transition-all"
              required
            />
          </div>

          {/* Coffee Shop Name */}
          <div>
            <label className="block text-sm font-medium text-[#4A2C2A] mb-2">
              {t.modal.fields.coffeeshopName} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.coffeeshopName}
              onChange={(e) => setFormData({ ...formData, coffeeshopName: e.target.value })}
              placeholder={t.modal.placeholders.coffeeshopName}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DDD4] focus:border-[#C68B59] focus:ring-2 focus:ring-[#C68B59]/20 outline-none transition-all"
              required
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-[#4A2C2A] mb-2">
              {t.modal.fields.city} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder={t.modal.placeholders.city}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DDD4] focus:border-[#C68B59] focus:ring-2 focus:ring-[#C68B59]/20 outline-none transition-all"
              required
            />
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-[#4A2C2A] mb-2">
              {t.modal.fields.plan}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['subscription', 'standard', 'premium'] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setFormData({ ...formData, plan })}
                  className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    formData.plan === plan
                      ? 'bg-[#6B4423] text-white shadow-lg'
                      : 'bg-[#E8DDD4]/50 text-[#4A2C2A] hover:bg-[#E8DDD4]'
                  }`}
                >
                  {getPlanLabel(plan)}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full py-4 rounded-xl gradient-coffee text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSubmitting ? t.modal.sending : t.modal.submit}
          </button>

          {/* Privacy Note */}
          <p className="text-xs text-center text-[#4A2C2A]/50">
            {t.modal.privacy}
          </p>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
