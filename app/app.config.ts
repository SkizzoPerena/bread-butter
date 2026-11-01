export default defineAppConfig({
  ui: {
    colors: {
      primary: 'toast',
      neutral: 'charcoal',
      bread: 'bread',
      blue: 'blue',
      emerald: 'emerald',
      purple: 'purple',
      teal: 'teal',
      orange: 'orange',
      pink: 'pink',
      indigo: 'indigo',
      slate: 'slate',
      rose: 'rose',
      monochrome: 'monochrome',
      violet: 'violet',
      red: 'red',
      cyan: 'cyan',
      lime: 'lime',
      yellow: 'yellow',
      fuchsia: 'fuchsia'
    },
    button: {
      compoundVariants: [
        {
          color: 'bread',
          variant: 'solid',
          class: 'text-toast-950 bg-bread-400 hover:bg-bread-300 active:bg-bread-500 font-bold focus-visible:outline-bread-400 shadow-xs'
        },
        {
          color: 'bread',
          variant: 'outline',
          class: 'ring-1 ring-inset ring-bread-500/80 text-toast-950 hover:bg-bread-400/20 active:bg-bread-400/30 font-semibold focus-visible:ring-bread-500'
        },
        {
          color: 'bread',
          variant: 'subtle',
          class: 'text-toast-950 bg-bread-400/30 hover:bg-bread-400/40 active:bg-bread-400/50 font-semibold'
        },
        {
          color: 'bread',
          variant: 'soft',
          class: 'text-toast-950 bg-bread-400/20 hover:bg-bread-400/30 active:bg-bread-400/40 font-semibold'
        },
        {
          color: 'bread',
          variant: 'ghost',
          class: 'text-toast-950 hover:bg-bread-400/25 active:bg-bread-400/35 font-semibold'
        },
        {
          color: 'bread',
          variant: 'link',
          class: 'text-toast-900 hover:text-toast-950 underline-offset-4 hover:underline font-semibold'
        }
      ]
    },
    badge: {
      compoundVariants: [
        {
          color: 'bread',
          variant: 'solid',
          class: 'text-toast-950 bg-bread-400 font-bold shadow-2xs'
        },
        {
          color: 'bread',
          variant: 'outline',
          class: 'ring-1 ring-inset ring-bread-400/80 text-toast-950 font-semibold'
        },
        {
          color: 'bread',
          variant: 'subtle',
          class: 'text-bread-200 bg-bread-400/20 border border-bread-300/30 font-bold'
        },
        {
          color: 'bread',
          variant: 'soft',
          class: 'text-toast-950 bg-bread-400/25 font-semibold'
        }
      ]
    }
  }
})
