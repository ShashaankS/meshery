import { deleteEvent, deleteEvents, updateEventStatus, updateEvents } from '../store/slices/events';
import { api } from './index';

/**
 * Converts an object with filters into a parsed object.
 *
 * This function takes an input object containing filters and returns a parsed object
 * where empty or non-string values are removed, and non-string values (like Sets)
 * are stringified using JSON.stringify.
 *
 * @param {Object} filters - The input object containing filters.
 * @returns {Object} - The parsed object with filters.
 *
 * @example
 * // Example 1: Basic usage
 * const filters = {
 *   name: 'John',
 *   age: 30,
 *   active: true,
 *   interests: new Set(['reading', 'gaming']),
 *   city: null
 * };
 *
 * const parsed = parseFilters(filters);
 * // Result:
 * // {
 * //   name: 'John',
 * //   age: '30',
 * //   active: 'true',
 * //   interests: '["reading","gaming"]'
 * // }
 *
 * @example
 * // Example 2: Empty values are filtered out
 * const filters = {
 *   name: '',
 *   age: 0,
 *   active: false,
 *   city: undefined
 * };
 *
 * const parsed = parseFilters(filters);
 * // Result: {} (empty object)
 *
 * @example
 * // Example 3: Nested objects are not supported
 * const filters = {
 *   person: {
 *     name: 'Alice',
 *     age: 25
 *   }
 * };
 *
 * const parsed = parseFilters(filters);
 * // Result: { person: {} }
 */
function parseFilters(filters) {
  return Object.entries(filters).reduce((parsedFilters, [key, value]) => {
    if (value || typeof value === 'string') {
      parsedFilters[key] =
        typeof value === 'string'
          ? value
          : JSON.stringify(value, (_key, val) => (val instanceof Set ? [...val] : val));
    }
    return parsedFilters;
  }, {});
}
export const PROVIDER_TAGS = {
  EVENT: 'event',
};

const safeQueryResolve = async (queryFulfilled) => {
  try {
    return await queryFulfilled;
  } catch {
    console.error('Error while resolving query', queryFulfilled);
    return null;
  }
};

export const notificationCenterApi = api
  .enhanceEndpoints({
    addTagTypes: Object.values(PROVIDER_TAGS),
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getEvents: builder.query({
        query: ({ page = 0, filters = {} }) => {
          const parsedFilters = parseFilters(filters);
          return {
            url: `system/events`,
            params: {
              ...parsedFilters,
              page: page,
              sort: 'created_at',
              order: 'desc',
              pagesize: 15,
            },
          };
        },
        providesTags: [PROVIDER_TAGS.EVENT],
      }),

      getEventsSummary: builder.query({
        query: ({ status }) => {
          return {
            url: `system/events?page=0&pagesize=1&status=${status}`,
          };
        },
        transformResponse: (response) => {
          return {
            count_by_severity_level: response.count_by_severity_level,
            total_count: response.total_count,
            read_count: response.read_count || 0,
          };
        },
        providesTags: [PROVIDER_TAGS.EVENT],
      }),

      updateStatus: builder.mutation({
        query: ({ id, status }) => ({
          url: `system/events/status/${id}`,
          method: 'PUT',
          body: {
            status: status,
          },
        }),
        onQueryStarted: async ({ id, status }, { dispatch, queryFulfilled }) => {
          const res = await safeQueryResolve(queryFulfilled);
          res && dispatch(updateEventStatus({ id, status }));
        },
        invalidatesTags: [PROVIDER_TAGS.EVENT],
      }),

      deleteEvent: builder.mutation({
        query: ({ id }) => ({
          url: `system/events/${id}`,
          method: 'DELETE',
        }),
        async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
          const res = await safeQueryResolve(queryFulfilled);
          res && dispatch(deleteEvent({ id }));
        },
        invalidatesTags: [PROVIDER_TAGS.EVENT],
      }),

      getEventFilters: builder.query({
        query: () => `system/events/types`,
      }),

      //Bulk Operations
      updateEvents: builder.mutation({
        query: ({ ids, updatedFields }) => ({
          url: `system/events/status/bulk`,
          method: 'PUT',
          body: {
            ids,
            ...updatedFields,
          },
        }),

        async onQueryStarted({ ids, updatedFields }, { dispatch, queryFulfilled }) {
          const res = await safeQueryResolve(queryFulfilled);
          res &&
            dispatch(
              updateEvents(
                ids.map((id) => ({
                  id,
                  changes: {
                    ...updatedFields,
                  },
                })),
              ),
            );
        },

        invalidatesTags: [PROVIDER_TAGS.EVENT],
      }),

      deleteEvents: builder.mutation({
        query: ({ ids }) => ({
          url: `system/events/bulk`,
          method: 'DELETE',
          body: {
            ids,
          },
        }),
        async onQueryStarted({ ids }, { dispatch, queryFulfilled }) {
          const res = await safeQueryResolve(queryFulfilled);
          res && dispatch(deleteEvents({ ids }));
        },
        invalidatesTags: [PROVIDER_TAGS.EVENT],
      }),

      // Event Configuration Endpoints
      // TODO: yet to be integrated
      getEventConfig: builder.query({
        query: () => ({
          url: `system/events/config`,
          method: 'GET',
        }),
        transformResponse: (response) => ({
          logLevel: response.event_log_level,
          availableLevels: response.available_levels,
        }),
        providesTags: [PROVIDER_TAGS.EVENT],
      }),

      updateEventConfig: builder.mutation({
        query: (logLevel) => ({
          url: `system/events/config`,
          method: 'PUT',
          body: {
            event_log_level: logLevel,
          },
        }),
        onQueryStarted: async (logLevel, { dispatch, queryFulfilled }) => {
          const res = await safeQueryResolve(queryFulfilled);
          res && dispatch();
        },
        invalidatesTags: [PROVIDER_TAGS.EVENT],
      }),
    }),
    overrideExisting: false,
  });

export const {
  useGetEventsSummaryQuery,
  useUpdateStatusMutation,
  useDeleteEventMutation,
  useLazyGetEventsQuery,
  useGetEventFiltersQuery,
  useDeleteEventsMutation,
  useUpdateEventsMutation,
} = notificationCenterApi;
