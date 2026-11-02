/**
 * Book-Style Daily Work Log Ledger Interface
 * Implements a dual-page executive logbook layout with lock controls and supervisor reviews.
 */

import React, { useState, useEffect } from 'react';
import { DailyLog, LogSubmissionStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { calculateHoursBetween, getLogStatusBadgeClass, formatDateTime } from '../../utils/formatters';
import {
  BookOpen,
  Save,
  Send,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Clock,
  History,
  FileCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface BookStyleLogViewProps {
  initialLog?: DailyLog | null;
  onSaveLog: (logData: Partial<DailyLog>, isSubmit: boolean) => Promise<DailyLog>;
  onReviewLog: (logId: string, status: 'Approved' | 'Rejected', comments: string) => Promise<void>;
  onReopenLog: (logId: string, reason: string) => Promise<void>;
  onOpenAudit: (log: DailyLog) => void;
}

export const BookStyleLogView: React.FC<BookStyleLogViewProps> = ({
  initialLog,
  onSaveLog,
  onReviewLog,
  onReopenLog,
  onOpenAudit,
}) => {
  const { user, isAdmin, isManager } = useAuth();
  const { showToast } = useNotifications();

  const [currentLog, setCurrentLog] = useState<DailyLog | null>(initialLog || null);
  const [workDate, setWorkDate] = useState(
    initialLog?.workDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState(initialLog?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialLog?.endTime || '17:30');
  const [totalHours, setTotalHours] = useState<number>(
    initialLog?.totalHours || 8.5
  );
  const [workDescription, setWorkDescription] = useState(initialLog?.workDescription || '');
  const [tasksCompleted, setTasksCompleted] = useState(initialLog?.tasksCompleted || '');
  const [pendingTasks, setPendingTasks] = useState(initialLog?.pendingTasks || '');
  const [problemsEncountered, setProblemsEncountered] = useState(initialLog?.problemsEncountered || '');
  const [nextDayPlan, setNextDayPlan] = useState(initialLog?.nextDayPlan || '');
  const [additionalNotes, setAdditionalNotes] = useState(initialLog?.additionalNotes || '');

  // Review states
  const [managerComments, setManagerComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenInput, setShowReopenInput] = useState(false);

  useEffect(() => {
    if (initialLog) {
      setCurrentLog(initialLog);
      setWorkDate(initialLog.workDate);
      setStartTime(initialLog.startTime || '09:00');
      setEndTime(initialLog.endTime || '17:30');
      setTotalHours(initialLog.totalHours || 8);
      setWorkDescription(initialLog.workDescription || '');
      setTasksCompleted(initialLog.tasksCompleted || '');
      setPendingTasks(initialLog.pendingTasks || '');
      setProblemsEncountered(initialLog.problemsEncountered || '');
      setNextDayPlan(initialLog.nextDayPlan || '');
      setAdditionalNotes(initialLog.additionalNotes || '');
      setManagerComments(initialLog.managerComments || '');
    }
  }, [initialLog]);

  // Recalculate hours when start or end time changes
  const handleTimeChange = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    const calculated = calculateHoursBetween(newStart, newEnd);
    setTotalHours(calculated);
  };

  const isApproved = currentLog?.submissionStatus === 'Approved';
  const isSubmitted = currentLog?.submissionStatus === 'Submitted';
  const isLocked = isApproved && !isAdmin && !isManager;

  const canReview = (isAdmin || (isManager && user?.departmentId === currentLog?.departmentId)) && isSubmitted;
  const canReopen = (isAdmin || isManager) && isApproved;

  const handleSave = async (submitNow: boolean) => {
    if (!workDescription.trim()) {
      showToast('Validation Error', 'Primary work description is required.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const saved = await onSaveLog(
        {
          id: currentLog?.id,
          workDate,
          startTime,
          endTime,
          totalHours,
          workDescription,
          tasksCompleted,
          pendingTasks,
          problemsEncountered,
          nextDayPlan,
          additionalNotes,
        },
        submitNow
      );
      setCurrentLog(saved);
      showToast(
        submitNow ? 'Daily Log Submitted' : 'Draft Saved',
        submitNow
          ? 'Your work log has been sent to your supervisor for review.'
          : 'Your draft has been saved securely.',
        'success'
      );
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAction = async (status: 'Approved' | 'Rejected') => {
    if (!currentLog) return;
    try {
      setSaving(true);
      await onReviewLog(currentLog.id, status, managerComments);
      setCurrentLog({
        ...currentLog,
        submissionStatus: status,
        managerComments,
        reviewerName: user?.fullName,
        reviewedAt: new Date().toISOString(),
      });
      showToast('Review Recorded', `Daily log marked as ${status}.`, 'success');
    } catch (err: any) {
      showToast('Review Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReopenAction = async () => {
    if (!currentLog || !reopenReason.trim()) {
      showToast('Reason Required', 'Please explain why this approved log is being reopened.', 'warning');
      return;
    }
    try {
      setSaving(true);
      await onReopenLog(currentLog.id, reopenReason);
      setCurrentLog({
        ...currentLog,
        submissionStatus: 'Reopened',
      });
      setShowReopenInput(false);
      setReopenReason('');
      showToast('Log Reopened', 'Log reopened. Staff member can now edit and resubmit.', 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Status & Audit History */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {currentLog ? currentLog.id : 'New Daily Work Record'}
              </h3>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getLogStatusBadgeClass(
                  currentLog?.submissionStatus || 'Draft'
                )}`}
              >
                {currentLog?.submissionStatus || 'Draft'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Employee: <strong>{currentLog?.employeeName || user?.fullName}</strong> &bull;{' '}
              {currentLog?.departmentName || user?.departmentName || 'Apex Enterprise'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentLog && (
            <button
              onClick={() => onOpenAudit(currentLog)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Audit Trail</span>
            </button>
          )}

          {isApproved && (
            <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Lock className="w-3.5 h-3.5" />
              <span>Locked & Certified</span>
            </div>
          )}
        </div>
      </div>

      {/* Book-Style Dual-Page Ledger Container */}
      <div className="relative bg-[#faf8f5] dark:bg-slate-950 rounded-2xl border-2 border-amber-900/15 dark:border-slate-800 shadow-xl overflow-hidden p-1 sm:p-3">
        {/* Decorative Leather Spine Center */}
        <div className="hidden lg:block absolute inset-y-0 left-1/2 w-6 -ml-3 bg-gradient-to-r from-amber-950/10 via-amber-900/20 to-amber-950/10 dark:from-slate-900/60 dark:via-slate-800/80 dark:to-slate-900/60 z-10 pointer-events-none shadow-inner" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
          {/* ================= LEFT PAGE ================= */}
          <div className="bg-white dark:bg-slate-900/90 p-6 rounded-xl border border-amber-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100 dark:border-slate-800">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-800 dark:text-amber-400 font-mono">
                Logbook &bull; Page 1
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Daily Operations</span>
            </div>

            {/* Date & Shift Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Work Date *
                </label>
                <input
                  type="date"
                  disabled={isLocked}
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Shift Window
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    disabled={isLocked}
                    value={startTime}
                    onChange={(e) => handleTimeChange(e.target.value, endTime)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none disabled:opacity-60"
                  />
                  <span className="text-slate-400">&ndash;</span>
                  <input
                    type="time"
                    disabled={isLocked}
                    value={endTime}
                    onChange={(e) => handleTimeChange(startTime, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Total Hours Logged
                </label>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{totalHours} hours</span>
                </div>
              </div>
            </div>

            {/* Primary Work Description */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Detailed Work Description *
              </label>
              <textarea
                rows={5}
                disabled={isLocked}
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="Comprehensive summary of deliverables completed, code deployed, customer cases handled, or operations executed today..."
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 leading-relaxed font-sans"
              />
            </div>

            {/* Tasks Completed */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Tasks Completed Today
              </label>
              <textarea
                rows={2}
                disabled={isLocked}
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(e.target.value)}
                placeholder="List completed ticket IDs, PR links, or task milestones..."
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-sans"
              />
            </div>

            {/* Next Working Day's Plan */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Next Working Day's Plan & Priorities
              </label>
              <textarea
                rows={2}
                disabled={isLocked}
                value={nextDayPlan}
                onChange={(e) => setNextDayPlan(e.target.value)}
                placeholder="What will you work on tomorrow? Key objectives and milestones..."
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-sans"
              />
            </div>
          </div>

          {/* ================= RIGHT PAGE ================= */}
          <div className="bg-white dark:bg-slate-900/90 p-6 rounded-xl border border-amber-100 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100 dark:border-slate-800">
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-800 dark:text-amber-400 font-mono">
                  Logbook &bull; Page 2
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Review & Verification</span>
              </div>

              {/* Problems Encountered / Roadblocks */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Problems, Difficulties or Roadblocks Encountered
                </label>
                <textarea
                  rows={3}
                  disabled={isLocked}
                  value={problemsEncountered}
                  onChange={(e) => setProblemsEncountered(e.target.value)}
                  placeholder="Technical bottlenecks, missing credentials, cross-team dependencies, or external delays..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-sans"
                />
              </div>

              {/* Pending Tasks */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Carry-Over / In-Progress Tasks
                </label>
                <textarea
                  rows={2}
                  disabled={isLocked}
                  value={pendingTasks}
                  onChange={(e) => setPendingTasks(e.target.value)}
                  placeholder="Tasks started but remaining in progress for subsequent completion..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-sans"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Additional Notes & Documentation Links
                </label>
                <textarea
                  rows={2}
                  disabled={isLocked}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Meeting links, external references, or miscellaneous observations..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-sans"
                />
              </div>

              {/* Supervisor Review Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-blue-500" />
                    Supervisor Review & Approval
                  </span>
                  {currentLog?.reviewedAt && (
                    <span className="text-[10px] text-slate-400">
                      Reviewed: {formatDateTime(currentLog.reviewedAt)}
                    </span>
                  )}
                </div>

                {isApproved ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Approved by {currentLog?.reviewerName || 'Manager'}</span>
                    </div>
                    {currentLog?.managerComments && (
                      <p className="italic text-emerald-900 dark:text-emerald-200 mt-1">
                        "{currentLog.managerComments}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={2}
                      disabled={!canReview}
                      value={managerComments}
                      onChange={(e) => setManagerComments(e.target.value)}
                      placeholder={
                        canReview
                          ? 'Supervisor feedback or guidance notes before approving...'
                          : 'Manager feedback will be displayed here upon review.'
                      }
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none disabled:opacity-60"
                    />

                    {canReview && (
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleReviewAction('Rejected')}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject & Request Changes</span>
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleReviewAction('Approved')}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve Daily Log</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Manager Reopen Control for Approved Logs */}
                {canReopen && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    {!showReopenInput ? (
                      <button
                        type="button"
                        onClick={() => setShowReopenInput(true)}
                        className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Reopen this log for staff amendments</span>
                      </button>
                    ) : (
                      <div className="space-y-2 mt-1">
                        <input
                          type="text"
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="State reason for reopening log..."
                          className="w-full px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 text-xs outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleReopenAction}
                            disabled={saving}
                            className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold"
                          >
                            Confirm Reopen
                          </button>
                          <button
                            onClick={() => setShowReopenInput(false)}
                            className="text-xs text-slate-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions for Staff Member */}
            {!isLocked && (
              <div className="pt-4 border-t border-amber-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Daily Log</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
