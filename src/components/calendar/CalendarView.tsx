/**
 * Team Calendar & Event Reminders Module
 * Month, Week, and Day views with event scheduling and reminder alerts.
 */

import React, { useState, useEffect } from 'react';
import { CalendarEvent, Department } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { formatDate } from '../../utils/formatters';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const { showToast } = useNotifications();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar View: 'month' | 'week' | 'day'
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['eventType']>('Meeting');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [deptId, setDeptId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const [fetchedEvents, fetchedDepts] = await Promise.all([
        api.getCalendarEvents(),
        api.getDepartments(),
      ]);
      setEvents(fetchedEvents);
      setDepartments(fetchedDepts);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) {
      showToast('Validation Error', 'Event title and start date are required.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const created = await api.createCalendarEvent({
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        eventType,
        startDate: eventDate,
        endDate: eventEndDate || eventDate,
        allDay,
        departmentId: deptId,
      });
      setEvents((prev) => [...prev, created]);
      setIsModalOpen(false);
      showToast('Event Scheduled', `"${created.title}" added to calendar.`, 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this event?')) return;
    try {
      await api.deleteCalendarEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showToast('Deleted', 'Calendar event removed.', 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  // Calendar month rendering calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  // Empty slots before first day
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  const getEventBadgeColor = (type: CalendarEvent['eventType']) => {
    switch (type) {
      case 'TaskDeadline':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300';
      case 'Meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300';
      case 'Reminder':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300';
      case 'CompanyEvent':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300';
      case 'StaffEvent':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {/* Calendar Header Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation & Current Month */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        {/* View Switcher & New Event Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Day
            </button>
          </div>

          <button
            onClick={() => {
              setEventDate(todayStr);
              setEventEndDate(todayStr);
              setEventTitle('');
              setEventDesc('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold text-center text-xs py-2.5">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          {calendarDays.map((dateObj, idx) => {
            if (!dateObj) {
              return <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-50/40 dark:bg-slate-950/20" />;
            }

            const dateStr = dateObj.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayEvents = events.filter((e) => e.startDate.startsWith(dateStr));

            return (
              <div
                key={dateStr}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${
                  isToday ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dayEvents.length} items
                    </span>
                  )}
                </div>

                {/* Day events pills */}
                <div className="space-y-1 flex-1 overflow-y-auto max-h-20">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate flex items-center justify-between group ${getEventBadgeColor(
                        evt.eventType
                      )}`}
                      title={`${evt.title} (${evt.eventType})`}
                    >
                      <span className="truncate">{evt.title}</span>
                      {(isAdmin || evt.createdById === user?.id) && (
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity ml-1"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Calendar Event or Work Reminder"
        subtitle="Notify team members and add milestones to company dashboard"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. Sprint Backlog Review or Deliverable Deadline"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="Meeting">Meeting</option>
                <option value="TaskDeadline">Task Deadline</option>
                <option value="Reminder">Work Reminder</option>
                <option value="StaffEvent">Staff Event</option>
                <option value="CompanyEvent">Company Event</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department Tag (Optional)
              </label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="">All Departments (Company-wide)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="Meeting link, agenda, or reminders for participants..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Save Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
