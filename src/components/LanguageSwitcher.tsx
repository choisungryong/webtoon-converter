'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { ChangeEvent, useTransition } from 'react';

export default function LanguageSwitcher() {
    const t = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;
        startTransition(() => {
            // Replace the locale in the pathname
            // e.g. /ko/about -> /en/about
            // This is a naive implementation, a more robust one would use next-intl's Link/usePathname
            // But for now, we'll manually replace the prefix
            const segments = pathname.split('/');
            segments[1] = nextLocale;
            router.replace(segments.join('/'));
        });
    };

    return (
        <label className="relative inline-flex items-center">
            <select
                defaultValue={locale}
                className="appearance-none bg-transparent py-1 pl-2 pr-6 text-sm font-medium text-gray-400 focus:outline-none focus:text-white cursor-pointer"
                onChange={onSelectChange}
                disabled={isPending}
            >
                <option value="ko" className="bg-[#1a1a1a] text-white">한국어</option>
                <option value="en" className="bg-[#1a1a1a] text-white">English</option>
            </select>
            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                ▼
            </span>
        </label>
    );
}
