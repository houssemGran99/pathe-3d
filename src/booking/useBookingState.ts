import { useCallback, useMemo, useState } from 'react';
import type { PatheSeat, PatheSeatMap } from './types';
import { isSeatAvailable, seatId } from './types';

export const MAX_SEATS = 10;

/**
 * Seat selection state of the booking page. The 3D preview reads from it and never writes to seat
 * availability: it can only change which selected seat is being previewed, or toggle a selection
 * through the same `toggleSeat` the seat map uses.
 */
export function useBookingState(map: PatheSeatMap) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /** Seat currently shown in the 3D preview (defaults to the last seat clicked). */
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const seatsById = useMemo(() => {
    const m = new Map<string, PatheSeat>();
    map.seats.flat().forEach((s) => m.set(seatId(s), s));
    return m;
  }, [map]);

  const toggleSeat = useCallback(
    (id: string) => {
      const seat = seatsById.get(id);
      if (!seat || !isSeatAvailable(seat)) return;
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          const next = prev.filter((s) => s !== id);
          setActiveSeatId((active) => (active === id ? (next[next.length - 1] ?? null) : active));
          return next;
        }
        if (prev.length >= MAX_SEATS) return prev;
        setActiveSeatId(id);
        return [...prev, id];
      });
    },
    [seatsById],
  );

  const openPreview = useCallback((id?: string) => {
    if (id) setActiveSeatId(id);
    setPreviewOpen(true);
  }, []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setActiveSeatId(null);
  }, []);

  return {
    selectedIds,
    activeSeatId,
    setActiveSeatId,
    previewOpen,
    toggleSeat,
    openPreview,
    closePreview,
    clearSelection,
    seatsById,
  };
}

export type BookingState = ReturnType<typeof useBookingState>;
