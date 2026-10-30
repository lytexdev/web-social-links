import type { PublicModel } from './public'

declare module 'h3' {
  interface H3EventContext {
    publicModel?: PublicModel
  }
}
