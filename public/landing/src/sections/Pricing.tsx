import { useI18n } from '@/i18n';
import { Container } from '@/components/Container';
import { SectionHeader } from '@/components/SectionHeader';
import { Button } from '@/components/Button';
import { useModal } from '@/App';

type PlanKey = 'subscription' | 'standard' | 'premium';

export function Pricing() {
  const { t } = useI18n();
  const { openModal } = useModal();

  const plans: Array<{
    key: PlanKey;
    price: string;
    period: string;
    name: string;
    description: string;
    features: string[];
    popular: boolean;
    support?: { price: string; description: string };
  }> = [
    {
      key: 'subscription',
      price: t.pricing.plans.subscription.price,
      period: t.pricing.plans.subscription.period,
      name: t.pricing.plans.subscription.name,
      description: t.pricing.plans.subscription.description,
      features: t.pricing.plans.subscription.features,
      popular: false,
    },
    {
      key: 'standard',
      price: t.pricing.plans.standard.price,
      period: t.pricing.plans.standard.period,
      name: t.pricing.plans.standard.name,
      description: t.pricing.plans.standard.description,
      features: t.pricing.plans.standard.features,
      popular: true,
      support: t.pricing.plans.standard.support,
    },
    {
      key: 'premium',
      price: t.pricing.plans.premium.price,
      period: t.pricing.plans.premium.period,
      name: t.pricing.plans.premium.name,
      description: t.pricing.plans.premium.description,
      features: t.pricing.plans.premium.features,
      popular: false,
      support: t.pricing.plans.premium.support,
    },
  ];

  return (
    <section id="pricing" className="bg-[#FFFBF7] py-24 sm:py-32">
      <Container>
        <SectionHeader
          eyebrow={t.pricing.eyebrow}
          title={t.pricing.title}
          description={t.pricing.description}
          align="center"
        />
        
        <div className="mx-auto mt-16 grid gap-8 md:grid-cols-3 max-w-6xl">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-3xl border-2 bg-white p-8 shadow-[0_8px_40px_rgba(44,24,16,0.1)] transition-all duration-500 hover:shadow-[0_16px_60px_rgba(44,24,16,0.15)] hover:-translate-y-1 ${
                plan.popular
                  ? 'border-[#C68B59] ring-2 ring-[#C68B59]/20'
                  : 'border-[#C68B59]/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-[#C68B59] px-4 py-1.5 text-xs font-semibold text-white">
                    {t.pricing.popular}
                  </span>
                </div>
              )}
              
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C68B59]">
                {plan.name}
              </p>
              
              <h3 className="mt-4 text-4xl font-bold text-[#2C1810]">
                {plan.price}
                {plan.period && (
                  <span className="text-base font-normal text-[#4A2C2A]/50"> {plan.period}</span>
                )}
              </h3>
              
              <p className="mt-3 text-sm leading-relaxed text-[#4A2C2A]/70">
                {plan.description}
              </p>
              
              <ul className="mt-6 space-y-3 text-left text-sm text-[#4A2C2A]/80">
                {plan.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#C68B59] flex-shrink-0" aria-hidden="true" />
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* Tech Support Info for Standard and Premium */}
              {plan.support && (
                <div className="mt-6 p-4 rounded-xl bg-[#E8DDD4]/40 border border-[#E8DDD4]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🛠️</span>
                    <span className="text-sm font-semibold text-[#2C1810]">{t.pricing.supportLabel}</span>
                  </div>
                  <div className="text-lg font-bold text-[#C68B59]">{plan.support.price}</div>
                  <p className="mt-1 text-xs text-[#4A2C2A]/70 leading-relaxed">{plan.support.description}</p>
                </div>
              )}
              
              <div className="mt-8">
                <Button 
                  onClick={() => openModal(plan.key)}
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="w-full justify-center"
                >
                  {t.pricing.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Guarantee */}
        <div className="mx-auto mt-12 max-w-xl">
          <div className="p-6 rounded-2xl bg-[#E8DDD4]/30 border border-[#E8DDD4] text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-semibold text-[#2C1810]">{t.pricing.guarantee.title}</div>
                <div className="text-sm text-[#4A2C2A]/70">{t.pricing.guarantee.description}</div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

