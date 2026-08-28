import { Link, useSearchParams } from 'react-router-dom';

const copyByVariant = {
  help: {
    eyebrow: 'Support Center',
    title: 'Need Help?',
    description:
      'Quick access to account, orders, and support links.',
    primaryLabel: 'Go To Shop',
    primaryTo: '/shop',
    secondaryLabel: 'Open Dashboard',
    secondaryTo: '/dashboard',
    sections: [
      {
        title: 'Account',
        body: 'Sign in or register from one auth screen, then continue to your dashboard.',
      },
      {
        title: 'Orders',
        body: 'Cart, checkout, and order history are connected and live.',
      },
      {
        title: 'Social Login',
        body: 'External providers are not connected yet.',
      },
    ],
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    description:
      'How the store, accounts, and orders are handled.',
    primaryLabel: 'Back To Shop',
    primaryTo: '/shop',
    secondaryLabel: 'Privacy Policy',
    secondaryTo: '/privacy',
    sections: [
      {
        title: 'Accounts',
        body: 'Keep your account credentials secure.',
      },
      {
        title: 'Orders',
        body: 'Orders depend on stock and confirmation.',
      },
      {
        title: 'Content',
        body: 'Product content can change as collections update.',
      },
    ],
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    description:
      'How account and order data is used inside the store.',
    primaryLabel: 'Back To Shop',
    primaryTo: '/shop',
    secondaryLabel: 'Terms Of Service',
    secondaryTo: '/terms',
    sections: [
      {
        title: 'Account Data',
        body: 'Profile data is used for secure access and personalization.',
      },
      {
        title: 'Cart And Orders',
        body: 'Cart and order data is stored to keep checkout continuous.',
      },
      {
        title: 'Session Handling',
        body: 'Guest sessions are used to keep cart items before login.',
      },
    ],
  },
};

const StaticInfoPage = ({ variant = 'help' }) => {
  const [searchParams] = useSearchParams();
  const resolvedVariant = copyByVariant[variant] ? variant : 'help';
  const content = copyByVariant[resolvedVariant];
  const topic = searchParams.get('topic');

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 text-white sm:px-6">
      <div className="rounded-2xl border border-[#1C1C26] bg-[#0B0B0E] p-6 sm:p-10">
        <p className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#FFCC00]">
          {content.eyebrow}
        </p>
        <h1 className="mt-3 font-heading text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-4 max-w-2xl font-mono text-xs uppercase tracking-wider leading-relaxed text-zinc-400">
          {content.description}
        </p>

        {topic === 'oauth' && resolvedVariant === 'help' && (
          <div className="mt-6 rounded-xl border border-[#1C1C26] bg-[#050506] p-4 text-sm text-zinc-400">
            Social login buttons point here until providers are connected.
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {content.sections.map((section) => (
            <article key={section.title} className="rounded-xl border border-[#1C1C26] bg-[#0B0B0F] p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {section.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{section.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={content.primaryTo}
            className="rounded-xl bg-[#FFCC00] px-6 py-3 font-heading text-xs font-black uppercase tracking-widest text-black shadow-md transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(255,204,0,0.4)]"
          >
            {content.primaryLabel}
          </Link>
          <Link
            to={content.secondaryTo}
            className="rounded-xl border border-[#22222E] bg-[#14141E] px-6 py-3 font-heading text-xs font-bold uppercase tracking-widest text-white transition-all hover:border-[#FFCC00] hover:text-[#FFCC00]"
          >
            {content.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default StaticInfoPage;
