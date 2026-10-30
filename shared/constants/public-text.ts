import type { PublicText } from '../types/public'

export const PUBLIC_TEXT: Record<'de' | 'en', Omit<PublicText, 'affiliate'>> = {
  de: {
    newTab: 'öffnet in neuem Tab',
    copy: 'Kopieren',
    copied: 'Kopiert',
    channels: 'Kanäle',
    imprint: 'Impressum',
    privacy: 'Datenschutz',
    revision: 'Rev.',
    back: 'Zurück zur Übersicht',
    code: 'Code',
    skip: 'Zum Inhalt springen',
    legalNav: 'Rechtliches',
    preview: 'Vorschau',
  },
  en: {
    newTab: 'opens in a new tab',
    copy: 'Copy',
    copied: 'Copied',
    channels: 'Channels',
    imprint: 'Legal notice',
    privacy: 'Privacy',
    revision: 'Rev.',
    back: 'Back to overview',
    code: 'Code',
    skip: 'Skip to content',
    legalNav: 'Legal',
    preview: 'Preview',
  },
}
