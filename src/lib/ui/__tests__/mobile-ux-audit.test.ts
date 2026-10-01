import { describe, it, expect } from 'vitest';
import {
  auditTouchTarget,
  auditViewportCompatibility,
  MIN_RECOMMENDED_TOUCH_TARGET_PX,
} from '../mobile-ux-audit';

describe('V2-402 Mobile-First UX Audits', () => {
  it('passes elements meeting or exceeding 44px min touch target', () => {
    const res = auditTouchTarget({
      widthPx: 48,
      heightPx: 44,
      elementLabel: 'Primary Submit Button',
    });

    expect(res.isTouchFriendly).toBe(true);
    expect(res.widthDeficitPx).toBe(0);
    expect(res.heightDeficitPx).toBe(0);
    expect(res.error).toBeUndefined();
  });

  it('fails elements below 44px min touch target', () => {
    const res = auditTouchTarget({
      widthPx: 32,
      heightPx: 32,
      elementLabel: 'Icon Only Action',
    });

    expect(res.isTouchFriendly).toBe(false);
    expect(res.widthDeficitPx).toBe(12);
    expect(res.heightDeficitPx).toBe(12);
    expect(res.error).toContain("below minimum recommended 44x44px touch target");
  });

  it('identifies compact (375px) and standard (390px) mobile viewports', () => {
    expect(auditViewportCompatibility(375).viewportType).toBe('compact_mobile');
    expect(auditViewportCompatibility(390).viewportType).toBe('standard_mobile');
    expect(auditViewportCompatibility(1024).viewportType).toBe('tablet_desktop');
  });
});
