import { Reveal } from './Reveal';

const BENEFITS = [
  { title: 'Differentiate your digital booking experience', body: 'Offer something customers have not seen on any other cinema website: a look at the room before they pay.' },
  { title: 'Increase customer confidence', body: 'Replace imagination with a view. A confident choice is a faster choice, and one customers are happier with.' },
  { title: 'Make premium seating understandable', body: 'Show the difference between rows and categories instead of describing it in a legend.' },
  { title: 'Modernize the online journey', body: 'Bring the booking page up to the standard of the auditorium it sells.' },
  { title: 'Innovate without replacing anything', body: 'An additive layer on your current ticketing stack. No migration, no change to how tickets are sold.' },
];

export function Benefits() {
  return (
    <section className="section benefits" id="benefits" aria-labelledby="benefits-title">
      <div className="container benefits__inner">
        <Reveal className="benefits__copy">
          <p className="eyebrow">Business value</p>
          <h2 id="benefits-title">Better seat selection. A better cinema experience.</h2>
          <p className="section__lead">
            SeatView 3D turns a functional step into a memorable one, and gives your team a concrete, demonstrable
            innovation to talk about.
          </p>
          <a href="#demo" className="btn btn--primary">
            Request a Demo
          </a>
        </Reveal>
        <ul className="benefits__list">
          {BENEFITS.map((b, i) => (
            <Reveal as="li" key={b.title} delay={i * 70}>
              <CheckIcon />
              <div>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="rgba(229,9,20,0.15)" />
    <path d="M7.5 12.5l3 3 6-6.5" stroke="#E50914" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
