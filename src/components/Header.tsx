import React from 'react';
import { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  FileSpreadsheet,
  ExternalLink,
  LogOut,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { SheetInfo } from '../services/googleSheets';

interface HeaderProps {
  user: User | null;
  token: string | null;
  sheetInfo: SheetInfo | null;
  isSyncing: boolean;
  gameCount: number;
  playerCount: number;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSyncModal: () => void;
  onQuickSync: () => void;
  onOpenTeamShareModal: () => void;
  onOpenAdminModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  token,
  sheetInfo,
  isSyncing,
  gameCount,
  playerCount,
  onLogin,
  onLogout,
  onOpenSyncModal,
  onQuickSync,
  onOpenTeamShareModal,
  onOpenAdminModal,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-orange-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
              ⚾
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                야구팀 기록지 & 세이버메트릭스
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                자동 누적 시스템
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              경기 기록지를 붙여넣으면 선수 닉네임별로 세이버메트릭스를 집계하고 구글 시트로 동기화합니다
            </p>
          </div>
        </div>

        {/* Stats quick pill & Google Sheets Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Counter */}
          <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>경기</span>
              <strong className="text-white font-semibold">{gameCount}</strong>
            </div>
            <span className="w-px h-3 bg-slate-700" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>누적 선수</span>
              <strong className="text-emerald-400 font-semibold">{playerCount}명</strong>
            </div>
          </div>

          {/* Admin Management Button */}
          <button
            onClick={onOpenAdminModal}
            title="공동 관리자 추가 및 권한 설정"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>👑 관리자</span>
          </button>

          {/* Team Share Button */}
          <button
            onClick={onOpenTeamShareModal}
            title="다른 사람들도 이 시트로 입력할 수 있도록 팀원 공유 링크 및 권한 설정"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-orange-300 border border-orange-500/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>👥 팀원 공유</span>
          </button>

          {/* Google Sheets Status / Sync Button */}
          {sheetInfo ? (
            <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-600/30 rounded-xl p-1 pr-2">
              <button
                onClick={onQuickSync}
                disabled={isSyncing}
                title="Google Sheets로 최신 데이터 동기화"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '동기화 중...' : '시트 동기화'}</span>
              </button>
              <a
                href={sheetInfo.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                title="Google Sheets에서 보기"
                className="p-1.5 text-emerald-300 hover:text-white transition-colors"
                aria-label="Google 스프레드시트 열기"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={onOpenSyncModal}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline px-1 cursor-pointer"
              >
                설정
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenSyncModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Google 시트 연결</span>
              <span className="sm:hidden">시트</span>
            </button>
          )}

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || '사용자'}
                  className="w-8 h-8 rounded-full border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs border border-slate-700">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <button
                onClick={onLogout}
                title="로그아웃"
                aria-label="로그아웃"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <GoogleSignInButton onClick={onLogin} />
          )}
        </div>
      </div>
    </header>
  );
};
