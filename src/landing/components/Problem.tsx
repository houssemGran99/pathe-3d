import { useState } from 'react';
import { SeatMap } from '../../booking/SeatMap';
import { demoSeatMap } from '../data/demoAuditorium';
import { Reveal } from './Reveal';

const POINTS = [
  {
    title: 'Positions, not perspectives',
    body: 'A seat map tells customers where a chair is. It says nothing about how close the screen feels, how steep the angle is or how far off-axis they will sit.',
  },
  {
    title: 'Premium seats are hard to justify',
    body: 'When the difference between a standard and a premium row is a colour in a legend, customers struggle to see what they are paying for.',
  },
  {
    title: 'Guesswork creates hesitation',
    body: 'Unsure customers pick by habit or abandon the flow. The booking journey has no moment that builds confidence in the choice.',
  },
  {
    title: 'The booking experience stands still',
    body: 'Auditoriums have evolved with laser projection, immersive sound and recliners. The online seat picker still looks like a spreadsheet.',
  },
];

/** Before/after comparison: the traditional map vs. the first-person render, with a draggable divider. */
export function Problem() {
  const [pos, setPos] = useState(55);
  return (
    <section className="section problem" id="problem" aria-labelledby="problem-title">
      <div className="container">
        <Reveal className="section__head">
          <p className="eyebrow">The problem</p>
          <h2 id="problem-title">Choosing a seat shouldn’t be a guessing game.</h2>
          <p className="section__lead">
            Online booking shows a grid of icons and asks customers to imagine the rest. The result is hesitation,
            misunderstood premium options and a step that adds nothing to the cinema experience.
          </p>
        </Reveal>

        <div className="problem__grid">
          <Reveal className="compare" delay={80}>
            <div className="compare__stage" style={{ ['--pos' as string]: `${pos}%` }}>
              <div className="compare__before" aria-label="Traditional seat map">
                <div className="compare__map">
                  <SeatMap map={demoSeatMap} selectedIds={['E8']} activeSeatId={null} onToggleSeat={() => {}} readOnly locale="en" />
                </div>
                <span className="compare__tag compare__tag--before">Traditional seat map</span>
              </div>
              <div className="compare__after" aria-label="SeatView 3D first-person preview">
                <img
                  src="/seatview-preview.jpg"
                  alt="First-person render from seat E8: the screen seen from the middle of the auditorium, red seats in the foreground"
                  width={1200}
                  height={750}
                  loading="lazy"
                  decoding="async"
                />
                <span className="compare__tag compare__tag--after">SeatView 3D</span>
              </div>
              <div className="compare__handle" aria-hidden>
                <span />
              </div>
              <input
                className="compare__range"
                type="range"
                min={8}
                max={92}
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
                aria-label="Compare traditional seat map with the 3D preview"
              />
            </div>
            <p className="compare__caption">Same seat, E8. Drag the divider to compare what the customer sees today with what they could see.</p>
          </Reveal>

          <ol className="problem__points">
            {POINTS.map((p, i) => (
              <Reveal as="li" key={p.title} delay={120 + i * 80}>
                <span className="problem__index">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
