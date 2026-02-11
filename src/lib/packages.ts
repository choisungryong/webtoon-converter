export interface CreditPackage {
  id: string;
  name: string;
  nameKey: string; // i18n key
  credits: number;
  bonusCredits: number;
  price: number; // KRW
  pricePerCredit: number;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: '스타터',
    nameKey: 'package_starter',
    credits: 10,
    bonusCredits: 0,
    price: 1900,
    pricePerCredit: 190,
  },
  {
    id: 'basic',
    name: '베이직',
    nameKey: 'package_basic',
    credits: 30,
    bonusCredits: 3,
    price: 4900,
    pricePerCredit: 149,
    popular: true,
  },
  {
    id: 'pro',
    name: '프로',
    nameKey: 'package_pro',
    credits: 60,
    bonusCredits: 10,
    price: 9900,
    pricePerCredit: 141,
  },
  {
    id: 'mega',
    name: '메가',
    nameKey: 'package_mega',
    credits: 150,
    bonusCredits: 30,
    price: 19900,
    pricePerCredit: 111,
  },
];

export function getPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
