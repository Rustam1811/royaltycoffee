import { useI18n } from '@/i18n';
import { Container } from '@/components/Container';

export function Story() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-[#2C1810] text-white overflow-hidden">
      <Container>
        <div className="max-w-4xl mx-auto">
          {/* Quote marks */}
          <div className="text-[#C68B59] text-8xl font-serif leading-none mb-8">"</div>
          
          {/* Story */}
          <blockquote className="text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed text-white/90">
            {t.story.quote}
          </blockquote>

          {/* Founder */}
          <div className="mt-12 flex items-center gap-6">
            <img
              src="/testimonials/founder.jpg"
              alt={t.story.founder}
              className="w-20 h-20 rounded-full object-cover border-4 border-[#C68B59]"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Ccircle fill='%234A2C2A' cx='40' cy='40' r='40'/%3E%3Ctext x='50%25' y='55%25' font-family='system-ui' font-size='24' fill='%23C68B59' text-anchor='middle'%3E☕%3C/text%3E%3C/svg%3E";
              }}
            />
            <div>
              <div className="text-xl font-semibold text-white">
                {t.story.founder}
              </div>
              <div className="text-[#C68B59]">
                {t.story.founderRole}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/10">
            {t.story.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#C68B59]">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-white/60">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
