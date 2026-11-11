import { SeatMap } from '../../booking/SeatMap';
import { SEAT_TYPE_LABELS, type PatheSeatMap } from '../../booking/types';
import type { BookingState } from '../../booking/useBookingState';
import { Reveal } from './Reveal';

const STEPS = [
  { title: 'Select a seat', body: 'The customer picks a seat on your existing seating map, exactly as they do today.' },
  { title: 'Launch the 3D preview', body: 'A “View from this seat” action opens the first-person auditorium in under a second.' },
  { title: 'Explore the perspective', body: 'They look around, zoom, compare seats and read the distance and angle for each one.' },
  { title: 'Confirm with confidence', body: 'Closing the preview returns to your booking flow with the selection intact.' },
];

interface Props {
  map: PatheSeatMap;
  booking: BookingState;
}

/** The complete journey, with the real engine: pick a seat below and launch the actual preview. */
export function Experience({ map, booking }: Props) {
  const { selectedIds, activeSeatId, toggleSeat, openPreview } = booking;
  const activeSeat = activeSeatId ? booking.seatsById.get(activeSeatId) : undefined;
  const typeLabel = activeSeat ? (SEAT_TYPE_LABELS[activeSeat.seatType]?.en ?? activeSeat.seatType) : '';

  return (
    <section className="section experience" id="how-it-works" aria-labelledby="experience-title">
      <div className="container">
        <Reveal className="section__head">
          <p className="eyebrow">The experience</p>
          <h2 id="experience-title">From selecting a seat to experiencing it.</h2>
          <p className="section__lead">
            Four steps, no new app and no change to how tickets are sold. Try it below: this is the live product, not a
            mock-up.
          </p>
        </Reveal>

        <div className="experience__grid">
          <ol className="steps">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} className="steps__item" delay={i * 90}>
                <span className="steps__num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal className="demo-card" delay={120}>
            <div className="demo-card__head">
              <div>
                <strong>{map.roomName}</strong>
                <span>{map.seatsAvailable} seats available</span>
              </div>
              <span className="demo-card__badge">Live demo</span>
            </div>
            <div className="demo-card__map">
              <SeatMap
                map={map}
                selectedIds={selectedIds}
                activeSeatId={activeSeatId}
                onToggleSeat={toggleSeat}
                onActivateSeat={booking.setActiveSeatId}
                variant="dark"
                locale="en"
              />
            </div>
            <ul className="demo-card__legend">
              <li><i className="lg lg--free" /> Available</li>
              <li><i className="lg lg--sel" /> Selected</li>
              <li><i className="lg lg--taken" /> Taken</li>
              <li><i className="lg lg--prm" /> Premium</li>
              <li><i className="lg lg--pmr" /> Wheelchair</li>
            </ul>
            <div className="demo-card__bar">
              <div className="demo-card__selection">
                {activeSeat ? (
                  <>
                    <strong>
                      {activeSeat.rowName}
                      {activeSeat.seatName}
                    </strong>
                    <span>{typeLabel}</span>
                    {selectedIds.length > 1 && <span className="demo-card__more">+{selectedIds.length - 1} more</span>}
                  </>
                ) : (
                  <span className="demo-card__empty">Click a seat to select it</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!activeSeatId}
                onClick={() => activeSeatId && openPreview(activeSeatId)}
              >
                <EyeIcon /> View from this seat
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);
