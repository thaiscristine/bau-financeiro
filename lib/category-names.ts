// Categories the app records into on its own, so they can't be renamed or
// deleted. Plain constants, so client forms can tell them apart too.

// Every inventory item belongs to this category, so installment payments land in it
export const SHOP_CATEGORY_NAME = "Lojinha";

// Event payments and expenses land in this category, recorded from the Eventos screen
export const EVENTS_CATEGORY_NAME = "Eventos";

// Fixed cost payments land in this category, recorded from the Custos fixos screen
export const FIXED_COSTS_CATEGORY_NAME = "Custos fixos";

// Categories recorded only from their own screen, so their rules stay put and
// new entries point there instead
export const SCREEN_CATEGORIES: Record<string, { screen: string; href: string; where: string }> = {
  [EVENTS_CATEGORY_NAME]: { screen: "Eventos", href: "/events", where: "em cada evento" },
  [FIXED_COSTS_CATEGORY_NAME]: { screen: "Custos fixos", href: "/fixed-costs", where: "mês a mês" },
};

export const LOCKED_CATEGORY_NAMES = [
  SHOP_CATEGORY_NAME,
  EVENTS_CATEGORY_NAME,
  FIXED_COSTS_CATEGORY_NAME,
];
