// Categories the app records into on its own, so they can't be renamed or
// deleted. Plain constants, so client forms can tell them apart too.

// Every inventory item belongs to this category, so installment payments land in it
export const SHOP_CATEGORY_NAME = "Lojinha";

// Event payments and expenses land in this category, recorded from the Eventos screen
export const EVENTS_CATEGORY_NAME = "Eventos";

export const LOCKED_CATEGORY_NAMES = [SHOP_CATEGORY_NAME, EVENTS_CATEGORY_NAME];
