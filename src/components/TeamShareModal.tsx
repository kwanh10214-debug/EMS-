import React, { useState } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Share2,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SheetInfo } from '../services/googleSheets';

interface TeamShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetInfo: SheetInfo | null;
  isPubliclyShared: boolean;
  ownerEmail?: string;
  onEnablePublicEdit: () => Promise<boolean>;
}

export const TeamShareModal: React.FC<TeamShareModalProps> = ({
  isOpen,
  onClose,
  sheetInfo,
  isPubliclyShared,
  ownerEmail,
  onEnablePublicEdit,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUpdatingPermission, setIsUpdatingPermission] = useState(false);
  const [permissionSuccess, setPermissionSuccess] = useState<boolean | null>(
    isPubliclyShared ? true : null
  );

  if (!isOpen) return null;

  const shareableUrl = sheetInfo
    ? `${window.location.origin}/?sheetId=${sheetInfo.spreadsheetId}`
    : window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSetPermissions = async () => {
    setIsUpdatingPermission(true);
    try {
      const ok = await onEnablePublicEdit();
      setPermissionSuccess(ok);
    } finally {
      setIsUpdatingPermission(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="team-share-modal-title" className="text-base font-bold text-white">
                팀원 공동 입력 및 공유 설정
              </h2>
              <p className="text-xs text-slate-400">
                다른 사람들도 이 스프레드시트로 경기 기록을 입력할 수 있도록 설정
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
          {sheetInfo ? (
            <>
              {/* Connected Sheet Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-400">공동 스프레드시트</span>
                  </div>
                  <a
                    href={sheetInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Google Sheets 열기</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-sm font-bold text-white">{sheetInfo.title}</div>
                {ownerEmail && (
                  <div className="text-xs text-slate-400">
                    등록 관리자: <strong className="text-slate-200">{ownerEmail}</strong>
                  </div>
                )}
              </div>

              {/* Step 1: Google Drive Permission Setting */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white">1단계: 팀원 쓰기 권한 활성화</span>
                  </div>
                  {permissionSuccess ? (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> 권한 활성화됨
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      권한 설정 필요
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  구글 드라이브에서 링크를 가진 팀원이 스프레드시트에 직접 기록을 쓰고 수정할 수 있도록 권한을 개방합니다.
                </p>
                <button
                  onClick={handleSetPermissions}
                  disabled={isUpdatingPermission}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    permissionSuccess
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/20'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    {isUpdatingPermission
                      ? '권한 설정 중...'
                      : permissionSuccess
                      ? '팀원 쓰기 권한 재적용 (완료됨)'
                      : '팀원 누구나 시트에 입력 가능하게 권한 열기'}
                  </span>
                </button>
              </div>

              {/* Step 2: Share Link */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">2단계: 팀원 공유용 링크 복사</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  이 링크를 카카오톡, 밴드, 단톡방 등에 전달하세요. 팀원이 접속하면 해당 스프레드시트가 자동으로 연결되어 누구나 경기 기록지를 입력할 수 있습니다.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '복사됨!' : '링크 복사'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200/90 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-blue-300">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>팀원 입력 안내</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  <li>팀원이 입력한 경기 기록은 서버에 안전하게 보관되어 모든 팀원에게 실시간 반영됩니다.</li>
                  <li>선수 닉네임이 같으면 팀원 누가 입력하든 자동으로 누적 집계됩니다.</li>
                  <li>팀원도 상단 "Google Sheets 동기화" 버튼을 눌러 시트를 최신 상태로 업데이트할 수 있습니다.</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-white">먼저 Google Sheets를 연동해주세요</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                새 구글 스프레드시트를 생성하거나 기존 시트를 연결한 후 팀원 공유 설정을 진행할 수 있습니다.
              </p>
            </div>
          )}
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
