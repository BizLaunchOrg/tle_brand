/** Persisted cart line (re-hydrated from catalog by slug) */
export type PersistedCartLine = {
  slug: string
  variantId?: string
  quantity: number
}

export type ShopPersistedState = {
  cart: PersistedCartLine[]
  favoriteSlugs: string[]
}

const KEY = 'tle_brand_shop_v1'

export function loadShopState(): ShopPersistedState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object') return null
    const cart = (data as ShopPersistedState).cart
    const favoriteSlugs = (data as ShopPersistedState).favoriteSlugs
    if (!Array.isArray(cart) || !Array.isArray(favoriteSlugs)) return null
    return {
      cart: cart.filter(
        (l): l is PersistedCartLine =>
          l != null &&
          typeof l === 'object' &&
          typeof (l as PersistedCartLine).slug === 'string' &&
          typeof (l as PersistedCartLine).quantity === 'number',
      ),
      favoriteSlugs: favoriteSlugs.filter((s): s is string => typeof s === 'string'),
    }
  } catch {
    return null
  }
}

export function saveShopState(state: ShopPersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}
