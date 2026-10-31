import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Plus,
  Link,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SheetInfo } from '../services/googleSheets';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  sheetInfo: SheetInfo | null;
  isSyncing: boolean;
  onCreateNewSheet: () => Promise<void>;
  onConnectExistingSheet: (idOrUrl: string) => Promise<void>;
  onSyncNow: () => void;
  onLogin: () => void;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  onClose,
  token,
  sheetInfo,
  isSyncing,
  onCreateNewSheet,
  onConnectExistingSheet,
  onSyncNow,
  onLogin,
}) => {
  const [existingInput, setExistingInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onCreateNewSheet();
    } catch (err: any) {
      setErrorMessage(err.message || '스프레드시트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingInput.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConnectExistingSheet(existingInput.trim());
      setExistingInput('');
    } catch (err: any) {
      setErrorMessage(err.message || '스프레드시트 연결 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheets-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 id="sheets-modal-title" className="text-base font-bold text-white">
                Google Sheets 실시간 동기화
              </h2>
              <p className="text-xs text-slate-400">
                타자/투수 세이버메트릭스 누적표를 구글 스프레드시트에 자동 기록
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
        <div className="p-6 space-y-5">
          {/* Auth Check */}
          {!token ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-3">
              <p className="text-xs text-amber-200">
                Google Sheets에 접근하여 시트를 생성하고 자동 동기화하려면 먼저 Google 로그인이 필요합니다.
              </p>
              <div className="flex justify-center">
                <GoogleSignInButton onClick={onLogin} />
              </div>
            </div>
          ) : (
            <>
              {/* Connected Sheet Card */}
              {sheetInfo ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                          연결된 스프레드시트
                        </h4>
                        <p className="text-sm font-bold text-white mt-0.5">{sheetInfo.title}</p>
                      </div>
                    </div>
                    <a
                      href={sheetInfo.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-white bg-emerald-900/40 hover:bg-emerald-800/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition-colors"
                    >
                      <span>시트 열기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-emerald-600/20">
                    <div className="flex items-center justify-between">
                      <span>자동 생성 탭:</span>
                      <span className="text-emerald-400 font-mono text-[11px]">
                        타자_세이버메트릭스 / 투수_세이버메트릭스 / 경기기록_로그
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSyncNow();
                      onClose();
                    }}
                    disabled={isSyncing}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? '동기화 진행 중...' : '지금 Google Sheets로 전체 동기화'}</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-slate-400">
                    아직 연결된 Google 스프레드시트가 없습니다. 새 시트를 만들거나 기존 시트를 연결하세요.
                  </p>
                </div>
              )}

              {/* Action 1: Create New Sheet */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      새 전용 스프레드시트 자동 생성
                    </span>
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? '생성 중...' : '새 시트 만들기'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  타자/투수 세이버메트릭스 수식 및 서식이 완벽하게 세팅된 새 시트를 본인 Google Drive에 생성합니다.
                </p>
              </div>

              {/* Action 2: Connect Existing Sheet */}
              <form onSubmit={handleConnect} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Link className="w-4 h-4 text-blue-400" />
                  <span>기존 스프레드시트 연결</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="스프레드시트 URL 또는 ID 붙여넣기"
                    value={existingInput}
                    onChange={(e) => setExistingInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !existingInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    연결
                  </button>
                </div>
              </form>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}

          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <span>
              동일한 선수 닉네임의 기록은 자동으로 합산되어 타율, 출루율, 장타율, OPS, wOBA, ERA, WHIP, FIP 등이 스프레드시트에 영구 보관됩니다.
            </span>
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
