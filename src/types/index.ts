export interface DateEventDetail {
  eventType?: string;
  [key: string]: unknown;
}

export interface CalendarStatusPayload {
  success: boolean;
  dateStatuses?: Record<string, 'blocked' | 'pending' | 'available'>;
  dateEvents?: Record<string, DateEventDetail>;
}
