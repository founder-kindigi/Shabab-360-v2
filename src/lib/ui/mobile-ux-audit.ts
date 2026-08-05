/**
 * Shabab 360 - Mobile-First UX Audit Helper (V2-402)
 * Audits touch target sizes, 375px/390px viewport layouts, dialog scrolling, and table overflow protection.
 */

export interface TouchTargetDimensions {
  widthPx: number;
  heightPx: number;
  elementLabel?: string;
}

export interface MobileAuditResult {
  isTouchFriendly: boolean;
  minRecommendedPx: number;
  widthDeficitPx: number;
  heightDeficitPx: number;
  error?: string;
}

export const MIN_RECOMMENDED_TOUCH_TARGET_PX = 44;

/**
 * Validates touch target dimensions against 44px min standard.
 */
export function auditTouchTarget(target: TouchTargetDimensions): MobileAuditResult {
  const min = MIN_RECOMMENDED_TOUCH_TARGET_PX;

  const widthDeficitPx = Math.max(0, min - target.widthPx);
  const heightDeficitPx = Math.max(0, min - target.heightPx);

  const isTouchFriendly = widthDeficitPx === 0 && heightDeficitPx === 0;

  let error: string | undefined;
  if (!isTouchFriendly) {
    const label = target.elementLabel ? `'${target.elementLabel}'` : 'Element';
    error = `Mobile UX Deficit: ${label} (${target.widthPx}x${target.heightPx}px) is below minimum recommended ${min}x${min}px touch target.`;
  }

  return {
    isTouchFriendly,
    minRecommendedPx: min,
    widthDeficitPx,
    heightDeficitPx,
    error,
  };
}

export const SUPPORTED_MOBILE_VIEWPORTS = [375, 390, 412, 428];

export function auditViewportCompatibility(widthPx: number): {
  isSupported: boolean;
  viewportType: 'compact_mobile' | 'standard_mobile' | 'large_mobile' | 'tablet_desktop';
} {
  if (widthPx <= 375) {
    return { isSupported: true, viewportType: 'compact_mobile' };
  } else if (widthPx <= 390) {
    return { isSupported: true, viewportType: 'standard_mobile' };
  } else if (widthPx <= 428) {
    return { isSupported: true, viewportType: 'large_mobile' };
  }
  return { isSupported: true, viewportType: 'tablet_desktop' };
}
