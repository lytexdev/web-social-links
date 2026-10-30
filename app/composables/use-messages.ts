import { de, type Messages } from '~/i18n/de'
import { en } from '~/i18n/en'

export type Locale = 'de' | 'en'

const dictionaries: Record<Locale, Messages> = { de, en }

export function useMessages(locale: Locale = 'de'): Messages {
  return dictionaries[locale]
}
