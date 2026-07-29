/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { createMashwaraSchema, STATUS_STYLES } from "./_client";
import { decisionFormSchema } from "@/components/mashwara/MashwaraDecisionModal";
import { shareFormSchema } from "@/components/mashwara/MashwaraShareModal";

describe("Mashwara UI Validation Schemas", () => {
  describe("createMashwaraSchema", () => {
    it("accepts a valid mashwara creation payload", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "Lahore Weekly Mashwara #1",
        scheduledAt: "2026-08-01T10:00:00.000Z",
        location: "GULBERG_PARK",
        minutesSummary: "Discussion on upcoming youth event",
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal payload without optional location or summary", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "Weekly Sync",
        scheduledAt: "2026-08-01T10:00:00",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "  ",
        scheduledAt: "2026-08-01T10:00:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing cityId", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "",
        title: "Weekly Sync",
        scheduledAt: "2026-08-01T10:00:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing scheduledAt", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "Weekly Sync",
        scheduledAt: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("decisionFormSchema", () => {
    it("accepts valid decision without action item", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Approve event budget for sports day",
        category: "Budget",
        targetTeamId: "team-sports-1",
        assignedToId: "staff-123",
        hasActionItem: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid decision with action item", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Organize park welcome banner",
        category: "Logistics",
        targetTeamId: "team-media-1",
        assignedToId: "staff-123",
        hasActionItem: true,
        actionItemDescription: "Design and print 10 foot banner",
        actionItemTeamId: "team-media-1",
        actionItemAssignedToId: "staff-123",
        actionItemDueDate: "2026-08-10",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty decision text", () => {
      const result = decisionFormSchema.safeParse({
        decision: "",
        hasActionItem: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects action item when description is missing", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Setup welcome desk",
        hasActionItem: true,
        actionItemDescription: "",
        actionItemTeamId: "team-media-1",
        actionItemAssignedToId: "staff-123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects action item when team or assignee is missing", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Setup welcome desk",
        hasActionItem: true,
        actionItemDescription: "Prepare welcome counter",
        actionItemTeamId: "",
        actionItemAssignedToId: "staff-123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("shareFormSchema", () => {
    it("accepts a valid staffMetaId", () => {
      const result = shareFormSchema.safeParse({
        staffMetaId: "sm-staff-999",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty staffMetaId", () => {
      const result = shareFormSchema.safeParse({
        staffMetaId: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("STATUS_STYLES", () => {
    it("has styling classes defined for all meeting statuses", () => {
      expect(STATUS_STYLES.scheduled).toBeDefined();
      expect(STATUS_STYLES.in_progress).toBeDefined();
      expect(STATUS_STYLES.completed).toBeDefined();
      expect(STATUS_STYLES.cancelled).toBeDefined();
    });
  });
});
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { vi, afterEach } from 'vitest';
import MashwaraDetailClient from './[id]/_client';
import MashwaraDashboardClient from './_client';
import { useQuery } from '@tanstack/react-query';

afterEach(() => {
  cleanup();
});

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-m-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/stores/useAppStore', () => ({
  useAppStore: vi.fn((selector) => {
    const store = { selectedEventId: '', navigateTo: vi.fn(), setSelectedEventId: vi.fn() };
    return typeof selector === 'function' ? selector(store) : store;
  })
}));

// Default mock: scoped user with canManage true.
// Individual tests override via vi.mocked(useQuery).mockImplementation(makeUseQueryMock(ctx)).
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options: any) => {
    if (options?.queryKey?.[0] === 'mashwara-ui-context') {
      // Default scoped context — overridden per test as needed
      return { data: { canView: true, canManage: true, isHq: false, actorCityId: 'c-1' }, isLoading: false };
    }
    if (options?.queryKey?.[0] === 'cities-list') {
      return { data: [{ id: 'c-1', name: 'Lahore' }], isLoading: false };
    }
    if (options?.queryKey?.[0] === 'admin-mashwara') {
      return {
        data: { data: [], pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
        isLoading: false,
        enabled: options?.enabled
      };
    }
    return {
      data: {
        id: 'test-m-1',
        cityId: 'c-1',
        title: 'Mock Meeting',
        status: 'scheduled',
        scheduledAt: new Date().toISOString(),
        minutesSummary: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attendees: [],
        decisions: [],
        actionItems: [],
        shares: [],
        createdBy: { id: 'u-1', name: 'Mock Creator' }
      },
      isLoading: false
    };
  }),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() }))
}));

// Helper to build a context-aware useQuery mock with a given ui-context payload.
function makeUseQueryMock(uiCtx: { canView: boolean; canManage: boolean; isHq: boolean; actorCityId: string | null }) {
  return (options: any) => {
    if (options?.queryKey?.[0] === 'mashwara-ui-context') {
      return { data: uiCtx, isLoading: false };
    }
    if (options?.queryKey?.[0] === 'cities-list') {
      return { data: [{ id: 'c-1', name: 'Lahore' }], isLoading: false };
    }
    if (options?.queryKey?.[0] === 'admin-mashwara') {
      return {
        data: { data: [], pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
        isLoading: false,
        enabled: options?.enabled
      };
    }
    return {
      data: {
        id: 'test-m-1',
        cityId: 'c-1',
        title: 'Mock Meeting',
        status: 'scheduled',
        scheduledAt: new Date().toISOString(),
        minutesSummary: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attendees: [],
        decisions: [],
        actionItems: [],
        shares: [],
        createdBy: { id: 'u-1', name: 'Mock Creator' }
      },
      isLoading: false
    };
  };
}

describe('Mashwara UI Capability Rendering', () => {
  it('renders manage controls (Add Decision / Grant Share) when ui-context returns canManage true', () => {
    // Default mock already returns canManage: true for scoped user
    render(React.createElement(MashwaraDetailClient));
    expect(screen.getByText('Add Decision')).toBeTruthy();
  });

  it('hides manage controls when ui-context returns canManage false', () => {
    vi.mocked(useQuery).mockImplementation(
      makeUseQueryMock({ canView: true, canManage: false, isHq: false, actorCityId: 'c-1' }) as any
    );
    render(React.createElement(MashwaraDetailClient));
    expect(screen.queryByText('Grant Share')).toBeNull();
    expect(screen.queryByText('Add Decision')).toBeNull();
  });
});

describe('HQ City Gating UI Constraints', () => {
  it('disables Schedule Mashwara button and shows city selection prompt when HQ has no city selected', () => {
    vi.mocked(useQuery).mockImplementation(
      makeUseQueryMock({ canView: true, canManage: true, isHq: true, actorCityId: null }) as any
    );
    render(React.createElement(MashwaraDashboardClient));

    const scheduleBtn = screen.getByText('Schedule Mashwara').closest('button');
    expect(scheduleBtn?.disabled).toBe(true);
    expect(screen.getByText('Select a City')).toBeTruthy();
  });

  it('does not fetch meetings list until HQ selects a city (enabled must be false)', () => {
    const mockImpl = makeUseQueryMock({ canView: true, canManage: true, isHq: true, actorCityId: null });
    const spy = vi.fn(mockImpl);
    vi.mocked(useQuery).mockImplementation(spy as any);

    render(React.createElement(MashwaraDashboardClient));

    const mashwaraCall = spy.mock.calls.find(
      (call: any) => Array.isArray(call[0]?.queryKey) && call[0]?.queryKey[0] === 'admin-mashwara'
    );
    expect(mashwaraCall?.[0]?.enabled).toBe(false);
  });

  it('does not leak role name or PII from ui-context into rendered DOM', () => {
    vi.mocked(useQuery).mockImplementation(
      makeUseQueryMock({ canView: true, canManage: true, isHq: true, actorCityId: null }) as any
    );
    render(React.createElement(MashwaraDashboardClient));
    expect(screen.queryByText('super_admin')).toBeNull();
    expect(screen.queryByText('program_admin')).toBeNull();
  });
});
