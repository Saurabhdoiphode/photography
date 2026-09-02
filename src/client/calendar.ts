import { CalendarStatusPayload, DateEventDetail } from '../types/index.js';

export class ClientCalendarController {
  private now: Date = new Date();
  private currentYear: number = this.now.getFullYear();
  private currentMonth: number = this.now.getMonth();
  private dateStatuses: Record<string, 'blocked' | 'pending' | 'available'> = {};
  private dateEvents: Record<string, DateEventDetail> = {};
  private selectedBookingDate: string | null = null;

  private monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  constructor() {
    this.init();
  }

  private init(): void {
    document.addEventListener('DOMContentLoaded', () => {
      this.fetchCalendarStatuses();
      this.bindMonthNavigation();
    });
  }

  private formatDateStr(year: number, month: number, day: number): string {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  private getTodayStr(): string {
    return this.formatDateStr(this.now.getFullYear(), this.now.getMonth(), this.now.getDate());
  }

  public async fetchCalendarStatuses(): Promise<void> {
    try {
      const res = await fetch(`/api/calendar-status?t=${Date.now()}`);
      const data: CalendarStatusPayload = await res.json();
      if (data.success && data.dateStatuses) {
        this.dateStatuses = data.dateStatuses;
        this.dateEvents = data.dateEvents || {};
      }
    } catch (err) {
      console.error('Failed to load calendar statuses:', err);
    }
    this.renderCalendar();
  }

  public renderCalendar(): void {
    const monthHeader = document.getElementById('calendarMonth');
    const datesContainer = document.getElementById('calendarDates');

    if (!monthHeader || !datesContainer) return;

    monthHeader.textContent = `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
    datesContainer.innerHTML = '';

    const firstDayIndex = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const todayStr = this.getTodayStr();

    // Render Blank padding cells
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'date-cell disabled';
      emptyCell.style.opacity = '0.1';
      datesContainer.appendChild(emptyCell);
    }

    // Render Days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = this.formatDateStr(this.currentYear, this.currentMonth, day);
      const cell = document.createElement('div');
      cell.className = 'date-cell';
      cell.textContent = String(day);
      cell.dataset.date = dateStr;

      const status = this.dateStatuses[dateStr] || 'available';

      if (dateStr < todayStr) {
        cell.classList.add('disabled');
        cell.title = 'Past Date';
        cell.onclick = () => this.showToast('⚠️ Cannot book past dates.');
      } else if (status === 'blocked') {
        cell.classList.add('unavailable');
        cell.title = 'Blocked / Booked Date - Click to view order details';
        cell.onclick = () => this.showEventModal(dateStr, 'blocked');
      } else if (status === 'pending') {
        cell.classList.add('pending');
        cell.title = 'Pending Confirmation - Click to view order details';
        cell.onclick = () => this.showEventModal(dateStr, 'pending');
      } else {
        cell.classList.add('available');
        cell.title = 'Available Date - Click to Book! (Green)';

        if (this.selectedBookingDate === dateStr) {
          cell.classList.add('selected');
        }

        cell.onclick = () => this.handleDateClick(dateStr, day);
      }

      datesContainer.appendChild(cell);
    }
  }

  private showEventModal(dateStr: string, status: 'blocked' | 'pending'): void {
    const modal = document.getElementById('eventDetailsModal');
    const dateHeading = document.getElementById('modalEventDate');
    const typeText = document.getElementById('modalEventType');
    const statusBadge = document.getElementById('modalEventStatus');

    if (!modal) return;

    const ev = this.dateEvents[dateStr] || {};
    const eventName = ev.eventType || (status === 'blocked' ? 'Confirmed Photography Shoot' : 'Pending Shoot Inquiry');

    if (dateHeading) dateHeading.textContent = `📅 Date: ${dateStr}`;
    if (typeText) typeText.textContent = eventName;

    if (statusBadge) {
      if (status === 'blocked') {
        statusBadge.textContent = '🔴 Confirmed Shoot / Booked';
        statusBadge.style.background = '#FEE2E2';
        statusBadge.style.color = '#991B1B';
        statusBadge.style.border = '1px solid #FCA5A5';
      } else {
        statusBadge.textContent = '⏳ Pending Inquiry Request';
        statusBadge.style.background = '#FEF3C7';
        statusBadge.style.color = '#92400E';
        statusBadge.style.border = '1px solid #FCD34D';
      }
    }

    modal.style.display = 'flex';
  }

  private handleDateClick(dateStr: string, dayNum: number): void {
    this.selectedBookingDate = dateStr;

    document.querySelectorAll('.date-cell').forEach(c => c.classList.remove('selected'));
    const clickedCell = document.querySelector(`.date-cell[data-date="${dateStr}"]`);
    if (clickedCell) clickedCell.classList.add('selected');

    const dateInput = document.getElementById('bookingDateInput') as HTMLInputElement;
    if (dateInput) dateInput.value = dateStr;

    const banner = document.getElementById('selectedDateBanner');
    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = `✨ Selected Date: <strong>${dateStr}</strong> (Green 🟢 Available)`;
    }
  }

  private bindMonthNavigation(): void {
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');

    if (prevBtn) {
      prevBtn.onclick = () => {
        this.currentMonth--;
        if (this.currentMonth < 0) {
          this.currentMonth = 11;
          this.currentYear--;
        }
        this.renderCalendar();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        this.currentMonth++;
        if (this.currentMonth > 11) {
          this.currentMonth = 0;
          this.currentYear++;
        }
        this.renderCalendar();
      };
    }
  }

  private showToast(msg: string): void {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.right = '30px';
    toast.style.background = '#1E293B';
    toast.style.color = '#FFFFFF';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '99999';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

new ClientCalendarController();
