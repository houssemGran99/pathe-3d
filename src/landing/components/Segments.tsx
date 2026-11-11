import { Reveal } from './Reveal';

const SEGMENTS = [
  {
    title: 'Cinema Chains',
    body: 'Bring consistent immersive experiences across multiple locations, with one configuration per auditorium and a single integration.',
    tag: 'Multi-site',
  },
  {
    title: 'Independent Cinemas',
    body: 'Differentiate your cinema with an innovative digital experience that fits a single room as well as a multiplex.',
    tag: 'Single site',
  },
  {
    title: 'Cinema Technology Providers',
    body: 'Extend existing ticketing and booking platforms with 3D seat visualization your operator customers can switch on.',
    tag: 'Platforms',
  },
];

export function Segments() {
  return (
    <section className="section segments" id="who" aria-labelledby="segments-title">
      <div className="container">
        <Reveal className="section__head">
          <p className="eyebrow">Who is it for</p>
          <h2 id="segments-title">Built for the people who run cinema booking.</h2>
        </Reveal>
        <div className="segments__grid">
          {SEGMENTS.map((s, i) => (
            <Reveal key={s.title} className="card segment" delay={i * 90}>
              <span className="segment__tag">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <a href="#demo" className="segment__link">
                Talk to us <span aria-hidden>→</span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
