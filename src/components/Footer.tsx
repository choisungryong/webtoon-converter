import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');
  const tHeader = useTranslations('Header');

  return (
    <footer className="border-t border-white/10 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Links */}
        <nav className="mb-6 flex flex-wrap justify-center gap-4 md:gap-8">
          <Link
            href="/about"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            {tHeader('service_intro')}
          </Link>
          <Link
            href="/gallery"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            {tHeader('gallery')}
          </Link>
          <Link
            href="/faq"
            className="text-sm font-semibold text-neonYellow transition-colors hover:text-neonYellow/80"
          >
            {tHeader('faq')}
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            {t('privacy')}
          </Link>
          <Link
            href="/terms"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            {t('terms')}
          </Link>
          <Link
            href="/contact"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            {tHeader('contact')}
          </Link>
        </nav>

        {/* Disclaimer */}
        <p className="mx-auto mb-4 max-w-2xl text-center text-xs text-gray-500">
          {t('disclaimer')}
        </p>

        <p className="text-center text-xs text-gray-600">© 2026 BanaToon. {t('copyright')}</p>
      </div>
    </footer>
  );
}
