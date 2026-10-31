import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { BatterTable } from './components/BatterTable';
import { PitcherTable } from './components/PitcherTable';
import { GameLogsList } from './components/GameLogsList';
import { MatchInputModal } from './components/MatchInputModal';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { TeamShareModal } from './components/TeamShareModal';
import { AdminManagementModal } from './components/AdminManagementModal';
import { PlayerStatusModal } from './components/PlayerStatusModal';
import { ConfirmModal } from './components/ConfirmModal';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  createTeamSpreadsheet,
  getSpreadsheetDetails,
  syncToGoogleSheets,
  makeSpreadsheetPubliclyEditable,
  grantDrivePermissionToEmail,
  SheetInfo,
} from './services/googleSheets';
import {
  fetchTeamConfig,
  saveTeamConfig,
  fetchSharedGames,
  saveSharedGames,
  fetchAdmins,
  addAdmin,
  deleteAdmin,
  fetchPlayerStatuses,
  savePlayerStatus,
} from './services/api';
import {
  GameRecord,
  AdminUser,
  PlayerStatusInfo,
  PlayerStatusType,
} from './types/baseball';
import {
  aggregateGameRecords,
  normalizeNickname,
} from './utils/accumulation';
import { parseMatchRecord, getSampleMatchText } from './utils/parser';
import {
  PlusCircle,
  FileSpreadsheet,
  Sparkles,
  Trophy,
  History,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Users,
  Share2,
  Crown,
} from 'lucide-react';

const STORAGE_GAMES_KEY = 'baseball_team_games_v1';
const STORAGE_SHEET_KEY = 'baseball_team_sheet_v1';

