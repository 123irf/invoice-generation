import { redirect } from 'next/navigation';

export default function InvoicesPage() {
  redirect('/invoice-generation?type=invoices');
}
