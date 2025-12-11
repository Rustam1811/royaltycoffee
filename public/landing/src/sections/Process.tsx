import { useI18n } from '@/i18n';
import { Container } from '@/components/Container';
import { SectionHeader } from '@/components/SectionHeader';

export function Process() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-[#FFFBF7]">
      <Container>
        <SectionHeader
          eyebrow={t.process.eyebrow}
          title={t.process.title}
          description={t.process.description}
          align="center"
        />

        <div className="mt-20">
          {/* Timeline */}
          <div className="relative">
            {/* Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C68B59] via-[#6B4423] to-[#2C1810] hidden lg:block" />

            <div className="space-y-12 lg:space-y-0">
              {t.process.steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`relative lg:flex lg:items-center lg:gap-12 ${
                    index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right lg:pr-16' : 'lg:pl-16'}`}>
                    <div className="coffee-card p-8 inline-block w-full lg:max-w-md">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">{step.icon}</span>
                        <div>
                          <span className="text-sm font-medium text-[#C68B59]">
                            {step.number}
                          </span>
                          <h3 className="text-xl font-bold text-[#2C1810]">
                            {step.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-[#4A2C2A]/70 mb-4">
                        {step.description}
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8DDD4]/50 text-sm text-[#6B4423]">
                        ⏱️ {step.duration}
                      </div>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#6B4423] border-4 border-[#FFFBF7] items-center justify-center text-white font-bold shadow-lg">
                    {step.number}
                  </div>

                  {/* Empty space for alternating layout */}
                  <div className="flex-1 hidden lg:block" />
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-20 text-center">
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#6B4423] to-[#4A2C2A] text-white">
              <span className="text-4xl font-bold">{t.process.summary.value}</span>
              <div className="text-left">
                <div className="font-semibold">{t.process.summary.label}</div>
                <div className="text-sm text-white/70">{t.process.summary.description}</div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
