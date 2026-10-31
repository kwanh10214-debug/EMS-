import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Award,
  PlaneTakeoff,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { PlayerStatusType, PlayerStatusInfo } from '../types/baseball';

interface PlayerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerNickname: string;
  currentStatusInfo?: PlayerStatusInfo;
  onSaveStatus: (statusData: {
    name: string;
    status: PlayerStatusType;
    note?: string;
    destination?: string;
  }) => Promise<void>;
}

export const PlayerStatusModal: React.FC<PlayerStatusModalProps> = ({
  isOpen,
  onClose,
  playerNickname,
  currentStatusInfo,
  onSaveStatus,
}) => {
  const [status, setStatus] = useState<PlayerStatusType>('active');
  const [note, setNote] = useState('');
  const [destination, setDestination] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStatusInfo) {
      setStatus(currentStatusInfo.status || 'active');
      setNote(currentStatusInfo.note || '');
      setDestination(currentStatusInfo.destination || '');
    } else {
      setStatus('active');
      setNote('');
      setDestination('');
    }
  }, [currentStatusInfo, playerNickname, isOpen]);

  if (!isOpen || !playerNickname) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveStatus({
        name: playerNickname,
        status,
        note: note.trim() || undefined,
        destination: status === 'transferred' ? destination.trim() || undefined : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-status-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="player-status-modal-title" className="text-base font-bold text-white">
                선수 로스터 상태 관리
              </h2>
              <p className="text-xs text-slate-400">
                선수: <strong className="text-orange-400 font-semibold">{playerNickname}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status Selection Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              선수 상태 선택
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Active */}
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === 'active'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-white">현역 선수</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">정상 출전 및 활동 중</p>
              </button>

              {/* Retired */}
              <button
                type="button"
                onClick={() => setStatus('retired')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === 'retired'
                    ? 'bg-amber-950/40 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white">은퇴 (명예의 전당)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">선수 은퇴 및 기록 보존</p>
              </button>

              {/* Transferred */}
              <button
                type="button"
                onClick={() => setStatus('transferred')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === 'transferred'
                    ? 'bg-blue-950/40 border-blue-500 text-white shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <PlaneTakeoff className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-white">이적 / 방출</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">타 팀 이적 및 팀 탈퇴</p>
              </button>

              {/* Inactive */}
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === 'inactive'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-white">휴식 / 군입대 / 부상</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">임시 비활동 상태</p>
              </button>
            </div>
          </div>

          {/* Conditional Destination for Transferred */}
          {status === 'transferred' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-slate-300">
                이적 팀명 <span className="text-slate-500 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                placeholder="예: 드래곤즈, 블루윙스"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          )}

          {/* Memo / Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              비고 / 메모 <span className="text-slate-500 font-normal">(선택)</span>
            </label>
            <input
              type="text"
              placeholder={
                status === 'retired'
                  ? '예: 2026 영구결번 은퇴, 팀 창단 멤버'
                  : status === 'transferred'
                  ? '예: 2차 트레이드 이적'
                  : status === 'inactive'
                  ? '예: 무릎 부상 치료 중'
                  : '선수 관련 메모'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <span>
              선수가 은퇴하거나 이적해도 기존 경기 기록과 박스스코어는 안전하게 보존되며, 타자/투수 표에서 필터링하거나 Google Sheets에 은퇴/이적 상태가 즉시 반영됩니다.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '상태 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
