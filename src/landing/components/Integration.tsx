import { Reveal } from './Reveal';

const STEPS = [
  { title: 'Connect your seat-selection system', body: 'SeatView 3D reads the seat the customer picked from your existing booking page and never touches availability or pricing.' },
  { title: 'Import layouts and screen dimensions', body: 'Rows, columns, seat categories and the room’s key measurements describe each auditorium. Defaults cover rooms without survey data.' },
  { title: 'Configure the 3D auditorium', body: 'Brand, seat colours, categories and camera limits are set per operator or per room. The scene is generated procedurally.' },
  { title: 'Embed into the booking experience', body: 'Add a “View from this seat” action. The 3D module loads on demand so your booking flow stays as fast as it is today.' },
];

const METHODS = [
  { name: 'JavaScript SDK', body: 'Mount the preview from your front end with a seat id and an auditorium configuration.' },
  { name: 'Embeddable web component', body: 'A framework-agnostic element for Angular, React, Vue or server-rendered pages.' },
  { name: 'REST API', body: 'Retrieve auditorium configurations and per-seat viewing metrics for your own interfaces.' },
  { name: 'Custom integrations', body: 'For platforms with specific constraints, we adapt the integration together with your team.' },
];

export function Integration() {
  return (
    <section className="section integration" id="integration" aria-labelledby="integration-title">
      <div className="container">
        <Reveal className="section__head">
          <p className="eyebrow">Integration</p>
          <h2 id="integration-title">Designed to work with your existing cinema ecosystem.</h2>
          <p className="section__lead">
            SeatView 3D is a visualization layer, not a ticketing system. It plugs into the seat selection you already
            run and leaves the transaction untouched.
          </p>
        </Reveal>

        <Reveal className="diagram-wrap" delay={60}>
          <ArchitectureDiagram />
        </Reveal>

        <div className="integration__grid">
          <ol className="int-steps">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 80}>
                <span className="int-steps__num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <div className="methods">
            <Reveal as="h3" className="methods__title">
              Integration methods
            </Reveal>
            {METHODS.map((m, i) => (
              <Reveal key={m.name} className="methods__item" delay={80 + i * 70}>
                <strong>{m.name}</strong>
                <p>{m.body}</p>
              </Reveal>
            ))}
            <Reveal as="p" className="methods__note" delay={400}>
              Integrations are implemented per project; we do not claim compatibility with a specific ticketing platform
              until it has been built and tested with that platform.
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Architecture diagram: a wide layout, and a stacked one for narrow screens (inline SVG, themed by CSS). */
function ArchitectureDiagram() {
  return (
    <figure className="diagram">
      <TallDiagram />
      <svg className="diagram__wide" viewBox="0 0 960 300" role="img" aria-labelledby="diagram-title diagram-desc">
        <title id="diagram-title">SeatView 3D architecture</title>
        <desc id="diagram-desc">
          Your booking website and ticketing system send the selected seat to the SeatView 3D module; auditorium
          configuration feeds the module; the module renders the 3D preview inside the booking page.
        </desc>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0L10 5 0 10z" fill="#A1A1AA" />
          </marker>
          <linearGradient id="core" x1="0" x2="1">
            <stop offset="0" stopColor="#E50914" />
            <stop offset="1" stopColor="#8a0510" />
          </linearGradient>
        </defs>

        {/* Left: operator systems */}
        <g className="dg-box">
          <rect x="20" y="40" width="250" height="90" rx="14" />
          <text x="145" y="76" className="dg-title">Your booking website</text>
          <text x="145" y="102" className="dg-sub">seat selection · existing UI</text>
        </g>
        <g className="dg-box">
          <rect x="20" y="170" width="250" height="90" rx="14" />
          <text x="145" y="206" className="dg-title">Ticketing &amp; seat maps</text>
          <text x="145" y="232" className="dg-sub">availability · pricing · layouts</text>
        </g>

        {/* Centre: SeatView 3D */}
        <g className="dg-core">
          <rect x="360" y="60" width="240" height="180" rx="18" fill="url(#core)" />
          <text x="480" y="118" className="dg-core-title">SeatView 3D</text>
          <text x="480" y="146" className="dg-core-sub">camera model · 3D engine</text>
          <text x="480" y="168" className="dg-core-sub">SDK · web component · API</text>
          <text x="480" y="206" className="dg-core-sub dg-core-sub--muted">loads on demand</text>
        </g>

        {/* Right: outcome + config */}
        <g className="dg-box">
          <rect x="690" y="40" width="250" height="90" rx="14" />
          <text x="815" y="76" className="dg-title">3D preview in your page</text>
          <text x="815" y="102" className="dg-sub">first-person view · metrics</text>
        </g>
        <g className="dg-box dg-box--dashed">
          <rect x="690" y="170" width="250" height="90" rx="14" />
          <text x="815" y="206" className="dg-title">Auditorium configuration</text>
          <text x="815" y="232" className="dg-sub">rows · screen size · branding</text>
        </g>

        {/* Arrows */}
        <path d="M270 85 H360" className="dg-arrow" markerEnd="url(#arrow)" />
        <path d="M270 215 H360" className="dg-arrow" markerEnd="url(#arrow)" />
        <path d="M600 85 H690" className="dg-arrow" markerEnd="url(#arrow)" />
        <path d="M690 215 H600" className="dg-arrow" markerEnd="url(#arrow)" />
        <text x="315" y="72" className="dg-label">selected seat</text>
        <text x="315" y="202" className="dg-label">layouts</text>
        <text x="645" y="72" className="dg-label">render</text>
        <text x="645" y="202" className="dg-label">config</text>
      </svg>
    </figure>
  );
}

function TallDiagram() {
  return (
    <svg className="diagram__tall" viewBox="0 0 360 470" role="img" aria-labelledby="diagram-title-tall diagram-desc-tall">
      <title id="diagram-title-tall">SeatView 3D architecture</title>
      <desc id="diagram-desc-tall">
        Your booking website and ticketing system send the selected seat and layouts to SeatView 3D; auditorium
        configuration feeds it; it renders the 3D preview inside your booking page.
      </desc>
      <defs>
        <marker id="arrow-t" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0L10 5 0 10z" fill="#A1A1AA" />
        </marker>
        <linearGradient id="core-t" x1="0" x2="1">
          <stop offset="0" stopColor="#E50914" />
          <stop offset="1" stopColor="#8a0510" />
        </linearGradient>
      </defs>

      <g className="dg-box">
        <rect x="6" y="6" width="168" height="88" rx="14" />
        <text x="90" y="44" className="dg-title dg-title--sm">Booking website</text>
        <text x="90" y="68" className="dg-sub dg-sub--sm">seat selection</text>
      </g>
      <g className="dg-box">
        <rect x="186" y="6" width="168" height="88" rx="14" />
        <text x="270" y="44" className="dg-title dg-title--sm">Ticketing</text>
        <text x="270" y="68" className="dg-sub dg-sub--sm">layouts · availability</text>
      </g>

      <path d="M90 94 V164" className="dg-arrow" markerEnd="url(#arrow-t)" />
      <path d="M270 94 V164" className="dg-arrow" markerEnd="url(#arrow-t)" />
      <text x="100" y="134" className="dg-label dg-label--start">selected seat</text>
      <text x="280" y="134" className="dg-label dg-label--start">layouts</text>

      <g className="dg-core">
        <rect x="30" y="166" width="300" height="132" rx="18" fill="url(#core-t)" />
        <text x="180" y="212" className="dg-core-title">SeatView 3D</text>
        <text x="180" y="240" className="dg-core-sub">camera model · 3D engine</text>
        <text x="180" y="262" className="dg-core-sub">SDK · web component · API</text>
        <text x="180" y="284" className="dg-core-sub dg-core-sub--muted">loads on demand</text>
      </g>

      <path d="M90 374 V300" className="dg-arrow" markerEnd="url(#arrow-t)" />
      <path d="M270 298 V372" className="dg-arrow" markerEnd="url(#arrow-t)" />
      <text x="100" y="340" className="dg-label dg-label--start">config</text>
      <text x="280" y="340" className="dg-label dg-label--start">render</text>

      <g className="dg-box dg-box--dashed">
        <rect x="6" y="376" width="168" height="88" rx="14" />
        <text x="90" y="414" className="dg-title dg-title--sm">Room config</text>
        <text x="90" y="438" className="dg-sub dg-sub--sm">rows · screen size</text>
      </g>
      <g className="dg-box">
        <rect x="186" y="376" width="168" height="88" rx="14" />
        <text x="270" y="414" className="dg-title dg-title--sm">3D preview</text>
        <text x="270" y="438" className="dg-sub dg-sub--sm">in your booking page</text>
      </g>
    </svg>
  );
}
