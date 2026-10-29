import { Logo } from "@/components/brand/logo";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lifted sm:p-8">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-1 mb-6 text-muted-foreground">{description}</p>
        {children}
      </section>
    </main>
  );
}
