import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateRange, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import ReactDOM from 'react-dom';

interface CalendarPortalProps {
  showCalendar: boolean;
  closeCalendar: () => void;
  selection: {
    startDate: Date;
    endDate: Date;
    key: string;
  };
  handleSelect: (ranges: RangeKeyDict) => void;
  setFocusedRange: React.Dispatch<React.SetStateAction<[number, 0 | 1]>>;
  focusedRange: [number, 0 | 1];
  datePickerRef: React.RefObject<HTMLDivElement | null>;
  maxDate: Date;
}

const CalendarPortal = React.memo(
  ({
    showCalendar,
    closeCalendar,
    selection,
    handleSelect,
    setFocusedRange,
    focusedRange,
    datePickerRef,
    maxDate,
  }: CalendarPortalProps) => {
    const calendarRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          calendarRef.current &&
          !calendarRef.current.contains(target) &&
          datePickerRef.current &&
          !datePickerRef.current.contains(target)
        ) {
          closeCalendar();
        }
      };

      if (showCalendar) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showCalendar, closeCalendar, datePickerRef]);

    useEffect(() => {
      if (!showCalendar) {
        setPosition(null);
        return;
      }

      if (datePickerRef.current) {
        const rect = datePickerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }, [showCalendar, datePickerRef]);

    if (!showCalendar || !position) return null;

    const portalElement = document.getElementById('tooltip-portal');
    if (!portalElement) return null;

    return ReactDOM.createPortal(
      <div
        ref={calendarRef}
        className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg"
        style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${position.width}px` }}
      >
        <style>{`
          .rdrCalendarWrapper {
            font-size: 12px;
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            box-sizing: border-box;
            width: 100%;
            display: flex;
            flex-direction: column;
          }
          .rdrMonths {
            display: flex;
            align-items: center;
            padding: 0 1rem;
          }
          .rdrMonth {
            flex-grow: 1;
            padding: 0;
            min-width: 0;
            margin-bottom: 0.5rem;
          }
          .rdrNextPrevButton {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            padding: 0;
            margin: 0 8px;
          }
          .rdrMonthAndYearWrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
            flex-shrink: 1;
            min-width: 0;
            padding: 0 0.6rem;
            height: 40px !important;
            min-height: 40px !important;
            margin-top: 0.3rem;
          }
          .rdrWeekDays {
            line-height: 0.1rem;
            margin-top: -0.5rem !important;
            margin-bottom: 0.0rem !important;
            height: 24px !important;
            display: flex !important;
            align-items: center !important;
          }
          .rdrWeekDay {
            padding: 0 !important;
            height: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .rdrMonthPicker, .rdrYearPicker {
            flex-shrink: 1;
            min-width: 0;
          }
          .rdrMonthPicker select, .rdrYearPicker select {
            font-size: 14px !important;
            font-weight: 600 !important;
            padding: 2px 20px 2px 4px !important;
            min-width: 0;
            max-width: 80px;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            background: transparent;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 4px center;
            background-size: 12px;
            cursor: pointer;
          }
          .rdrDateDisplayWrapper { display: none; }
          .rdrMonthName {
            padding: 0 0 0 6px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            margin-bottom: .5rem !important;
          }
          .rdrInRange .rdrDayNumber span,
          .rdrStartEdge .rdrDayNumber span,
          .rdrEndEdge .rdrDayNumber span,
          .rdrSelected .rdrDayNumber span {
            color: #000000 !important;
            font-weight: 700 !important;
          }
        `}</style>
        <DateRange
          ranges={[selection]}
          onChange={handleSelect}
          onRangeFocusChange={setFocusedRange}
          focusedRange={focusedRange}
          moveRangeOnFirstSelection={false}
          months={1}
          direction="horizontal"
          showDateDisplay={false}
          maxDate={maxDate}
        />
        <div className="p-2 border-t">
          <button
            onClick={closeCalendar}
            className="w-full px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:outline-none active:outline-none"
          >
            Done
          </button>
        </div>
      </div>,
      portalElement
    );
  }
);

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface DatasetBounds {
  startOfPeriod: Date;
  endOfPeriod: Date;
}

interface DateRangeSectionProps {
  dateRange: DateRangeValue;
  onDateRangeChange: (dateRange: DateRangeValue) => void;
  datasetBounds?: DatasetBounds;
}

const getToday = () => new Date();

function DateRangeSection({ dateRange, onDateRangeChange, datasetBounds }: DateRangeSectionProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selection, setSelection] = useState({
    startDate: dateRange.startDate || new Date(2020, 0, 1),
    endDate: dateRange.endDate || getToday(),
    key: 'selection'
  });
  const [focusedRange, setFocusedRange] = useState<[number, 0 | 1]>([0, 0]);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const calendarIcon = "/icons/calendar-icon.svg";

  // Sync internal selection state when external dateRange prop changes
  useEffect(() => {
    setSelection({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      key: 'selection'
    });
  }, [dateRange]);

  useEffect(() => {
    if (
      selection.startDate.getTime() === dateRange.startDate.getTime() &&
      selection.endDate.getTime() === dateRange.endDate.getTime()
    ) {
      return;
    }

    const timer = setTimeout(() => {
      onDateRangeChange({
        startDate: selection.startDate,
        endDate: selection.endDate
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [selection, dateRange, onDateRangeChange]);

  const handleSelect = useCallback((ranges: RangeKeyDict) => {
    if (ranges.selection) {
      const newSelection = {...selection, ...ranges.selection};
      setSelection(newSelection);
      // Update parent state
      onDateRangeChange({
        startDate: newSelection.startDate,
        endDate: newSelection.endDate
      });
    }
  }, [selection, onDateRangeChange]);

  const openCalendar = useCallback(() => {
    setShowCalendar(true);
  }, []);

  const closeCalendar = useCallback(() => {
    setShowCalendar(false);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  // Dataset time interval - use provided bounds or default to volume app bounds
  const { startOfPeriod, endOfPeriod, totalDays, startPercent, endPercent } = useMemo(() => {
    // The picker should always end at today's local date rather than a stale dataset snapshot.
    const startOfPeriod = datasetBounds?.startOfPeriod || new Date('2018-08-15T23:30:00');
    const endOfPeriod = getToday();
    const totalDays = (endOfPeriod.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24);
    
    const startPercent = Math.max(0, Math.min(100, ((selection.startDate.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100));
    const endPercent = Math.max(0, Math.min(100, ((selection.endDate.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100));
    
    return { startOfPeriod, endOfPeriod, totalDays, startPercent, endPercent };
  }, [selection.startDate, selection.endDate, datasetBounds]);

  const updateFromClientX = useCallback(
    (clientX: number, handle: 'start' | 'end') => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100)
      );
      const days = Math.round((percent / 100) * totalDays);
      const newDate = new Date(
        startOfPeriod.getTime() + days * 24 * 60 * 60 * 1000
      );
      const constrainedDate = new Date(
        Math.max(
          startOfPeriod.getTime(),
          Math.min(endOfPeriod.getTime(), newDate.getTime())
        )
      );

      if (handle === 'start' && constrainedDate <= selection.endDate) {
        setSelection((prev) => ({ ...prev, startDate: constrainedDate }));
      } else if (handle === 'end' && constrainedDate >= selection.startDate) {
        setSelection((prev) => ({ ...prev, endDate: constrainedDate }));
      }
    },
    [
      totalDays,
      startOfPeriod,
      endOfPeriod,
      selection.endDate,
      selection.startDate,
    ]
  );

  const beginDrag = useCallback(
    (type: 'start' | 'end', event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(type);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const onHandlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.preventDefault();
      event.stopPropagation();
      updateFromClientX(event.clientX, isDragging);
    },
    [isDragging, updateFromClientX]
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released
      }
      setIsDragging(null);
    },
    [isDragging]
  );

  // Keep dragging smooth when the pointer leaves the handle/track.
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      updateFromClientX(event.clientX, isDragging);
    };
    const onUp = () => setIsDragging(null);

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.cursor = 'grabbing';
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, updateFromClientX]);

  return (
    <div className="p-4">
      <div id="date-range-section">
        <h3 className="text-base font-medium text-gray-700 mb-3">Date Range</h3>
        <div ref={datePickerRef} id="date-range-picker" className="bg-gray-100 p-2 rounded-md">
          <div className="mb-1 flex flex-nowrap items-center justify-between gap-2">
            <span
              id="start-date-label"
              className="shrink-0 select-none whitespace-nowrap rounded bg-gray-200 px-2 py-1 text-sm text-gray-600"
            >
              {formatDate(selection.startDate)}
            </span>
            <button
              type="button"
              aria-label="Open calendar"
              onClick={openCalendar}
              className="flex shrink-0 items-center justify-center rounded p-1 hover:bg-gray-200 focus:outline-none"
              style={{ backgroundColor: 'transparent' }}
            >
              <img
                src={calendarIcon}
                alt=""
                className="h-4 w-4"
                draggable={false}
              />
            </button>
            <span
              id="end-date-label"
              className="shrink-0 select-none whitespace-nowrap rounded bg-gray-200 px-2 py-1 text-sm text-gray-600"
            >
              {formatDate(selection.endDate)}
            </span>
          </div>

          <div
            className={`relative flex h-6 select-none items-center px-2 ${
              isDragging ? 'cursor-grabbing' : ''
            }`}
            style={{ touchAction: 'none' }}
          >
            <div
              ref={trackRef}
              className="relative h-2 w-full rounded-full bg-gray-200"
            >
              <div
                id="date-range-selection"
                className="pointer-events-none absolute h-2 rounded-full bg-blue-500"
                style={{
                  left: `${startPercent}%`,
                  width: `${endPercent - startPercent}%`,
                }}
              />
              <div
                role="slider"
                aria-label="Start date"
                aria-valuenow={startPercent}
                tabIndex={0}
                className="absolute -top-1 size-4 cursor-grab rounded-full border-2 border-blue-500 bg-white touch-none select-none active:cursor-grabbing"
                style={{
                  left: `${startPercent}%`,
                  transform: 'translateX(-50%)',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => beginDrag('start', e)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={(e) => e.stopPropagation()}
              />
              <div
                role="slider"
                aria-label="End date"
                aria-valuenow={endPercent}
                tabIndex={0}
                className="absolute -top-1 size-4 cursor-grab rounded-full border-2 border-blue-500 bg-white touch-none select-none active:cursor-grabbing"
                style={{
                  left: `${endPercent}%`,
                  transform: 'translateX(-50%)',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => beginDrag('end', e)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <CalendarPortal
            showCalendar={showCalendar}
            closeCalendar={closeCalendar}
            selection={selection}
            handleSelect={handleSelect}
            setFocusedRange={setFocusedRange}
            focusedRange={focusedRange}
            datePickerRef={datePickerRef}
            maxDate={endOfPeriod}
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(DateRangeSection);