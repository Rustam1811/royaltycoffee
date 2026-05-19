import { useI18n } from '@/i18n';
import { Container } from '../components/Container';
import { SectionHeader } from '../components/SectionHeader';
import { Icon } from '../components/Icon';

export function WhyUs() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-[#FFF8F0]">
      <Container>
        <SectionHeader
          eyebrow={t.whyUs.eyebrow}
          title={t.whyUs.title}
          description={t.whyUs.description}
        />

        {/* Competitors Comparison */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {t.whyUs.competitors.map((competitor, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 border border-[#E8DDD4]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <span className="text-xl">❌</span>
                </div>
                <h3 className="font-bold text-[#2C1810] text-lg">
                  {competitor.name}
                </h3>
              </div>
              <ul className="space-y-3">
                {competitor.problems.map((problem, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[#4A2C2A]/70 text-sm">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Brewly Advantages */}
        <div className="mt-12">
          <div className="bg-gradient-to-br from-[#E8DDD4] to-[#D4C4B0] rounded-3xl p-8 md:p-12 border-2 border-[#C68B59]/30 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl gradient-coffee flex items-center justify-center shadow-lg">
                <span className="text-3xl">☕</span>
              </div>
              <div>
                <h3 className="font-bold text-[#2C1810] text-2xl">{t.whyUs.brewlyTitle}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {t.whyUs.brewlyFeatures.map((feature, idx) => (
                    <span key={idx} className="text-sm text-[#6B4423] bg-white/50 px-2 py-1 rounded">✓ {feature}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {t.whyUs.advantages.map((advantage, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                    <Icon name={advantage.icon} className="w-6 h-6 text-[#6B4423]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#2C1810] mb-1">
                      {advantage.title}
                    </h4>
                    <p className="text-sm text-[#4A2C2A]/80">
                      {advantage.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
