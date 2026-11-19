import { sendMagicLink } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; sent?: string; error?: string }
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Sign in</h1>

      {searchParams.sent ? (
        <p className="rounded-md border border-gray-300 p-4 text-sm dark:border-neutral-700">
          Check your email for a sign-in link.
        </p>
      ) : (
        <form action={sendMagicLink} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={searchParams.next ?? '/lists'} />
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Email me a link
          </button>
        </form>
      )}

      {searchParams.error && <p className="text-sm text-red-600">{searchParams.error}</p>}
    </main>
  )
}
