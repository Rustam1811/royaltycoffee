import { useI18n } from '@/i18n';
import { Container } from '@/components/Container';
import { SectionHeader } from '@/components/SectionHeader';
import { Accordion } from '@/components/Accordion';

export function FAQ() {
  const { t } = useI18n();

  return (
    <section id="faq" className="bg-[#FFF8F0] py-24 sm:py-32">
      <Container>
        <SectionHeader
          eyebrow={t.faq.eyebrow}
          title={t.faq.title}
          description={t.faq.description}
          align="center"
        />
        <div className="mx-auto mt-16 max-w-3xl">
          <Accordion items={t.faq.items} />
        </div>
      </Container>
    </section>
  );
}

