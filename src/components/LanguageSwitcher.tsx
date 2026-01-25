'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
    const t = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const handleLocaleChange = (newLocale: string) => {
        if (newLocale === locale) return;

        startTransition(() => {
            // Replace the locale in the pathname
            // e.g. /ko/about -> /en/about
            const segments = pathname.split('/');
            segments[1] = newLocale;
            router.replace(segments.join('/'));
        });
    };

    return (
        <div className="relative inline-flex items-center rounded-full bg-white/10 p-1 backdrop-blur-md transition-all hover:bg-white/20">
            {/* Background Slider Indicator */}
            <div
                className={`absolute h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-neonYellow/90 shadow-lg transition-all duration-300 ease-out ${locale === 'en' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                    }`}
            />

            {/* KR Button */}
            <button
                onClick={() => handleLocaleChange('ko')}
                disabled={isPending}
                className={`relative z-10 flex h-7 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${locale === 'ko' ? 'text-black' : 'text-gray-400 hover:text-white'
                    }`}
            >
                KR
            </button>

            {/* EN Button */}
            <button
                onClick={() => handleLocaleChange('en')}
                disabled={isPending}
                className={`relative z-10 flex h-7 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${locale === 'en' ? 'text-black' : 'text-gray-400 hover:text-white'
                    }`}
            >
                EN
            </button>
        </div>
    );
}
