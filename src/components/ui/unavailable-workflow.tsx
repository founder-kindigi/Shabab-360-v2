"use client";
export function UnavailableWorkflow({ title, onBack }: { title: string; onBack?: () => void }) {
  return <section className="min-h-[60vh] p-6 pb-28 space-y-5">
    {onBack && <button onClick={onBack} className="text-sm font-semibold text-purple-700">Back</button>}
    <h1 className="text-2xl font-bold">{title}</h1>
    <div role="status" className="rounded-2xl border bg-muted/30 p-5 space-y-2">
      <h2 className="font-semibold">Currently unavailable</h2>
      <p className="text-sm text-muted-foreground">This feature is awaiting approved privacy and operating rules. No records or changes can be submitted here.</p>
    </div>
  </section>;
}
