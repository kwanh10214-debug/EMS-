import React, { useState } from 'react';
import { BatterCumulativeStat } from '../types/baseball';
import { formatAvg, formatRate } from '../utils/sabermetrics';
import { STATUS_PRIORITY } from '../utils/accumulation';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Award,
  PlaneTakeoff,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface BatterTableProps {
  batters: BatterCumulativeStat[];
  onEditPlayerStatus?: (nickname: string) => void;
}

export type BatterSortField =
  | 'rank'
  | 'name'
  | 'status'
  | 'games'
  | 'PA'
  | 'AB'
  | 'R'
  | 'H'
  | 'doubles'
  | 'triples'
  | 'HR'
  | 'TB'
  | 'RBI'
  | 'BB'
  | 'HBP'
  | 'SO'
  | 'SB'
  | 'AVG'
  | 'OBP'
  | 'SLG'
  | 'OPS'
  | 'ISO'
  | 'BABIP'
  | 'wOBA'
  | 'BB_rate'
  | 'K_rate'
  | 'BB_K';

// Negative stats where lower is better (안 좋은 스탯은 낮은 순이 먼저 정렬)
const BAD_BATTER_STATS = new Set<BatterSortField>(['SO', 'K_rate']);

export const BatterTable: React.FC<BatterTableProps> = ({
  batters,
  onEditPlayerStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'retired' | 'transferred' | 'inactive'
  >('all');
  const [sortField, setSortField] = useState<BatterSortField>('OPS');
  const [sortAsc, setSortAsc] = useState(false); // default desc for 좋은 스탯 (OPS)
  const [prioritizeStatus, setPrioritizeStatus] = useState(true); // 현역 > 은퇴 > 이적 우선 정렬
  const [hoverMetric, setHoverMetric] = useState<string | null>(null);

  const handleSort = (field: BatterSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      if (field === 'name') {
        // 이름은 ABC순 (오름차순) 기본
        setSortAsc(true);
      } else if (field === 'status' || field === 'rank') {
        // 상태는 현역 > 은퇴 > 이적 기본
        setSortAsc(true);
      } else if (BAD_BATTER_STATS.has(field)) {
        // 안 좋은 스탯(삼진 등)은 낮은 순(오름차순)이 좋은 순서!
        setSortAsc(true);
      } else {
        // 좋은 스탯(타율, OPS, 홈런 등)은 높은 순(내림차순)이 기본!
        setSortAsc(false);
      }
    }
  };

  const filtered = batters
    .filter((b) => {
      const matchSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      const playerStatus = b.status || 'active';
      if (statusFilter === 'all') return true;
      return playerStatus === statusFilter;
    })
    .sort((a, b) => {
      // 1. Status priority (현역 > 은퇴 > 이적 > 휴식) if prioritizeStatus is active
      if (prioritizeStatus && statusFilter === 'all') {
        const priorityA = STATUS_PRIORITY[a.status || 'active'] ?? 99;
        const priorityB = STATUS_PRIORITY[b.status || 'active'] ?? 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
      }

      // 2. Sort by the chosen sortField
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'ko');
      } else if (sortField === 'status') {
        const pA = STATUS_PRIORITY[a.status || 'active'] ?? 99;
        const pB = STATUS_PRIORITY[b.status || 'active'] ?? 99;
        comparison = pA - pB;
      } else if (sortField === 'rank') {
        comparison = b.OPS - a.OPS || b.H - a.H;
      } else {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        comparison = valA - valB;
      }

      const sortDir = sortAsc ? 1 : -1;
      const result = comparison * sortDir;

      // 3. Secondary tie-breaker: 이름 ABC순 (가나다순)
      if (result === 0) {
        return a.name.localeCompare(b.name, 'ko');
      }
      return result;
    });

  const renderSortIndicator = (field: BatterSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 group-hover/th:opacity-100" />;
    }
    const isBadStat = BAD_BATTER_STATS.has(field);
    const isGoodRank = isBadStat ? sortAsc : !sortAsc;

    return sortAsc ? (
      <span className={`inline-flex items-center text-[10px] font-bold ${isGoodRank ? 'text-emerald-400' : 'text-amber-400'}`}>
        <ArrowUp className="w-3 h-3" />
        <span className="sr-only">오름차순</span>
      </span>
    ) : (
      <span className={`inline-flex items-center text-[10px] font-bold ${isGoodRank ? 'text-emerald-400' : 'text-amber-400'}`}>
        <ArrowDown className="w-3 h-3" />
        <span className="sr-only">내림차순</span>
      </span>
    );
  };

  const sabermetricGlossary: Record<string, string> = {
    OPS: '출루율(OBP) + 장타율(SLG). 현대 야구에서 타자의 생산성을 가장 직관적으로 나타내는 핵심 지표.',
    wOBA: '가중 출루율 (Weighted On-Base Average). 안타 유형별(단타, 2루타, 3루타, 홈런) 득점 기여 가치를 통계적으로 반영한 종합 타격 지표.',
    ISO: '순장타율 (Isolated Power = SLG - AVG). 단타를 제외하고 장타(2루타 이상)를 때려내는 순수 파워 측정.',
    BABIP: '인플레이 타구 타율. 홈런과 삼진을 제외하고 필드 안으로 들어간 타구가 안타가 되는 비율.',
    'BB/K': '볼넷 대비 삼진 비율. 타자의 선구안과 배트 컨트롤의 정교함을 나타냄.',
  };

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs & Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              전체 ({batters.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>현역 ({batters.filter((b) => (b.status || 'active') === 'active').length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('retired')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'retired'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>은퇴 ({batters.filter((b) => b.status === 'retired').length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('transferred')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'transferred'
                  ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlaneTakeoff className="w-3.5 h-3.5 text-blue-400" />
              <span>이적 ({batters.filter((b) => b.status === 'transferred').length})</span>
            </button>
          </div>

          {/* Status Priority Toggle Button */}
          <button
            onClick={() => setPrioritizeStatus(!prioritizeStatus)}
            title="상태 우선 정렬: 현역 > 은퇴 > 이적 순으로 위쪽에 모아서 표시"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              prioritizeStatus
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>현역 우선 정렬 {prioritizeStatus ? '(ON)' : '(OFF)'}</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="타자 닉네임 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="타자 닉네임 검색"
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-orange-500 w-48 sm:w-56"
            />
          </div>
        </div>

        {/* Legend / Hover description pill */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
          <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span>
            {hoverMetric && sabermetricGlossary[hoverMetric] ? (
              <strong className="text-orange-300 font-normal">
                {hoverMetric}: {sabermetricGlossary[hoverMetric]}
              </strong>
            ) : (
              '열 제목 클릭 시 좋은 스탯순/ABC순 정렬, 마우스 호버 시 세이버메트릭스 공식 설명 확인'
            )}
          </span>
        </div>
      </div>

      {/* Table Container with safe sticky columns and wide player nickname room */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 shadow-xl">
        <table className="w-full text-xs text-left text-slate-300 whitespace-nowrap">
          <thead className="text-[11px] font-semibold text-slate-400 bg-slate-900/90 border-b border-slate-800 uppercase tracking-wider select-none">
            <tr>
              {/* Sticky Rank Column */}
              <th
                onClick={() => handleSort('rank')}
                className="px-3 py-3 sticky left-0 bg-slate-900 z-20 min-w-[50px] w-[50px] text-center border-r border-slate-800/80 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>순위</span>
                  {renderSortIndicator('rank')}
                </div>
              </th>

              {/* Sticky Nickname Column (min-w-[190px], max-w-[280px], with shadow and wrap to prevent truncation) */}
              <th
                onClick={() => handleSort('name')}
                className="px-4 py-3 sticky left-[50px] bg-slate-900 z-20 min-w-[190px] max-w-[280px] border-r border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1.5">
                  <span>선수 닉네임 (ABC순)</span>
                  {renderSortIndicator('name')}
                </div>
              </th>

              {/* Status Header */}
              <th
                onClick={() => handleSort('status')}
                className="px-3 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">
                  <span>상태</span>
                  {renderSortIndicator('status')}
                </div>
              </th>

              {/* Standard Stats */}
              <th
                onClick={() => handleSort('games')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">경기 {renderSortIndicator('games')}</div>
              </th>
              <th
                onClick={() => handleSort('PA')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">타석 {renderSortIndicator('PA')}</div>
              </th>
              <th
                onClick={() => handleSort('AB')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">타수 {renderSortIndicator('AB')}</div>
              </th>
              <th
                onClick={() => handleSort('R')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">득점 {renderSortIndicator('R')}</div>
              </th>
              <th
                onClick={() => handleSort('H')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">안타 {renderSortIndicator('H')}</div>
              </th>
              <th
                onClick={() => handleSort('doubles')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">2B {renderSortIndicator('doubles')}</div>
              </th>
              <th
                onClick={() => handleSort('triples')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">3B {renderSortIndicator('triples')}</div>
              </th>
              <th
                onClick={() => handleSort('HR')}
                className="px-2.5 py-3 cursor-pointer hover:text-white text-amber-400 group/th"
              >
                <div className="flex items-center gap-1">홈런 {renderSortIndicator('HR')}</div>
              </th>
              <th
                onClick={() => handleSort('TB')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">루타 {renderSortIndicator('TB')}</div>
              </th>
              <th
                onClick={() => handleSort('RBI')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">타점 {renderSortIndicator('RBI')}</div>
              </th>
              <th
                onClick={() => handleSort('BB')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">볼넷 {renderSortIndicator('BB')}</div>
              </th>
              <th
                onClick={() => handleSort('HBP')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">사구 {renderSortIndicator('HBP')}</div>
              </th>
              <th
                onClick={() => handleSort('SO')}
                title="삼진: 적을수록 좋은 지표 (클릭 시 낮은 순 우선)"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-rose-300 group/th"
              >
                <div className="flex items-center gap-1">삼진(↓) {renderSortIndicator('SO')}</div>
              </th>
              <th
                onClick={() => handleSort('SB')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">도루 {renderSortIndicator('SB')}</div>
              </th>

              {/* Sabermetric Columns */}
              <th
                onClick={() => handleSort('AVG')}
                className="px-3 py-3 cursor-pointer hover:text-white bg-slate-900/60 font-bold group/th"
              >
                <div className="flex items-center gap-1">타율 {renderSortIndicator('AVG')}</div>
              </th>
              <th
                onClick={() => handleSort('OBP')}
                className="px-3 py-3 cursor-pointer hover:text-white bg-slate-900/60 group/th"
              >
                <div className="flex items-center gap-1">출루율 {renderSortIndicator('OBP')}</div>
              </th>
              <th
                onClick={() => handleSort('SLG')}
                className="px-3 py-3 cursor-pointer hover:text-white bg-slate-900/60 group/th"
              >
                <div className="flex items-center gap-1">장타율 {renderSortIndicator('SLG')}</div>
              </th>
              <th
                onClick={() => handleSort('OPS')}
                onMouseEnter={() => setHoverMetric('OPS')}
                onMouseLeave={() => setHoverMetric(null)}
                className="px-3 py-3 cursor-pointer hover:text-white bg-orange-950/40 text-orange-400 border-x border-orange-500/20 font-bold group/th"
              >
                <div className="flex items-center gap-1">OPS {renderSortIndicator('OPS')}</div>
              </th>
              <th
                onClick={() => handleSort('ISO')}
                onMouseEnter={() => setHoverMetric('ISO')}
                onMouseLeave={() => setHoverMetric(null)}
                className="px-3 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">ISO {renderSortIndicator('ISO')}</div>
              </th>
              <th
                onClick={() => handleSort('BABIP')}
                onMouseEnter={() => setHoverMetric('BABIP')}
                onMouseLeave={() => setHoverMetric(null)}
                className="px-3 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">BABIP {renderSortIndicator('BABIP')}</div>
              </th>
              <th
                onClick={() => handleSort('wOBA')}
                onMouseEnter={() => setHoverMetric('wOBA')}
                onMouseLeave={() => setHoverMetric(null)}
                className="px-3 py-3 cursor-pointer hover:text-white text-emerald-400 group/th"
              >
                <div className="flex items-center gap-1">wOBA {renderSortIndicator('wOBA')}</div>
              </th>
              <th
                onClick={() => handleSort('BB_rate')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">BB% {renderSortIndicator('BB_rate')}</div>
              </th>
              <th
                onClick={() => handleSort('K_rate')}
                title="삼진율: 낮을수록 좋은 지표 (클릭 시 낮은 순 우선)"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-rose-300 group/th"
              >
                <div className="flex items-center gap-1">K%(↓) {renderSortIndicator('K_rate')}</div>
              </th>
              <th
                onClick={() => handleSort('BB_K')}
                onMouseEnter={() => setHoverMetric('BB/K')}
                onMouseLeave={() => setHoverMetric(null)}
                className="px-3 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">BB/K {renderSortIndicator('BB_K')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={27} className="px-6 py-12 text-center text-slate-500 font-sans">
                  등록된 타자 기록이 없습니다. 상단에서 경기 기록지를 입력해보세요!
                </td>
              </tr>
            ) : (
              filtered.map((b, idx) => {
                const isLeader = idx === 0 && !sortAsc;
                return (
                  <tr
                    key={b.name}
                    className="hover:bg-slate-900/60 transition-colors group"
                  >
                    {/* Sticky Rank Cell */}
                    <td className="px-3 py-2.5 sticky left-0 bg-slate-950 group-hover:bg-slate-900 z-10 font-sans text-center border-r border-slate-800/80 w-[50px] min-w-[50px]">
                      <div className="flex items-center justify-center gap-1">
                        {isLeader ? (
                          <Award className="w-4 h-4 text-amber-400" />
                        ) : (
                          <span className="text-slate-500 text-xs">{idx + 1}</span>
                        )}
                      </div>
                    </td>

                    {/* Sticky Nickname Cell: Spacious, never clipped, wrapped text */}
                    <td className="px-4 py-2.5 sticky left-[50px] bg-slate-950 group-hover:bg-slate-900 z-10 font-sans font-bold text-white border-r border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.5)] min-w-[190px] max-w-[280px]">
                      <div className="flex flex-col gap-1 min-w-[170px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-bold text-white text-xs break-keep whitespace-normal"
                            title={b.name}
                          >
                            {b.name}
                          </span>
                          {b.HR >= 2 && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded font-normal">
                              🔥슬러거
                            </span>
                          )}
                          {b.OBP >= 0.5 && b.PA >= 4 && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.2 rounded font-normal">
                              출루신
                            </span>
                          )}
                          {onEditPlayerStatus && (
                            <button
                              type="button"
                              onClick={() => onEditPlayerStatus(b.name)}
                              title={`${b.name} 상태 설정 (은퇴/이적/소속)`}
                              aria-label={`${b.name} 상태 설정`}
                              className="p-1 rounded-md hover:bg-slate-800 text-slate-500 hover:text-orange-400 transition-colors cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Player Status Cell */}
                    <td className="px-3 py-2.5 font-sans">
                      {b.status === 'retired' && (
                        <span
                          className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium whitespace-normal"
                          title={b.statusInfo?.note ? `은퇴 사유: ${b.statusInfo.note}` : '은퇴 (기록 보존)'}
                        >
                          🎖️ 은퇴{b.statusInfo?.note ? ` (${b.statusInfo.note})` : ''}
                        </span>
                      )}
                      {b.status === 'transferred' && (
                        <span
                          className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium whitespace-normal"
                          title={b.statusInfo?.destination ? `이적팀: ${b.statusInfo.destination}${b.statusInfo?.note ? ` (${b.statusInfo.note})` : ''}` : '이적'}
                        >
                          ✈️ 이적{b.statusInfo?.destination ? ` [${b.statusInfo.destination}]` : ''}
                        </span>
                      )}
                      {b.status === 'inactive' && (
                        <span
                          className="text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium whitespace-normal"
                          title={b.statusInfo?.note || '휴식/비활동'}
                        >
                          ⏳ 휴식{b.statusInfo?.note ? ` (${b.statusInfo.note})` : ''}
                        </span>
                      )}
                      {(!b.status || b.status === 'active') && (
                        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          현역
                        </span>
                      )}
                    </td>

                    {/* Basic Batting Stats */}
                    <td className="px-2.5 py-2.5 text-slate-300">{b.games}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{b.PA}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{b.AB}</td>
                    <td className="px-2.5 py-2.5 text-slate-300">{b.R}</td>
                    <td className="px-2.5 py-2.5 font-bold text-white">{b.H}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{b.doubles}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{b.triples}</td>
                    <td className="px-2.5 py-2.5 font-bold text-amber-400">
                      {b.HR > 0 ? b.HR : '-'}
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-400">{b.TB}</td>
                    <td className="px-2.5 py-2.5 text-slate-300 font-semibold">{b.RBI}</td>
                    <td className="px-2.5 py-2.5 text-slate-300">{b.BB}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{b.HBP}</td>
                    <td className="px-2.5 py-2.5 text-rose-400">{b.SO}</td>
                    <td className="px-2.5 py-2.5 text-cyan-400">{b.SB > 0 ? b.SB : '-'}</td>

                    {/* Sabermetric values */}
                    <td className="px-3 py-2.5 font-bold text-slate-100 bg-slate-900/40">
                      {formatAvg(b.AVG)}
                    </td>
                    <td className="px-3 py-2.5 text-blue-300 bg-slate-900/40">
                      {formatAvg(b.OBP)}
                    </td>
                    <td className="px-3 py-2.5 text-amber-300 bg-slate-900/40">
                      {formatAvg(b.SLG)}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-orange-400 bg-orange-950/20 border-x border-orange-500/20">
                      {formatAvg(b.OPS)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{formatAvg(b.ISO)}</td>
                    <td className="px-3 py-2.5 text-slate-400">{formatAvg(b.BABIP)}</td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-400">
                      {formatAvg(b.wOBA)}
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-400">{formatRate(b.BB_rate, 1)}%</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{formatRate(b.K_rate, 1)}%</td>
                    <td className="px-3 py-2.5 text-slate-300">{formatRate(b.BB_K, 2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
