import { useI18n } from '@/i18n';
import { Container } from '@/components/Container';
import { contactLinks } from '@/lib/links';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer id="contacts" className="border-t border-[#E8DDD4] bg-[#2C1810] py-16">
      <Container className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-2xl">☕</span>
            Brewly
          </p>
          <p className="mt-2 text-sm text-white/60">hello@brewly.app</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
            <a href={contactLinks.whatsapp} className="underline-offset-4 hover:text-[#C68B59] transition-colors font-medium" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={contactLinks.telegram} className="underline-offset-4 hover:text-[#C68B59] transition-colors font-medium" target="_blank" rel="noreferrer">
              Telegram
            </a>
          </div>
        </div>
        <nav aria-label={t.footer.navLabel} className="flex flex-wrap gap-6 text-sm text-white/60">
          {t.footer.links.map((item, index) => (
            <a key={index} href={item.href} className="transition-colors duration-200 hover:text-[#C68B59]">
              {item.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-white/40">{t.footer.copyright}</p>
      </Container>
    </footer>
  );
}

