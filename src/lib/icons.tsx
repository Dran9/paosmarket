import {
  GlassWater, Milk, Wheat, Beef, Cookie, ShoppingBasket, Sparkles, Package,
  type LucideIcon,
} from 'lucide-react';

export const CAT_ICON_MAP: Record<string, LucideIcon> = {
  Bebidas:   GlassWater,
  Lacteos:   Milk,
  Panaderia: Wheat,
  Carnes:    Beef,
  Snacks:    Cookie,
  Abarrotes: ShoppingBasket,
  Limpieza:  Sparkles,
};

export function CategoryIcon({
  category, size = 16, className,
}: {
  category: string; size?: number; className?: string;
}) {
  const Icon = CAT_ICON_MAP[category] ?? Package;
  return <Icon size={size} className={className} />;
}
