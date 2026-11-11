import { useId, useState, type FormEvent } from 'react';
import { Reveal } from './Reveal';

/**
 * Submission endpoint (any HTTPS URL accepting a JSON POST: CRM webhook, form service, your API).
 * Configure it with VITE_DEMO_ENDPOINT at build time. Without it the form validates but tells the visitor
 * that delivery is not set up: it never pretends a request was sent.
 */
const ENDPOINT = (import.meta.env.VITE_DEMO_ENDPOINT as string | undefined)?.trim() || '';

const LOCATIONS = ['1', '2 to 5', '6 to 20', '21 to 100', 'More than 100', 'Not applicable (technology provider)'];

const COUNTRIES = [
  'France', 'Belgium', 'Netherlands', 'Switzerland', 'Tunisia', 'Morocco', 'United Kingdom', 'Ireland', 'Germany',
  'Austria', 'Spain', 'Portugal', 'Italy', 'Poland', 'Czech Republic', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Egypt', 'South Africa', 'United States', 'Canada', 'Mexico', 'Brazil',
  'Australia', 'New Zealand', 'India', 'Singapore', 'Japan', 'South Korea',
];

const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol|proton|protonmail|gmx|yandex|mail)\./i;

interface Values {
  name: string;
  email: string;
  company: string;
  title: string;
  country: string;
  locations: string;
  message: string;
  website: string; // honeypot
}

type Errors = Partial<Record<keyof Values, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'failed' | 'unconfigured';

const EMPTY: Values = { name: '', email: '', company: '', title: '', country: '', locations: '', message: '', website: '' };

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = 'Please enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = 'Please enter a valid email address.';
  else if (FREE_MAIL.test(v.email)) e.email = 'Please use your business email address.';
  if (v.company.trim().length < 2) e.company = 'Please enter your company or cinema name.';
  if (v.title.trim().length < 2) e.title = 'Please enter your job title.';
  if (v.country.trim().length < 2) e.country = 'Please enter your country.';
  if (!v.locations) e.locations = 'Please choose a range.';
  if (v.message.length > 2000) e.message = 'Please keep the message under 2000 characters.';
  return e;
}

export function DemoForm() {
  const id = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [status, setStatus] = useState<Status>('idle');

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (touched[k]) setErrors(validate(next));
  };
  const blur = (k: keyof Values) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validate(values));
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    setTouched({ name: true, email: true, company: true, title: true, country: true, locations: true, message: true });
    if (Object.keys(errs).length) {
      const first = document.querySelector<HTMLElement>(`[aria-invalid="true"]`);
      first?.focus();
      return;
    }
    if (values.website) return; // bot
    if (!ENDPOINT) {
      setStatus('unconfigured');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'seatview3d-website',
          submittedAt: new Date().toISOString(),
          fullName: values.name.trim(),
          email: values.email.trim(),
          company: values.company.trim(),
          jobTitle: values.title.trim(),
          country: values.country.trim(),
          locations: values.locations,
          message: values.message.trim(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('sent');
      setValues(EMPTY);
      setTouched({});
    } catch {
      setStatus('failed');
    }
  };

  const field = (k: keyof Values) => ({
    id: `${id}-${k}`,
    name: k,
    value: values[k],
    onChange: set(k),
    onBlur: blur(k),
    'aria-invalid': touched[k] && !!errors[k] ? true : undefined,
    'aria-describedby': touched[k] && errors[k] ? `${id}-${k}-err` : undefined,
  });
  const Err = ({ k }: { k: keyof Values }) =>
    touched[k] && errors[k] ? (
      <span className="field__error" id={`${id}-${k}-err`} role="alert">
        {errors[k]}
      </span>
    ) : null;

  return (
    <section className="section contact" id="demo" aria-labelledby="contact-title">
      <div className="container contact__inner">
        <Reveal className="contact__copy">
          <p className="eyebrow">Request a demo</p>
          <h2 id="contact-title">See SeatView 3D on your own auditorium.</h2>
          <p className="section__lead">
            Tell us about your cinemas and we will prepare a walkthrough of the product and of how it would integrate
            with your booking experience.
          </p>
          <ul className="contact__points">
            <li>Live demonstration of the first-person preview</li>
            <li>Integration options for your current stack</li>
            <li>Pilot scope for a first set of auditoriums</li>
          </ul>
        </Reveal>

        <Reveal className="card form-card" delay={100}>
          {status === 'sent' ? (
            <div className="form-done" role="status">
              <h3>Thank you. Your request has been sent.</h3>
              <p>We will get back to you at the business email you provided.</p>
              <button type="button" className="btn btn--ghost" onClick={() => setStatus('idle')}>
                Send another request
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={onSubmit} noValidate>
              <div className="form__row">
                <div className="field">
                  <label htmlFor={`${id}-name`}>Full name</label>
                  <input {...field('name')} autoComplete="name" required />
                  <Err k="name" />
                </div>
                <div className="field">
                  <label htmlFor={`${id}-email`}>Business email</label>
                  <input {...field('email')} type="email" autoComplete="email" inputMode="email" required />
                  <Err k="email" />
                </div>
              </div>
              <div className="form__row">
                <div className="field">
                  <label htmlFor={`${id}-company`}>Company / Cinema name</label>
                  <input {...field('company')} autoComplete="organization" required />
                  <Err k="company" />
                </div>
                <div className="field">
                  <label htmlFor={`${id}-title`}>Job title</label>
                  <input {...field('title')} autoComplete="organization-title" required />
                  <Err k="title" />
                </div>
              </div>
              <div className="form__row">
                <div className="field">
                  <label htmlFor={`${id}-country`}>Country</label>
                  <input {...field('country')} list={`${id}-countries`} autoComplete="country-name" required />
                  <datalist id={`${id}-countries`}>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <Err k="country" />
                </div>
                <div className="field">
                  <label htmlFor={`${id}-locations`}>Number of cinema locations</label>
                  <select {...field('locations')} required>
                    <option value="">Select…</option>
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Err k="locations" />
                </div>
              </div>
              <div className="field">
                <label htmlFor={`${id}-message`}>
                  Message <span className="field__optional">(optional)</span>
                </label>
                <textarea {...field('message')} rows={4} placeholder="Your ticketing platform, timelines, number of auditoriums…" />
                <Err k="message" />
              </div>
              <div className="field field--hp" aria-hidden>
                <label htmlFor={`${id}-website`}>Website</label>
                <input {...field('website')} tabIndex={-1} autoComplete="off" />
              </div>

              <div className="form__footer">
                <button type="submit" className="btn btn--primary btn--lg" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Request a Demo'}
                </button>
                <p className="form__privacy">We only use these details to contact you about SeatView 3D.</p>
              </div>

              {status === 'failed' && (
                <p className="form__status form__status--error" role="alert">
                  The request could not be sent. Please try again in a moment.
                </p>
              )}
              {status === 'unconfigured' && (
                <p className="form__status form__status--warn" role="alert">
                  Your details are valid, but this form is not connected to a delivery endpoint yet, so nothing was sent.
                  Site owner: set <code>VITE_DEMO_ENDPOINT</code> to your CRM or form webhook and rebuild.
                </p>
              )}
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
