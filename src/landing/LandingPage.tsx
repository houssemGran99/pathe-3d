import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SeatMap } from '../booking/SeatMap';
import { useBookingState } from '../booking/useBookingState';
import { SeatPreviewOverlay, patheSeatMapToAuditorium } from '../seat-preview';
import { Benefits } from './components/Benefits';
import { DemoForm } from './components/DemoForm';
import { Experience } from './components/Experience';
import { Features } from './components/Features';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Integration } from './components/Integration';
import { Nav } from './components/Nav';
import { Problem } from './components/Problem';
import { Segments } from './components/Segments';
import { demoSeatMap } from './data/demoAuditorium';
import './landing.css';

const TITLE = 'SeatView 3D | Immersive Cinema Seat Visualization';

export function LandingPage() {
  const booking = useBookingState(demoSeatMap);
  const captureStarted = useRef(false);
  const { selectedIds, activeSeatId, previewOpen, toggleSeat, openPreview, closePreview, setActiveSeatId } = booking;

  // One auditorium model shared by the hero scene and the full-screen preview.
  const auditorium = useMemo(
    () => patheSeatMapToAuditorium(demoSeatMap, { selectedSeatIds: selectedIds, locale: 'en' }),
    [selectedIds],
  );

  useEffect(() => {
    document.title = TITLE;
  }, []);

  // Dev-only capture mode (`?capture=E8`): opens the preview on that seat with the UI hidden, so a headless
  // browser can screenshot the bare render for marketing assets (before/after image, Open Graph image).
  useEffect(() => {
    if (!import.meta.env.DEV || captureStarted.current) return;
    const id = new URLSearchParams(window.location.search).get('capture');
    if (!id) return;
    captureStarted.current = true;
    document.documentElement.classList.add('is-capture');
    toggleSeat(id);
    openPreview(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFromHero = useCallback(
    (seatId: string) => {
      if (!selectedIds.includes(seatId)) toggleSeat(seatId);
      openPreview(seatId);
    },
    [selectedIds, toggleSeat, openPreview],
  );

  const renderSeatMap = useCallback(
    () => (
      <SeatMap
        map={demoSeatMap}
        selectedIds={selectedIds}
        activeSeatId={activeSeatId}
        onToggleSeat={toggleSeat}
        onActivateSeat={setActiveSeatId}
        selectActiveOnly
        compact
        variant="dark"
        locale="en"
      />
    ),
    [selectedIds, activeSeatId, toggleSeat, setActiveSeatId],
  );

  return (
    <div className="site">
      <Nav />
      <main id="main">
        <Hero auditorium={auditorium} previewOpen={previewOpen} onOpenPreview={openFromHero} />
        <Problem />
        <Experience map={demoSeatMap} booking={booking} />
        <Features />
        <Integration />
        <Benefits />
        <Segments />
        <FinalCta />
        <DemoForm />
      </main>
      <Footer />

      <SeatPreviewOverlay
        open={previewOpen}
        auditorium={auditorium}
        seatId={activeSeatId}
        selectedSeatIds={selectedIds}
        onClose={closePreview}
        onSeatChange={setActiveSeatId}
        locale="en"
        renderSeatMap={renderSeatMap}
        brand="SeatView 3D"
        className="sp-overlay--seatview"
      />
    </div>
  );
}
