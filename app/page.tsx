import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Receipt, Shield, ArrowRight } from 'lucide-react';
import { getCurrentUser, getUserRole } from '@/lib/auth';
import { getDefaultRoute } from '@/lib/roles';

export default async function HomePage() {
  const user = await getCurrentUser();

  // If already signed in, redirect based on role
  if (user) {
    const role = await getUserRole();
    redirect(getDefaultRoute(role));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-slate-900">
              Ultrakey IT Solutions
            </span>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Admin Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-4">
        <section className="py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Invoicing Made Simple
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Create professional quotes and invoices, accept online payments, and
            manage your clients — all in one place.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Feature cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-20">
          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="Quotes"
            description="Send professional quotes to clients. They can accept or decline with a single click via a secure link."
          />
          <FeatureCard
            icon={<Receipt className="h-6 w-6" />}
            title="Invoices"
            description="Generate invoices from quotes or from scratch. Track payments and send reminders automatically."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Secure Payments"
            description="Clients pay online via Razorpay. No login required — just a secure token link in their email."
          />
        </section>

        {/* Client info */}
        <section className="border-t py-12 text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Are you a client?
          </h2>
          <p className="text-slate-600 max-w-lg mx-auto">
            You don&apos;t need to log in. Check your email for a link to view
            your quote or invoice and make a payment directly.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Ultrakey IT Solutions. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
