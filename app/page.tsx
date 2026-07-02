import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
          MedSafe Cloud
        </span>

        <h1 className="mt-8 text-5xl font-bold tracking-tight text-slate-900">
          Your AI Companion for Cancer Care
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Manage medications, track symptoms, organize medical documents and
          stay connected with your healthcare team.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Get Started
          </Link>

          <Link
            href="/signup"
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100"
          >
            Create Account
          </Link>
        </div>
      </section>
    </main>
  );
}