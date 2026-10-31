export interface ExtraIcon {
  name: string
  category: string
  tags: string[]
  body: string
}

export const EXTRA_ICONS: ExtraIcon[] = [
  {
    name: 'nasal-spray',
    category: 'Health',
    tags: ['nasenspray', 'nasal', 'spray', 'nose', 'nase', 'medicine', 'pharmacy', 'dose'],
    body: '<path d="M7 15a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z"/><path d="M9 13v-2h6v2"/><path d="M10.5 11l.5 -4h2l.5 4"/><path d="M12 3v.01"/><path d="M8.5 4v.01"/><path d="M15.5 4v.01"/>',
  },
  {
    name: 'powder',
    category: 'Health',
    tags: ['pulver', 'powder', 'protein', 'supplement', 'dose', 'tub', 'jar'],
    body: '<path d="M5 6a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z"/><path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2v-10"/><path d="M6 13h12"/><path d="M9 16v.01"/><path d="M12 17.5v.01"/><path d="M15 16v.01"/>',
  },
  {
    name: 'tablet-round',
    category: 'Health',
    tags: ['tablette', 'tablet', 'tabs', 'pill', 'medicine', 'pharmacy', 'vitamin', 'supplement'],
    body: '<path d="M3 9.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0"/><path d="M4.6 13.4l7.8 -7.8"/><path d="M14 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0"/><path d="M15.5 17.5h4"/>',
  },
]
