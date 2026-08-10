import React, { useState } from 'react';
import ChamferCard from '../components/common/ChamferCard.jsx';

const ABOUT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=2000&q=80';
const PROTOCOL_IMAGE =
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1000&q=80';
const MARCUS_IMAGE =
  'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=600&q=80';
const ELENA_IMAGE =
  'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=600&q=80';

const AboutPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plan: 'Strength Acquisition',
    message: '',
  });
  const [submissionFeedback, setSubmissionFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmissionFeedback('TRANSMISSION SENT. OUR TEAM WILL CONTACT YOU WITHIN 24 HOURS.');
    setFormData({ name: '', email: '', plan: 'Strength Acquisition', message: '' });
    setTimeout(() => setSubmissionFeedback(''), 5000);
  };

  return (
    <div className="bg-[#0A0A0A] text-[#FFF8E7] font-sans space-y-16 pb-16">
      
      {/* SECTION 1: HERO */}
      <section className="relative min-h-[50vh] flex items-center justify-center border-b border-[#282828] bg-black">
        <div className="absolute inset-0 z-0">
          <img
            src={ABOUT_HERO_IMAGE}
            alt="Industrial Strength Fitness"
            className="h-full w-full object-cover opacity-30 filter grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-black/70 to-black/90" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center space-y-4">
          <h1 className="font-heading font-black italic text-5xl sm:text-7xl tracking-tight uppercase leading-none text-[#FFCC00]">
            INDUSTRIAL STRENGTH
            <br />
            <span className="text-white">FITNESS</span>
          </h1>
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
            TRIPLE A GYM • ESTABLISHED FOR REAL PROGRESS
          </p>
        </div>
      </section>

      {/* SECTION 2: OUR IRON PROTOCOL */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Text Block */}
          <ChamferCard className="p-8 sm:p-12 space-y-6">
            <h2 className="font-heading font-black italic text-3xl sm:text-4xl uppercase text-white">
              OUR IRON <span className="text-[#FFCC00]">PROTOCOL</span>
            </h2>
            <div className="space-y-4 font-mono text-xs text-zinc-300 leading-relaxed">
              <p>
                TRIPLE A GYM wasn't built for comfort. It was forged for progress. We reject the spa-like atmosphere of commercial gyms to create an environment focused purely on performance, strength, and raw athletic output.
              </p>
              <p>
                Here, aesthetic follows function. We believe in heavy lifting, hard work, and relentless dedication. Our facility is equipped with industrial grade equipment designed to withstand the punishment of serious athletes. If you're looking for a treadmill with a TV, look elsewhere.
              </p>
            </div>
          </ChamferCard>

          {/* Right Image Container */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#141414] border border-[#282828] p-3 chamfer-box">
            <img
              src={PROTOCOL_IMAGE}
              alt="Hands chalking Olympic barbell"
              className="w-full h-full object-cover filter contrast-125"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: THE VANGUARD (TRAINERS) */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="text-center pb-8 border-b border-[#282828] mb-10">
          <h2 className="font-heading font-black italic text-4xl uppercase text-[#FFCC00]">
            THE VANGUARD
          </h2>
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mt-2">
            ELITE COACHES & POWER SPECIALISTS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Trainer 1 */}
          <ChamferCard className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 shrink-0 bg-[#0A0A0A] border border-[#282828] overflow-hidden chamfer-badge">
              <img src={MARCUS_IMAGE} alt="Marcus Thorne" className="w-full h-full object-cover filter grayscale" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading font-black italic text-2xl uppercase text-white">MARCUS THORNE</h3>
              <span className="inline-block bg-[#FFCC00] text-black font-mono font-bold text-[10px] uppercase tracking-widest px-2.5 py-0.5 chamfer-badge">
                Strength & Conditioning
              </span>
              <p className="font-mono text-xs text-zinc-400 leading-relaxed pt-2">
                Former competitive powerlifter. Focuses on squat, bench press, deadlift, raw strength acquisition, and structural balance.
              </p>
            </div>
          </ChamferCard>

          {/* Trainer 2 */}
          <ChamferCard className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 shrink-0 bg-[#0A0A0A] border border-[#282828] overflow-hidden chamfer-badge">
              <img src={ELENA_IMAGE} alt="Elena Vance" className="w-full h-full object-cover filter grayscale" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading font-black italic text-2xl uppercase text-white">ELENA VANCE</h3>
              <span className="inline-block bg-[#FFCC00] text-black font-mono font-bold text-[10px] uppercase tracking-widest px-2.5 py-0.5 chamfer-badge">
                Olympic Weightlifting
              </span>
              <p className="font-mono text-xs text-zinc-400 leading-relaxed pt-2">
                National level weightlifter. Passionate about explosive power, technical precision in snatch and clean & jerk.
              </p>
            </div>
          </ChamferCard>
        </div>
      </section>

      {/* SECTION 4: STEP UP (CONTACT TRANSMISSION FORM) */}
      <section className="mx-auto max-w-[1500px] px-6">
        <ChamferCard className="p-8 sm:p-12 max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-black italic text-4xl uppercase text-white">
              STEP UP
            </h2>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
              Heavy lifting & real results. Registered here.
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
                  className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
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
                  className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-zinc-400 uppercase tracking-widest">TARGET PLAN</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
              >
                <option value="Strength Acquisition">Strength Acquisition</option>
                <option value="Olympic Weightlifting">Olympic Weightlifting</option>
                <option value="Pro Athlete 24/7">Pro Athlete 24/7</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-zinc-400 uppercase tracking-widest">MESSAGE</label>
              <textarea
                rows="4"
                placeholder="STATE YOUR PURPOSE"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full py-4 text-center text-sm">
              SUBMIT TRANSMISSION
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
