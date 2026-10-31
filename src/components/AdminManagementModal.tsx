import React, { useState } from 'react';
import {
  X,
  Shield,
  UserPlus,
  Trash2,
  Check,
  AlertCircle,
  Crown,
  Star,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react';
import { AdminUser } from '../types/baseball';
import { SheetInfo } from '../services/googleSheets';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  admins: AdminUser[];
  ownerEmail?: string;
  currentUserEmail?: string;
  sheetInfo: SheetInfo | null;
  onAddAdmin: (data: {
    email: string;
    name: string;
    role: 'manager' | 'scorer';
    grantDrive: boolean;
  }) => Promise<void>;
  onRemoveAdmin: (adminId: string) => Promise<void>;
}

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  admins,
  ownerEmail,
  currentUserEmail,
  sheetInfo,
  onAddAdmin,
  onRemoveAdmin,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'manager' | 'scorer'>('manager');
  const [grantDrive, setGrantDrive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (!email.includes('@')) {
      setErrorMessage('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onAddAdmin({
        email: email.trim(),
        name: name.trim() || email.split('@')[0],
        role,
        grantDrive: !!(grantDrive && sheetInfo),
      });
      setEmail('');
      setName('');
    } catch (err: any) {
      setErrorMessage(err.message || '관리자 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (adminRole: string) => {
    switch (adminRole) {
      case 'owner':
        return (
          <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Crown className="w-3 h-3" /> 최고 관리자
          </span>
        );
      case 'manager':
        return (
          <span className="text-[11px] font-semibold text-orange-400 bg-orange-950/60 border border-orange-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" /> 공동 관리자
          </span>
        );
      case 'scorer':
      default:
        return (
          <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" /> 기록 관리자
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-modal-title" className="text-base font-bold text-white">
                팀 관리자 추가 및 권한 설정
              </h2>
              <p className="text-xs text-slate-400">
                스프레드시트 동기화 및 팀 기록지를 관리할 공동 관리자 목록
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add Admin Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>새 관리자 등록</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  이메일 (Google 계정) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="coach@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">이름 / 직책</label>
                <input
                  type="text"
                  placeholder="예: 수석코치 홍길동, 총무 김철수"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-400">부여할 역할:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                >
                  <option value="manager">⭐️ 공동 관리자 (동기화, 기록지 편집, 시트 관리)</option>
                  <option value="scorer">📝 기록 관리자 (경기 기록지 입력 및 누적)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 ml-auto"
              >
                {isSubmitting ? '추가 중...' : '+ 관리자 추가'}
              </button>
            </div>

            {sheetInfo && (
              <label className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={grantDrive}
                  onChange={(e) => setGrantDrive(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1 text-slate-300">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  스프레드시트 Google Drive 직접 편집자 권한도 함께 초대
                </span>
              </label>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>

          {/* Administrators List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                등록된 관리자 목록 ({admins.length + (ownerEmail ? 1 : 0)}명)
              </h3>
            </div>

            <div className="space-y-2">
              {/* Primary Owner */}
              {ownerEmail && (
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm">
                      👑
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">시트 생성자 (최고 관리자)</span>
                        {getRoleBadge('owner')}
                        {currentUserEmail === ownerEmail && (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            나
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{ownerEmail}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Added Admins */}
              {admins.length === 0 && !ownerEmail ? (
                <div className="p-6 rounded-xl border border-slate-800 text-center text-slate-500 text-xs">
                  등록된 관리자가 없습니다. 상단에서 이메일을 입력하여 관리자를 추가해보세요.
                </div>
              ) : (
                admins.map((adm) => {
                  const isCurrent = currentUserEmail?.toLowerCase() === adm.email.toLowerCase();

                  return (
                    <div
                      key={adm.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs uppercase">
                          {adm.name?.[0] || adm.email[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{adm.name || adm.email}</span>
                            {getRoleBadge(adm.role)}
                            {isCurrent && (
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                나
                              </span>
                            )}
                            {adm.isDriveGranted && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Drive 초대됨
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{adm.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveAdmin(adm.id)}
                        title="관리자 권한 해제"
                        aria-label="관리자 권한 해제"
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Guide Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-slate-300">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>관리자 권한 안내</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
              <li>등록된 공동 관리자는 본인 계정으로 로그인하여 스프레드시트 동기화 및 경기 데이터 관리를 수행할 수 있습니다.</li>
              <li>Google Drive 편집자 권한이 부여된 관리자는 구글 드라이브/스프레드시트에서도 직접 셀 편집이 가능합니다.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
