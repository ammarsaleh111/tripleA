import React, { useState } from 'react';
import ChamferCard from '../components/common/ChamferCard.jsx';

const ABOUT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=85';
const STANDARD_IMAGE =
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=1000&q=85';

const standardCards = [
  {
    number: '01',
    icon: '🧪',
    title: 'LAB TESTED',
    body: 'Every batch undergoes independent third-party HPLC testing to verify purity, potency, and label accuracy.',
  },
  {
    number: '02',
    icon: '🔬',
    title: 'FULL TRANSPARENCY',
    body: 'Zero proprietary blends. Complete ingredient disclosure and clinical dosing printed on every label.',
  },
  {
    number: '03',
    icon: '🌱',
    title: 'CLEAN FORMULAS',
    body: 'No banned substances, no unnecessary fillers. Only what the formula needs to deliver results.',
  },
  {
    number: '04',
    icon: '🏆',
    title: 'ATHLETE TRUSTED',
    body: 'Trusted by professional athletes and daily lifters who demand certified quality from every scoop.',
  },
];

const stats = [
  { value: '40+', label: 'FORMULATIONS ENGINEERED' },
  { value: '120K+', label: 'ORDERS SHIPPED WORLDWIDE' },
  { value: '98%', label: 'CUSTOMER SATISFACTION' },
  { value: '100%', label: 'AUTHENTICITY GUARANTEED' },
];

const AboutPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiry: 'Supplement Stack Recommendation',
    message: '',
  });
  const [submissionFeedback, setSubmissionFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmissionFeedback('MESSAGE SENT. OUR TEAM WILL CONTACT YOU WITHIN 24 HOURS.');
    setFormData({ name: '', email: '', inquiry: 'Supplement Stack Recommendation', message: '' });
    setTimeout(() => setSubmissionFeedback(''), 5000);
  };

  return (
    <div className="bg-[#050506] text-white font-sans overflow-x-hidden space-y-24 md:space-y-32 pb-16">
      {/* SECTION 1: HERO */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-black overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={ABOUT_HERO_IMAGE}
            alt="Triple A Supplements athlete training"
            className="h-full w-full object-cover opacity-25 filter grayscale contrast-125 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-black/50 to-black/85" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-28 text-center space-y-8">
          <div className="inline-flex items-center gap-2.5 border border-[#FFCC00]/40 bg-black/80 px-5 py-2 rounded-full backdrop-blur-md shadow-lg">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#FFCC00]" />
            <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#FFCC00]">
              THE TRIPLE A STORY
            </span>
          </div>

          <h1 className="font-heading font-black text-5xl sm:text-7xl md:text-8xl uppercase leading-[0.9] tracking-tight text-white">
            BUILT FOR
            <br />
            <span className="text-[#FFCC00]">ELITE PERFORMANCE.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-300 leading-relaxed uppercase tracking-wider font-mono">
            Premium supplements engineered to help you train harder, recover better, and perform at your best.
          </p>
        </div>
      </section>

      {/* SECTION 2: OUR STORY */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
              WHO WE ARE
            </span>
            <h2 className="font-heading font-black text-4xl sm:text-5xl uppercase tracking-tight text-white leading-[0.95]">
              SUPPLEMENTS WITHOUT <span className="text-[#FFCC00]">SHORTCUTS.</span>
            </h2>
            <div className="space-y-4 font-mono text-xs text-zinc-300 leading-relaxed uppercase tracking-wider">
              <p>
                TRIPLE A was founded on one conviction: athletes deserve supplements as serious as their training. No
                miracle claims, no hidden fillers, no proprietary blends hiding underdosed ingredients.
              </p>
              <p>
                We source clinically studied compounds, verify every batch with independent labs, and print the full
                formula on every label. What you read is exactly what you scoop — engineered for raw power, endurance,
                and recovery.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-2">
              {stats.slice(0, 2).map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#0B0B0F] border border-[#1C1C26] rounded-xl p-6 space-y-1"
                >
                  <p className="font-heading font-black text-3xl text-[#FFCC00]">{stat.value}</p>
                  <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0B0B0E] border border-[#1C1C26] rounded-xl">
            <img
              src={STANDARD_IMAGE}
              alt="Triple A whey protein formulation"
              className="w-full h-full object-cover opacity-70 filter grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="font-mono text-[10px] text-[#FFCC00] uppercase tracking-widest font-extrabold">
                FLAGSHIP FORMULA
              </p>
              <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white">
                TITANIUM WHEY ISOLATE
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE TRIPLE A STANDARD */}
      <section className="mx-auto max-w-[1500px] px-6 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
            THE TRIPLE A STANDARD
          </span>
          <h2 className="font-heading font-black text-4xl sm:text-5xl uppercase text-white tracking-tight">
            WHAT WE <span className="text-[#FFCC00]">STAND FOR</span>
          </h2>
          <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider leading-relaxed">
            Uncompromising purity, certified quality, and formulations built for elite performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {standardCards.map((card) => (
            <div
              key={card.number}
              className="group bg-[#0B0B0F] border border-[#1C1C26] hover:border-[#FFCC00]/50 p-8 rounded-xl space-y-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_rgba(255,204,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl">{card.icon}</span>
                <span className="font-mono text-xs font-bold text-[#FFCC00] bg-[#14141E] px-2.5 py-1 rounded-md border border-[#222230]">
                  {card.number}
                </span>
              </div>
              <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white transition-colors group-hover:text-[#FFCC00]">
                {card.title}
              </h3>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: STATS STRIP */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="bg-[#0B0B0E] border border-[#1C1C26] rounded-2xl p-8 sm:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <p className="font-heading font-black text-4xl sm:text-5xl text-[#FFCC00]">{stat.value}</p>
                <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: CONTACT CTA */}
      <section className="mx-auto max-w-[1500px] px-6">
        <ChamferCard className="p-8 sm:p-12 max-w-3xl mx-auto space-y-8 bg-[#0B0B0E] border border-[#1C1C26] rounded-2xl relative overflow-hidden">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
              TALK TO US
            </span>
            <h2 className="font-heading font-black text-4xl uppercase text-white tracking-tight">
              LEVEL UP YOUR <span className="text-[#FFCC00]">STACK.</span>
            </h2>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
              Questions about formulations, orders, or shipping? We respond fast.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="font-mono text-xs text-zinc-400 uppercase tracking-widest">NAME</label>
                <input
                  type="text"
                  placeholder="ENTER NAME"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#050506] border border-[#1C1C26] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-xl placeholder:text-zinc-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-xs text-zinc-400 uppercase tracking-widest">EMAIL</label>
                <input
                  type="email"
                  placeholder="ENTER EMAIL"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#050506] border border-[#1C1C26] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-xl placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-zinc-400 uppercase tracking-widest">INQUIRY TYPE</label>
              <select
                value={formData.inquiry}
                onChange={(e) => setFormData({ ...formData, inquiry: e.target.value })}
                className="w-full bg-[#050506] border border-[#1C1C26] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-xl"
              >
                <option value="Supplement Stack Recommendation">Supplement Stack Recommendation</option>
                <option value="Order & Shipping Query">Order & Shipping Query</option>
                <option value="Bulk Inquiry">Bulk Inquiry</option>
                <option value="General Feedback">General Feedback</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-zinc-400 uppercase tracking-widest">MESSAGE</label>
              <textarea
                rows="4"
                placeholder="TELL US ABOUT YOUR GOALS"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-[#050506] border border-[#1C1C26] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-xl placeholder:text-zinc-600 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#FFCC00] py-4 text-center font-heading text-sm font-bold uppercase tracking-widest text-black shadow-lg transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(255,204,0,0.4)]"
            >
              SEND MESSAGE
            </button>

            {submissionFeedback && (
              <p className="font-mono text-xs text-[#FFCC00] text-center font-bold animate-pulse">
                {submissionFeedback}
              </p>
            )}
          </form>
        </ChamferCard>
      </section>
    </div>
  );
};

export default AboutPage;
