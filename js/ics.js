import { dkey } from './dates.js';

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Escape text for iCalendar fields.
const txt = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function reminderDays(s, r) {
  const days = r.days === 'gym' ? s.settings.gymDays : r.days;
  return !days || days.length === 7 ? null : days;
}

// Recurring calendar events with an alert at the event time. The phone's calendar
// fires them reliably even when the app is closed. Stable UIDs mean re-importing
// updates the same events.
export function buildICS(s) {
  const base = (s.settings.appUrl || location.origin + location.pathname).split('#')[0];
  const date = dkey().replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rebuild//Habit reminders//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Rebuild'];
  for (const r of s.reminders) {
    if (r.off || !r.time || !r.text) continue;
    const days = reminderDays(s, r);
    if (days && !days.length) continue;
    const url = `${base}#${r.link || 'today'}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:rebuild-${r.id}@rebuild.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${date}T${r.time.replace(':', '')}00`,
      'DURATION:PT5M',
      `RRULE:${days ? `FREQ=WEEKLY;BYDAY=${days.map(d => DAYS[d]).join(',')}` : 'FREQ=DAILY'}`,
      `SUMMARY:${txt(r.text)}`,
      `DESCRIPTION:${txt(url)}`,
      `URL:${url}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${txt(r.text)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
