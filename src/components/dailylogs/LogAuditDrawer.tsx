/**
 * Daily Log Audit Trail Drawer
 * Shows immutable timestamped revisions, reviewer decisions, and diffs.
 */

import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { LogAuditRecord, DailyLog } from '../../types';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import { History, ShieldCheck, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface LogAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  log: DailyLog | null;
}

export const LogAuditDrawer: React.FC<LogAuditDrawerProps> = ({
  isOpen,
  onClose,
  log,
}) => {
  const [audits, setAudits] = useState<LogAuditRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log && isOpen) {
      setLoading(true);
      api
        .getLogAuditHistory(log.id)
        .then((records) => setAudits(records))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [log, isOpen]);

  if (!log) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Revision & Audit Trail: ${log.id}`}
      subtitle={`Employee: ${log.employeeName} &bull; Work Date: ${log.workDate}`}
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">
            Compliance & Non-Repudiation Record
          </p>
          <p className="text-[11px] mt-0.5">
            Every submission, supervisor review decision, and reopening event is cryptographically timestamped and logged.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading audit history...</div>
        ) : audits.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No audit records found for this log yet.
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {audits.map((record) => {
              let icon = <History className="w-3.5 h-3.5 text-blue-500" />;
              if (record.action === 'Approved') {
                icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />;
              } else if (record.action === 'Rejected') {
                icon = <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
              } else if (record.action === 'Reopened') {
                icon = <RefreshCw className="w-3.5 h-3.5 text-purple-500" />;
              }

              return (
                <div key={record.id} className="relative flex items-start gap-3 pl-8">
                  <span className="absolute left-1.5 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-xs">
                    {icon}
                  </span>

                  <div className="flex-1 bg-white dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {record.action} by {record.modifierName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(record.timestamp)}
                      </span>
                    </div>

                    {record.notes && (
                      <p className="text-slate-600 dark:text-slate-300 mt-1 italic">
                        "{record.notes}"
                      </p>
                    )}

                    {record.changes && (
                      <pre className="mt-2 text-[10px] font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 overflow-x-auto">
                        {JSON.stringify(record.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