export default function App() {
  // 1. Auth & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHEET_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isPubliclyShared, setIsPubliclyShared] = useState<boolean>(true);
  const [ownerEmail, setOwnerEmail] = useState<string | undefined>();

  // 2. Games Data State
  const [games, setGames] = useState<GameRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_GAMES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial seed: 2 realistic games so accumulation is immediately visible
    const game1Parsed = parseMatchRecord(getSampleMatchText());
    const game1: GameRecord = {
      id: 'seed-game-1',
      header: game1Parsed.header,
      lineScore: game1Parsed.lineScore,
      batters: game1Parsed.batters,
      pitchers: game1Parsed.pitchers,
      createdAt: '2026-05-14T14:00:00.000Z',
    };

    const game2: GameRecord = {
      id: 'seed-game-2',
      header: {
        date: '2026. 05. 21. 10시',
        opponent: '타이거즈',
        isHome: false,
        ourScore: 6,
        oppScore: 3,
        outcome: '승',
      },
      lineScore: {
        headers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'H', 'E', 'B'],
        away: {
          name: '우리팀',
          innings: [2, 0, 1, 0, 0, 3, 0, 0, 0],
          R: 6,
          H: 9,
          E: 0,
          B: 4,
        },
        home: {
          name: '타이거즈',
          innings: [0, 1, 0, 0, 2, 0, 0, 0, 0],
          R: 3,
          H: 6,
          E: 1,
          B: 2,
        },
      },
      batters: [
        {
          order: 1,
          name: '번개타자',
          position: 'CF',
          PA: 4,
          AB: 3,
          R: 2,
          H: 2,
          doubles: 1,
          triples: 0,
          HR: 0,
          RBI: 1,
          BB: 1,
          HBP: 0,
          SO: 0,
          SF: 0,
          SB: 2,
          CS: 0,
        },
        {
          order: 2,
          name: '출루머신',
          position: '2B',
          PA: 4,
          AB: 2,
          R: 1,
          H: 1,
          doubles: 0,
          triples: 0,
          HR: 0,
          RBI: 0,
          BB: 2,
          HBP: 0,
          SO: 0,
          SF: 0,
          SB: 0,
          CS: 0,
        },
        {
          order: 3,
          name: '홈런왕',
          position: '1B',
          PA: 4,
          AB: 4,
          R: 1,
          H: 2,
          doubles: 0,
          triples: 0,
          HR: 1,
          RBI: 3,
          BB: 0,
          HBP: 0,
          SO: 1,
          SF: 0,
          SB: 0,
          CS: 0,
        },
        {
          order: 4,
          name: '해결사',
          position: '3B',
          PA: 4,
          AB: 3,
          R: 1,
          H: 1,
          doubles: 1,
          triples: 0,
          HR: 0,
          RBI: 2,
          BB: 1,
          HBP: 0,
          SO: 1,
          SF: 0,
          SB: 0,
          CS: 0,
        },
        {
          order: 5,
          name: '안타제조기',
          position: 'LF',
          PA: 4,
          AB: 4,
          R: 1,
          H: 2,
          doubles: 0,
          triples: 0,
          HR: 0,
          RBI: 0,
          BB: 0,
          HBP: 0,
          SO: 0,
          SF: 0,
          SB: 0,
          CS: 0,
        },
        {
          order: 6,
          name: '철벽포수',
          position: 'C',
          PA: 4,
          AB: 3,
          R: 0,
          H: 1,
          doubles: 0,
          triples: 0,
          HR: 0,
          RBI: 0,
          BB: 0,
          HBP: 0,
          SO: 0,
          SF: 0,
          SB: 0,
          CS: 0,
        },
      ],
      pitchers: [
        {
          role: 'SP',
          name: '에이스김',
          inningsText: '6이닝',
          IP: 6,
          runs: 3,
          ER: 2,
          hits: 5,
          HR: 0,
          BB: 2,
          SO: 7,
          decision: '승',
        },
        {
          role: 'CP',
          name: '끝판왕정',
          inningsText: '1이닝',
          IP: 1,
          runs: 0,
          ER: 0,
          hits: 0,
          HR: 0,
          BB: 0,
          SO: 2,
          decision: '세이브',
        },
      ],
      createdAt: '2026-05-21T10:00:00.000Z',
    };

    return [game1, game2];
  });

  // UI State
  const [activeTab, setActiveTab] = useState<'batters' | 'pitchers' | 'games'>('batters');
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isTeamShareModalOpen, setIsTeamShareModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, PlayerStatusInfo>>({});
  const [selectedPlayerForStatus, setSelectedPlayerForStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Confirmation Modal State (Mandatory for Workspace mutating calls!)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load shared team config, games, admins, and player statuses from server on mount
  useEffect(() => {
    async function loadInitialServerData() {
      // 1. Check URL param ?sheetId=...
      const urlParams = new URLSearchParams(window.location.search);
      const paramSheetId = urlParams.get('sheetId');

      // 2. Fetch server team config
      const serverConfig = await fetchTeamConfig();
      if (serverConfig?.sheetInfo) {
        setSheetInfo(serverConfig.sheetInfo);
        setIsPubliclyShared(!!serverConfig.isPubliclyShared);
        setOwnerEmail(serverConfig.ownerEmail);
      } else if (paramSheetId) {
        // If query param has sheet ID and no server config
        setSheetInfo({
          spreadsheetId: paramSheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${paramSheetId}/edit`,
          title: '팀 공유 스프레드시트',
        });
      }

      // 3. Fetch server shared games
      const serverGames = await fetchSharedGames();
      if (serverGames && Array.isArray(serverGames) && serverGames.length > 0) {
        setGames(serverGames);
      }

      // 4. Fetch server registered admins
      const serverAdmins = await fetchAdmins();
      if (serverAdmins && Array.isArray(serverAdmins)) {
        setAdmins(serverAdmins);
      }

      // 5. Fetch server registered player statuses (retirements, transfers)
      const serverStatuses = await fetchPlayerStatuses();
      if (serverStatuses && typeof serverStatuses === 'object') {
        setPlayerStatuses(serverStatuses);
      }
    }

    loadInitialServerData();
  }, []);

  // Save games to localStorage and server
  useEffect(() => {
    localStorage.setItem(STORAGE_GAMES_KEY, JSON.stringify(games));
    saveSharedGames(games);
  }, [games]);

  // Save sheetInfo to localStorage
  useEffect(() => {
    if (sheetInfo) {
      localStorage.setItem(STORAGE_SHEET_KEY, JSON.stringify(sheetInfo));
    } else {
      localStorage.removeItem(STORAGE_SHEET_KEY);
    }
  }, [sheetInfo]);

  // Derived Cumulative Sabermetric Statistics
  const { batters, pitchers } = useMemo(() => {
    return aggregateGameRecords(games, playerStatuses);
  }, [games, playerStatuses]);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        showToast('Google 계정에 성공적으로 로그인되었습니다.');
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      showToast(`로그인 실패: ${err.message || '인증이 취소되었습니다.'}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    showToast('로그아웃 되었습니다.');
  };

  // Google Sheets Creation
  const handleCreateNewSheet = async () => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      handleLogin();
      return;
    }
    const newSheet = await createTeamSpreadsheet(currentToken);
    setSheetInfo(newSheet);

    // Automatically enable Drive permissions so teammates with the link can write to it
    const publicOk = await makeSpreadsheetPubliclyEditable(
      currentToken,
      newSheet.spreadsheetId
    );
    setIsPubliclyShared(publicOk);
    setOwnerEmail(user?.email || undefined);

    // Save shared config to server so all team members immediately see and use this sheet!
    await saveTeamConfig({
      sheetInfo: newSheet,
      ownerEmail: user?.email || undefined,
      ownerName: user?.displayName || undefined,
      isPubliclyShared: publicOk,
      updatedAt: new Date().toISOString(),
    });

    showToast('새 구글 스프레드시트 생성 및 팀원 쓰기 공유가 완료되었습니다!');
    // Perform initial sync
    await executeSheetsSync(newSheet.spreadsheetId, currentToken);
  };

  // Connect Existing Sheet
  const handleConnectExistingSheet = async (idOrUrl: string) => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      handleLogin();
      return;
    }

    let id = idOrUrl;
    const match = idOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) id = match[1];

    const details = await getSpreadsheetDetails(currentToken, id);
    setSheetInfo(details);

    // Try setting public edit if user has permission
    const publicOk = await makeSpreadsheetPubliclyEditable(currentToken, id);
    setIsPubliclyShared(publicOk);
    setOwnerEmail(user?.email || undefined);

    // Save to shared team server config
    await saveTeamConfig({
      sheetInfo: details,
      ownerEmail: user?.email || undefined,
      ownerName: user?.displayName || undefined,
      isPubliclyShared: publicOk,
      updatedAt: new Date().toISOString(),
    });

    showToast(`스프레드시트 "${details.title}" 에 연결되었으며 팀원들과 공유됩니다.`);
  };

  // Enable public edit permission manually from modal
  const handleEnablePublicEdit = async (): Promise<boolean> => {
    if (!sheetInfo) return false;
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      handleLogin();
      return false;
    }
    const ok = await makeSpreadsheetPubliclyEditable(
      currentToken,
      sheetInfo.spreadsheetId
    );
    if (ok) {
      setIsPubliclyShared(true);
      await saveTeamConfig({
        sheetInfo,
        isPubliclyShared: true,
        updatedAt: new Date().toISOString(),
      });
      showToast('팀원 누구나 시트에 입력할 수 있도록 권한이 활성화되었습니다!');
    } else {
      showToast('구글 드라이브 권한 변경에 실패했습니다. 스프레드시트 소유자 계정으로 로그인되어 있는지 확인해주세요.');
    }
    return ok;
  };

  // Add new admin handler
  const handleAddAdmin = async (data: {
    email: string;
    name: string;
    role: 'manager' | 'scorer';
    grantDrive: boolean;
  }) => {
    let isDriveGranted = false;
    if (data.grantDrive && sheetInfo) {
      const currentToken = token || (await getAccessToken());
      if (currentToken) {
        isDriveGranted = await grantDrivePermissionToEmail(
          currentToken,
          sheetInfo.spreadsheetId,
          data.email,
          'writer'
        );
      }
    }

    const newAdmin = await addAdmin({
      email: data.email,
      name: data.name,
      role: data.role,
      isDriveGranted,
    });

    if (newAdmin) {
      setAdmins((prev) => {
        const filtered = prev.filter(
          (a) => a.email.toLowerCase() !== data.email.toLowerCase()
        );
        return [...filtered, newAdmin];
      });
      showToast(
        `"${data.name || data.email}" 님이 관리자로 추가되었습니다.${
          isDriveGranted ? ' (Drive 편집자 권한 부여됨)' : ''
        }`
      );
    }
  };

  // Remove admin handler
  const handleRemoveAdmin = async (adminId: string) => {
    const target = admins.find((a) => a.id === adminId);
    setConfirmDialog({
      isOpen: true,
      title: '관리자 권한 해제 확인',
      message: `"${target?.name || target?.email || '해당 사용자'}"의 관리자 권한을 해제하시겠습니까?`,
      confirmLabel: '관리자 해제',
      isDestructive: true,
      onConfirm: async () => {
        await deleteAdmin(adminId);
        setAdmins((prev) => prev.filter((a) => a.id !== adminId));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('관리자 권한이 해제되었습니다.');
      },
    });
  };

  // Player status update handler (Retirement, Transfer, Active)
  const handleSavePlayerStatus = async (statusData: {
    name: string;
    status: PlayerStatusType;
    note?: string;
    destination?: string;
  }) => {
    const res = await savePlayerStatus(statusData);
    if (res) {
      const cleanKey = normalizeNickname(statusData.name);
      setPlayerStatuses((prev) => ({
        ...prev,
        [cleanKey]: {
          name: statusData.name,
          status: statusData.status,
          note: statusData.note,
          destination: statusData.destination,
          updatedAt: new Date().toISOString(),
        },
      }));

      const statusLabel =
        statusData.status === 'retired'
          ? '은퇴 (기록 보존)'
          : statusData.status === 'transferred'
          ? `이적 (${statusData.destination || '타 팀'})`
          : statusData.status === 'inactive'
          ? '비활동'
          : '현역 활동';

      showToast(`선수 "${statusData.name}" 님의 상태가 [${statusLabel}] 로 저장되었습니다.`);
    }
  };

  // Perform the actual API sync call
  const executeSheetsSync = async (spreadsheetId: string, currentToken: string) => {
    setIsSyncing(true);
    try {
      await syncToGoogleSheets(
        currentToken,
        spreadsheetId,
        batters,
        pitchers,
        games
      );
      showToast('Google Sheets에 모든 타자/투수 세이버메트릭스가 동기화되었습니다!');
    } catch (err: any) {
      console.error(err);
      showToast(`동기화 실패: ${err.message || '오류 발생'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // User Confirmation prior to mutating/updating Google Sheets (Mandatory Workspace rule!)
  const requestSheetsSync = () => {
    if (!sheetInfo) {
      setIsSheetsModalOpen(true);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Google Sheets 데이터 동기화 확인',
      message: `구글 스프레드시트("${sheetInfo.title}")의 [타자_세이버메트릭스], [투수_세이버메트릭스], [경기기록_로그] 탭 내용을 현재 누적된 최신 통계로 업데이트합니다.\n\n진행하시겠습니까?`,
      confirmLabel: '동기화 진행',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const currentToken = token || (await getAccessToken());
        if (!currentToken) {
          handleLogin();
          return;
        }
        await executeSheetsSync(sheetInfo.spreadsheetId, currentToken);
      },
    });
  };

  // Save Game and optionally sync
  const handleSaveGame = async (newGame: GameRecord, shouldSyncSheets: boolean) => {
    const updated = [newGame, ...games];
    setGames(updated);
    showToast(`"${newGame.header.date} vs ${newGame.header.opponent}" 경기가 저장되었습니다!`);

    if (shouldSyncSheets && sheetInfo) {
      const currentToken = token || (await getAccessToken());
      if (currentToken) {
        const { batters: newBatters, pitchers: newPitchers } =
          aggregateGameRecords(updated, playerStatuses);
        try {
          setIsSyncing(true);
          await syncToGoogleSheets(
            currentToken,
            sheetInfo.spreadsheetId,
            newBatters,
            newPitchers,
            updated
          );
          showToast('경기 저장 및 Google Sheets 동기화 완료!');
        } catch (e: any) {
          showToast(`시트 동기화 실패: ${e.message}`);
        } finally {
          setIsSyncing(false);
        }
      }
    }
  };

  // Delete Game Handler (with confirmation dialog)
  const handleDeleteGame = (gameId: string) => {
    const target = games.find((g) => g.id === gameId);
    if (!target) return;

    setConfirmDialog({
      isOpen: true,
      title: '경기 기록 삭제 확인',
      message: `"${target.header.date} vs ${target.header.opponent}" 경기 기록을 삭제하시겠습니까?\n이 경기의 기록은 누적 통계에서 제외됩니다.`,
      confirmLabel: '경기 삭제',
      isDestructive: true,
      onConfirm: () => {
        setGames((prev) => prev.filter((g) => g.id !== gameId));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('경기 기록이 삭제되었습니다.');
      },
    });
  };

  // Reset all records (with confirmation dialog)
  const handleResetAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: '전체 기록 초기화 확인',
      message: '등록된 모든 경기 기록과 선수 누적 통계를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '모두 초기화',
      isDestructive: true,
      onConfirm: () => {
        setGames([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('모든 경기 기록이 초기화되었습니다.');
      },
    });
  };

  // Add 1 more sample game for instant accumulation testing
  const handleAddSampleGame = () => {
    const sampleCount = games.length + 1;
    const newSample: GameRecord = {
      id: `sample-${Date.now()}`,
      header: {
        date: `2026. 06. 0${(sampleCount % 9) + 1}. 14시`,
        opponent: `베어스 ${sampleCount}차전`,
        isHome: true,
        ourScore: 7,
        oppScore: 4,
        outcome: '승',
      },
      lineScore: {
        headers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'H', 'E', 'B'],
        away: {
          name: `베어스`,
          innings: [0, 0, 1, 0, 2, 0, 1, 0, 0],
          R: 4,
          H: 7,
          E: 1,
          B: 3,
        },
        home: {
          name: '우리팀',
          innings: [1, 2, 0, 3, 0, 0, 1, 0, 'X'],
          R: 7,
          H: 10,
          E: 0,
          B: 5,
        },
      },
      batters: [
        {
          order: 1,
          name: '번개타자',
          PA: 4,
          AB: 3,
          R: 2,
          H: 1,
          doubles: 0,
          triples: 1,
          HR: 0,
          RBI: 1,
          BB: 1,
          HBP: 0,
          SO: 0,
          SF: 0,
          SB: 1,
          CS: 0,
        },
        {
          order: 2,
          name: '출루머신',
          PA: 4,
          AB: 3,
          R: 1,
          H: 2,
          doubles: 1,
          triples: 0,
          HR: 0,
          RBI: 2,
          BB: 1,
          HBP: 0,
          SO: 0,
          SF: 0,
          SB: 0,
          CS: 0,
        },
        {
          order: 3,
          name: '홈런왕',
          PA: 4,
          AB: 4,
          R: 1,
          H: 1,
          doubles: 0,
          triples: 0,
          HR: 1,
          RBI: 2,
          BB: 0,
          HBP: 0,
          SO: 1,
          SF: 0,
          SB: 0,
          CS: 0,
        },
      ],
      pitchers: [
        {
          role: 'SP',
          name: '에이스김',
          inningsText: '5이닝',
          IP: 5,
          runs: 3,
          ER: 2,
          hits: 5,
          HR: 1,
          BB: 2,
          SO: 5,
          decision: '승',
        },
        {
          role: 'CP',
          name: '끝판왕정',
          inningsText: '1이닝',
          IP: 1,
          runs: 0,
          ER: 0,
          hits: 1,
          HR: 0,
          BB: 0,
          SO: 1,
          decision: '세이브',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setGames([newSample, ...games]);
    showToast('예시 경기 추가 완료! 닉네임("번개타자", "에이스김" 등)의 통계가 추가 누적되었습니다.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        user={user}
        token={token}
        sheetInfo={sheetInfo}
        isSyncing={isSyncing}
        gameCount={games.length}
        playerCount={batters.length}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenSyncModal={() => setIsSheetsModalOpen(true)}
        onQuickSync={requestSheetsSync}
        onOpenTeamShareModal={() => setIsTeamShareModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Action & KPI Bar */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>선수 닉네임 자동 누적 & 세이버메트릭스 엔진</span>
                </div>
                {sheetInfo && (
                  <button
                    onClick={() => setIsTeamShareModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>팀원 공동 입력 가능 (시트 연동됨)</span>
                  </button>
                )}
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>관리자 {admins.length + (ownerEmail ? 1 : 0)}명</span>
                </button>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                경기 기록지를 입력하면 닉네임별로 통계가 자동 집계됩니다
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                매니저가 구글 시트를 연동해두면, <strong>링크를 공유받은 팀원 누구나 동일한 스프레드시트에 경기 기록을 입력하고 통계를 누적</strong>시킬 수 있습니다.
              </p>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsInputModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>새 경기 기록지 등록</span>
              </button>

              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 font-semibold text-sm transition-all cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>관리자 관리</span>
              </button>

              <button
                onClick={() => setIsTeamShareModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-orange-300 border border-orange-500/30 font-semibold text-sm transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-orange-400" />
                <span>팀원 공유 설정</span>
              </button>

              <button
                onClick={requestSheetsSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{sheetInfo ? 'Google Sheets 동기화' : '시트 연동하기'}</span>
              </button>

              <button
                onClick={handleAddSampleGame}
                title="동일 닉네임 누적 테스트 경기 추가"
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>+ 테스트 경기 누적</span>
              </button>

              {games.length > 0 && (
                <button
                  onClick={handleResetAll}
                  title="기록 전체 초기화"
                  aria-label="기록 전체 초기화"
                  className="p-3 rounded-2xl bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('batters')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'batters'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⚾ 타자 누적 기록 (Sabermetrics)</span>
              <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                {batters.length}명
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pitchers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'pitchers'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🎯 투수 누적 기록 (Sabermetrics)</span>
              <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                {pitchers.length}명
              </span>
            </button>

            <button
              onClick={() => setActiveTab('games')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'games'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>경기 기록 로그</span>
              <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                {games.length}경기
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'batters' && (
          <BatterTable
            batters={batters}
            onEditPlayerStatus={(nickname) => setSelectedPlayerForStatus(nickname)}
          />
        )}
        {activeTab === 'pitchers' && (
          <PitcherTable
            pitchers={pitchers}
            onEditPlayerStatus={(nickname) => setSelectedPlayerForStatus(nickname)}
          />
        )}
        {activeTab === 'games' && (
          <GameLogsList games={games} onDeleteGame={handleDeleteGame} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>야구팀 기록지 & 세이버메트릭스 자동 누적 시스템 • Google Sheets API 연동</p>
      </footer>

      {/* Match Input Modal */}
      <MatchInputModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        onSaveGame={handleSaveGame}
        isSheetsConnected={!!sheetInfo}
      />

      {/* Google Sheets Sync & Setup Modal */}
      <SheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        token={token}
        sheetInfo={sheetInfo}
        isSyncing={isSyncing}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onSyncNow={requestSheetsSync}
        onLogin={handleLogin}
      />

      {/* Team Shared Access & Link Modal */}
      <TeamShareModal
        isOpen={isTeamShareModalOpen}
        onClose={() => setIsTeamShareModalOpen(false)}
        sheetInfo={sheetInfo}
        isPubliclyShared={isPubliclyShared}
        ownerEmail={ownerEmail}
        onEnablePublicEdit={handleEnablePublicEdit}
      />

      {/* Admin Management Modal */}
      <AdminManagementModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        admins={admins}
        ownerEmail={ownerEmail}
        currentUserEmail={user?.email || undefined}
        sheetInfo={sheetInfo}
        onAddAdmin={handleAddAdmin}
        onRemoveAdmin={handleRemoveAdmin}
      />

      {/* Player Status (Retirement / Transfer) Modal */}
      <PlayerStatusModal
        isOpen={!!selectedPlayerForStatus}
        onClose={() => setSelectedPlayerForStatus(null)}
        playerNickname={selectedPlayerForStatus || ''}
        currentStatusInfo={
          selectedPlayerForStatus
            ? playerStatuses[normalizeNickname(selectedPlayerForStatus)]
            : undefined
        }
        onSaveStatus={handleSavePlayerStatus}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
