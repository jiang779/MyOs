import type { DefineComponent } from 'vue'
import type { ISourceOptions } from '@tsparticles/engine'

declare module 'vue' {
  export interface GlobalComponents {
    VueParticles: DefineComponent<{
      id: string
      options?: ISourceOptions
      url?: string
      theme?: string
    }>
  }
}