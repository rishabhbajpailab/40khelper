'use client'

import type { ComponentProps } from 'react'

// A <select> that submits its form on change. Pair it with a <noscript> submit
// button so the form still works without JavaScript.
export default function AutoSubmitSelect(props: ComponentProps<'select'>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />
}
