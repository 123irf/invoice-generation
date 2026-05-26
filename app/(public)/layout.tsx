export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-4xl mx-auto py-12 px-4">{children}</main>
    </div>
  );
}
