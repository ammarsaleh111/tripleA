import ChamferCard from '../components/common/ChamferCard.jsx';
import ContactForm from '../components/common/ContactForm.jsx';

const ContactPage = () => {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 text-white">
      <ChamferCard className="p-8 sm:p-12 space-y-8">
        <div className="text-center space-y-2 border-b border-[#1C1C26] pb-6">
          <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest">
            TRIPLE A SUPPORT
          </span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl uppercase text-white">
            CONTACT US
          </h1>
          <p className="font-mono text-xs text-zinc-400 max-w-xl mx-auto uppercase">
            Questions regarding supplement orders, products, or deliveries.
          </p>
        </div>

        <ContactForm />
      </ChamferCard>
    </section>
  );
};

export default ContactPage;
