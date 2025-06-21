import { ticks } from '../../src/utils/ticks.js';
import mongoose from 'mongoose';
describe('ticks()', () => {
    const staffId = new mongoose.Types.ObjectId();

    test('1-minute ticks for 30-minute span', () => {
        const start = new Date('2025-07-21T10:00:00Z');
        const end   = new Date('2025-07-21T10:30:00Z');

        const out = ticks(staffId, start, end);
        expect(out).toHaveLength(30);
        console.log(out.length)
        expect(out[0].slotStart.toISOString()).toBe('2025-07-21T10:00:00.000Z');
        expect(out[29].slotStart.toISOString()).toBe('2025-07-21T10:29:00.000Z');
    });

    test('5-minute ticks for same span', () => {
        const start = new Date('2025-07-21T10:00:00Z');
        const end   = new Date('2025-07-21T10:30:00Z');

        const out = ticks(staffId, start, end, 5);
        expect(out).toHaveLength(6);
    });

    test('start == end ⇒ empty list', () => {
        const t = new Date('2025-07-21T10:00:00Z');
        expect(ticks(staffId, t, t)).toEqual([]);
    });

    test('start > end ⇒ empty list', () => {
        const start = new Date('2025-07-21T10:30:00Z');
        const end   = new Date('2025-07-21T10:00:00Z');
        expect(ticks(staffId, start, end)).toEqual([]);
    });

    test('each tick has correct staffId', () => {
        const out = ticks(staffId, new Date('2025-07-21T09:00:00Z'),
            new Date('2025-07-21T09:03:00Z'));
        out.forEach(t => expect(t.staffId.toString()).toBe(staffId.toString()));
    });

    test('crossing midnight', () => {
        const start = new Date('2025-07-21T23:58:00Z');
        const end   = new Date('2025-07-22T00:02:00Z');
        const out   = ticks(staffId, start, end);
        const iso   = out.map(o => o.slotStart.toISOString());
        expect(iso).toEqual([
            '2025-07-21T23:58:00.000Z',
            '2025-07-21T23:59:00.000Z',
            '2025-07-22T00:00:00.000Z',
            '2025-07-22T00:01:00.000Z'
        ]);
    });
});
