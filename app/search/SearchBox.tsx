'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

// Updates ?q= as you type (debounced) so results stream in from the server.
// Without JavaScript the surrounding <form> still submits normally.
export default function SearchBox({ initial }: { initial: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="relative">
      <input
        type="search"
        name="q"
        value={value}
        autoFocus
        autoComplete="off"
        placeholder="Units, weapons, abilities, stratagems…"
        aria-label="Search"
        onChange={(e) => {
          const q = e.target.value
          setValue(q)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => {
            startTransition(() => router.replace(q.trim() ? `${pathname}?q=${encodeURIComponent(q)}` : pathname))
          }, 250)
        }}
        className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-base dark:border-neutral-700"
      />
      {pending && <span className="absolute right-3 top-2.5 text-xs opacity-50">…</span>}
    </div>
  )
}
