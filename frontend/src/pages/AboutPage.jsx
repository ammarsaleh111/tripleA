import React from 'react';
import ChamferCard from '../components/common/ChamferCard.jsx';
import ContactForm from '../components/common/ContactForm.jsx';

// Easily replaceable owner placeholder image
const OWNER_PLACEHOLDER_IMAGE =
  'https://www.image2url.com/r2/default/images/1788101920512-cfbc5aef-e3b0-4793-9012-bcc87fa0da32.jpg';

const AboutPage = () => {
  return (
    <div className="bg-[#050506] text-white font-sans overflow-x-hidden space-y-24 md:space-y-32 pb-16">
      
      {/* SECTION 1: ABOUT INTRO */}
      <section className="relative min-h-[50vh] flex items-center justify-center bg-black overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#050506]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2.5 border border-[#FFCC00]/40 bg-black/80 px-5 py-2 rounded-full backdrop-blur-md shadow-lg">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#FFCC00]" />
            <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#FFCC00]">
              ABOUT TRIPLE A
            </span>
          </div>

          <h1 className="font-heading font-black text-5xl sm:text-7xl md:text-8xl uppercase leading-[0.9] tracking-tight text-white">
            ABOUT <span className="text-[#FFCC00]">TRIPLE A</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-300 leading-relaxed uppercase tracking-wider font-mono">
            Built around performance, quality, and helping you find the right products for your goals.
          </p>
        </div>
      </section>

      {/* SECTION 2: OWNER */}
      <section className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
              LEADERSHIP
            </span>
            <h2 className="font-heading font-black text-4xl uppercase text-white tracking-tight">
              TRIPLE A <span className="text-[#FFCC00]">OWNER</span>
            </h2>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest leading-relaxed">
              Meet the owner of Triple A: Coach Amr
            </p>
          </div>
          <div className="relative aspect-[4/5] max-w-sm mx-auto w-full overflow-hidden bg-[#0B0B0E] border border-[#1C1C26] rounded-xl shadow-lg">
            <img
              src={OWNER_PLACEHOLDER_IMAGE}
              alt="Triple A Owner Placeholder"
              className="w-full h-full object-cover opacity-80 filter grayscale hover:grayscale-0 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* SECTION 3: LOCATIONS */}
      <section className="mx-auto max-w-5xl px-6 space-y-12">
        <div className="text-center space-y-3">
          <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
            FIND OUR STORES
          </span>
          <h2 className="font-heading font-black text-4xl uppercase text-white tracking-tight">
            OUR <span className="text-[#FFCC00]">LOCATIONS</span>
          </h2>
          <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider">
            Visit Triple A
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Shubra */}
          <div className="bg-[#0B0B0F] border border-[#1C1C26] p-8 rounded-xl space-y-6 flex flex-col justify-between hover:border-[#FFCC00]/50 transition-all">
            <div className="space-y-4">
              <span className="font-mono text-[10px] text-[#FFCC00] bg-[#14141E] px-3 py-1 rounded-md border border-[#222230] uppercase font-bold">
                Location 01
              </span>
              <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white">
                فرع شبرا
              </h3>
              <p className="text-sm text-zinc-300 font-medium" dir="rtl">
                ٥١ ش المقسي متفرع من ش شبرا , شبرا مصر
              </p>
              <div className="pt-2">
                <span className="block font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Phone Number</span>
                <a href="tel:01055875757" className="font-mono text-sm text-[#FFCC00] hover:underline">
                  01055875757
                </a>
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=30.081060,31.242290"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-center rounded-lg bg-[#14141E] border border-[#1C1C26] hover:border-[#FFCC00] hover:text-black hover:bg-[#FFCC00] py-3 text-xs font-heading font-bold uppercase tracking-widest text-white transition-all shadow-md mt-4"
            >
              Get Directions
            </a>
          </div>

          {/* Gesr El Suez */}
          <div className="bg-[#0B0B0F] border border-[#1C1C26] p-8 rounded-xl space-y-6 flex flex-col justify-between hover:border-[#FFCC00]/50 transition-all">
            <div className="space-y-4">
              <span className="font-mono text-[10px] text-[#FFCC00] bg-[#14141E] px-3 py-1 rounded-md border border-[#222230] uppercase font-bold">
                Location 02
              </span>
              <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white">
                فرع جسر السويس
              </h3>
              <p className="text-sm text-zinc-300 font-medium" dir="rtl">
                ٢١ العزيز المصري بجوار محطة مترو النزهة أمام شارع الحرية
              </p>
              <div className="pt-2">
                <span className="block font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Store Location</span>
                <span className="font-mono text-sm text-[#FFCC00]">
                  Gesser El-Suez
                </span>
              </div>
            </div>
            <a
              href="https://maps.app.goo.gl/kk4KguFr19qS4p1u8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-center rounded-lg bg-[#14141E] border border-[#1C1C26] hover:border-[#FFCC00] hover:text-black hover:bg-[#FFCC00] py-3 text-xs font-heading font-bold uppercase tracking-widest text-white transition-all shadow-md mt-4"
            >
              Get Directions
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 4: WHATSAPP */}
      <section className="mx-auto max-w-5xl px-6 text-center">
        <div className="bg-[#0B0B0E] border border-[#1C1C26] rounded-xl p-8 sm:p-12 space-y-6">
          <span className="text-4xl">💬</span>
          <h2 className="font-heading font-black text-3xl uppercase text-white tracking-tight">
            NEED HELP?
          </h2>
          <p className="font-mono text-xs sm:text-sm text-zinc-300 max-w-md mx-auto uppercase">
            Have a question? Talk to Triple A.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/201121957554"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-8 py-3.5 font-heading text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#20ba56]"
            >
              WhatsApp Us: 011 21957554
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 5: CONTACT FORM */}
      <section className="mx-auto max-w-[1500px] px-6">
        <ChamferCard className="p-8 sm:p-12 max-w-3xl mx-auto space-y-8 bg-[#0B0B0E] border border-[#1C1C26] rounded-2xl relative overflow-hidden">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
              SUBMIT INQUIRY
            </span>
            <h2 className="font-heading font-black text-4xl uppercase text-white tracking-tight">
              LEAVE A <span className="text-[#FFCC00]">MESSAGE</span>
            </h2>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
              Fill in the form below and our customer representatives will respond shortly.
            </p>
          </div>

          <ContactForm />
        </ChamferCard>
      </section>

    </div>
  );
};

export default AboutPage;
