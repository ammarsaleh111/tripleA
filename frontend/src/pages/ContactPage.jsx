import { useEffect, useState } from 'react';

import { useAppContext } from '../context/AppContext.jsx';
import { submitContactMessage } from '../services/api/contact.js';
import ChamferCard from '../components/common/ChamferCard.jsx';

const ContactPage = () => {
  const { authUser } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setFormData((current) => ({
      ...current,
      fullName:
        current.fullName || `${String(authUser.firstName || '').trim()} ${String(authUser.lastName || '').trim()}`.trim(),
      email: current.email || String(authUser.email || ''),
    }));
  }, [authUser]);

  const handleFieldChange = (key, value) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    setIsSubmitting(true);
    try {
      await submitContactMessage({
        full_name: formData.fullName,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

      setStatusMessage('TRANSMISSION CONFIRMED. OUR SUPPORT TEAM WILL RESPOND PROMPTLY.');
      setFormData((current) => ({
        ...current,
        subject: '',
        message: '',
      }));
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to submit transmission right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 text-white">
      <ChamferCard className="p-8 sm:p-12 space-y-8">
        <div className="text-center space-y-2 border-b border-[#282828] pb-6">
          <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest">
            TRIPLE A GYM SUPPORT
          </span>
          <h1 className="font-heading font-black italic text-4xl sm:text-5xl uppercase text-white">
            CONTACT HEADQUARTERS
          </h1>
          <p className="font-mono text-xs text-zinc-400 max-w-xl mx-auto uppercase">
            Questions regarding memberships, supplement orders, or training protocols.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="space-y-2 block">
              <span className="block font-mono text-xs text-zinc-400 uppercase tracking-widest">FULL NAME</span>
              <input
                value={formData.fullName}
                onChange={(event) => handleFieldChange('fullName', event.target.value)}
                type="text"
                required
                placeholder="ENTER FULL NAME"
                className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
              />
            </label>

            <label className="space-y-2 block">
              <span className="block font-mono text-xs text-zinc-400 uppercase tracking-widest">EMAIL</span>
              <input
                value={formData.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                type="email"
                required
                placeholder="ENTER EMAIL ADDRESS"
                className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="block font-mono text-xs text-zinc-400 uppercase tracking-widest">SUBJECT</span>
            <input
              value={formData.subject}
              onChange={(event) => handleFieldChange('subject', event.target.value)}
              type="text"
              required
              placeholder="TRANSMISSION SUBJECT"
              className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
            />
          </label>

          <label className="space-y-2 block">
            <span className="block font-mono text-xs text-zinc-400 uppercase tracking-widest">MESSAGE</span>
            <textarea
              value={formData.message}
              onChange={(event) => handleFieldChange('message', event.target.value)}
              required
              minLength={10}
              rows={6}
              placeholder="WRITE YOUR MESSAGE..."
              className="w-full bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input resize-none"
            />
          </label>

          {statusMessage && <p className="font-mono text-xs font-bold text-[#FFCC00] text-center animate-pulse">{statusMessage}</p>}
          {errorMessage && <p className="font-mono text-xs font-bold text-red-400 text-center">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-4 text-center text-sm disabled:opacity-40"
          >
            {isSubmitting ? 'TRANSMITTING...' : 'SUBMIT TRANSMISSION'}
          </button>
        </form>
      </ChamferCard>
    </section>
  );
};

export default ContactPage;

