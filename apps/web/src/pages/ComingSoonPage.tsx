export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-3 text-black/55">Coming soon — Phase 2.</p>
    </div>
  );
}
