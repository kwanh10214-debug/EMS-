import React, { useState } from 'react';
import { PitcherCumulativeStat } from '../types/baseball';
import { formatRate, outsToInningsText } from '../utils/sabermetrics';
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

interface PitcherTableProps {
  pitchers: PitcherCumulativeStat[];
  onEditPlayerStatus?: (nickname: string) => void;
}

export type PitcherSortField =
  | 'rank'
  | 'name'
  | 'status'
  | 'games'
  | 'starts'
  | 'wins'
  | 'losses'
  | 'holds'
  | 'saves'
  | 'totalOuts'
  | 'runs'
  | 'ER'
  | 'hits'
  | 'HR'
  | 'BB'
  | 'SO'
  | 'ERA'
  | 'WHIP'
  | 'FIP'
  | 'K9'
  | 'BB9'
  | 'K_BB'
  | 'H9'
  | 'HR9';

// Negative stats for pitchers where lower is better (안 좋은 스탯은 낮은 순이 좋은 지표)
const BAD_PITCHER_STATS = new Set<PitcherSortField>([
  'ERA',
  'WHIP',
  'FIP',
  'losses',
  'runs',
  'ER',
  'hits',
  'HR',
  'BB',
  'BB9',
  'H9',
  'HR9',
]);

export const PitcherTable: React.FC<PitcherTableProps> = ({
  pitchers,
  onEditPlayerStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'retired' | 'transferred' | 'inactive'
  >('all');
  const [sortField, setSortField] = useState<PitcherSortField>('wins');
  const [sortAsc, setSortAsc] = useState(false); // default desc for wins
  const [prioritizeStatus, setPrioritizeStatus] = useState(true); // 현역 > 은퇴 > 이적 우선 정렬
  const [hoverMetric, setHoverMetric] = useState<string | null>(null);

  const handleSort = (field: PitcherSortField) => {
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
      } else if (BAD_PITCHER_STATS.has(field)) {
        // 평균자책점, WHIP, 실점 등 안 좋은 지표는 낮은 순(오름차순)이 좋은 순서!
        setSortAsc(true);
      } else {
        // 다승, 탈삼진, 세이브 등 좋은 지표는 높은 순(내림차순)이 기본!
        setSortAsc(false);
      }
    }
  };

  const filtered = pitchers
    .filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      const playerStatus = p.status || 'active';
      if (statusFilter === 'all') return true;
      return playerStatus === statusFilter;
    })
    .sort((a, b) => {
      // 1. Status priority (현역 > 은퇴 > 이적 > 휴식) if prioritizeStatus is active
      if (prioritizeStatus && statusFilter === 'all') {
        const priorityA = STATUS_PRIORITY[pStatus(a)] ?? 99;
        const priorityB = STATUS_PRIORITY[pStatus(b)] ?? 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
      }

      // 2. Sort by the chosen sortField
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'ko');
      } else if (sortField === 'status') {
        const pA = STATUS_PRIORITY[pStatus(a)] ?? 99;
        const pB = STATUS_PRIORITY[pStatus(b)] ?? 99;
        comparison = pA - pB;
      } else if (sortField === 'rank') {
        comparison = b.wins - a.wins || a.ERA - b.ERA;
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

  function pStatus(p: PitcherCumulativeStat): string {
    return p.status || 'active';
  }

  const renderSortIndicator = (field: PitcherSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 group-hover/th:opacity-100" />;
    }
    const isBadStat = BAD_PITCHER_STATS.has(field);
    const isGoodRank = isBadStat ? sortAsc : !sortAsc;

    return sortAsc ? (
      <span className={`inline-flex items-center text-[10px] font-bold ${isGoodRank ? 'text-emerald-400' : 'text-blue-400'}`}>
        <ArrowUp className="w-3 h-3" />
        <span className="sr-only">오름차순</span>
      </span>
    ) : (
      <span className={`inline-flex items-center text-[10px] font-bold ${isGoodRank ? 'text-emerald-400' : 'text-blue-400'}`}>
        <ArrowDown className="w-3 h-3" />
        <span className="sr-only">내림차순</span>
      </span>
    );
  };

  const glossary: Record<string, string> = {
    ERA: '평균자책점 ((자책점 × 9) / 이닝). 9이닝당 평균적으로 내주는 자책점 (낮을수록 우수).',
    WHIP: '이닝당 출루 허용률 ((피안타 + 볼넷) / 이닝). 투수의 출루 억제 능력을 측정하는 대표 지표. (1.20 이하는 특급)',
    FIP: '수비무관 평균자책점 (Fielding Independent Pitching). 수비수 능력이나 운의 개입을 배제하고 투수 본인의 힘(피홈런, 사사구, 탈삼진)만으로 계산한 순수 자책점 기대치.',
    'K/9': '9이닝당 탈삼진 수 ((탈삼진 × 9) / 이닝). 투수의 구위와 헛스윙 유도 능력을 측정.',
    'K/BB': '탈삼진 대비 볼넷 비율 (탈삼진 / 볼넷). 제구력과 지배력을 동시에 보여주는 안정성 지표.',
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
              전체 ({pitchers.length})
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
              <span>현역 ({pitchers.filter((p) => (p.status || 'active') === 'active').length})</span>
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
              <span>은퇴 ({pitchers.filter((p) => p.status === 'retired').length})</span>
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
              <span>이적 ({pitchers.filter((p) => p.status === 'transferred').length})</span>
            </button>
          </div>

          {/* Status Priority Toggle */}
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
              placeholder="투수 닉네임 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="투수 닉네임 검색"
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 w-48 sm:w-56"
            />
          </div>
        </div>

        {/* Legend / Hover description pill */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            {hoverMetric && glossary[hoverMetric] ? (
              <strong className="text-blue-300 font-normal">
                {hoverMetric}: {glossary[hoverMetric]}
              </strong>
            ) : (
              '열 제목 클릭 시 좋은 스탯순/ABC순 정렬 (ERA, WHIP 등은 낮은 순이 우수)'
            )}
          </span>
        </div>
      </div>

      {/* Table Container with safe sticky columns and wide nickname room */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 shadow-xl">
        <table className="w-full text-xs text-left text-slate-300 whitespace-nowrap">
          <thead className="text-[11px] font-semibold text-slate-400 bg-slate-900/90 border-b border-slate-800 uppercase tracking-wider select-none">
            <tr>
              {/* Sticky Rank */}
              <th
                onClick={() => handleSort('rank')}
                className="px-3 py-3 sticky left-0 bg-slate-900 z-20 min-w-[50px] w-[50px] text-center border-r border-slate-800/80 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>순위</span>
                  {renderSortIndicator('rank')}
                </div>
              </th>

              {/* Sticky Pitcher Nickname (min-w-[190px], max-w-[280px], with shadow and wrap to prevent truncation) */}
              <th
                onClick={() => handleSort('name')}
                className="px-4 py-3 sticky left-[50px] bg-slate-900 z-20 min-w-[190px] max-w-[280px] border-r border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.5)] cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1.5">
                  <span>투수 닉네임 (ABC순)</span>
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

              {/* Standard Pitching Stats */}
              <th
                onClick={() => handleSort('games')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">등판 {renderSortIndicator('games')}</div>
              </th>
              <th
                onClick={() => handleSort('starts')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">선발 {renderSortIndicator('starts')}</div>
              </th>
              <th
                onClick={() => handleSort('wins')}
                className="px-2.5 py-3 cursor-pointer hover:text-white text-emerald-400 font-bold group/th"
              >
                <div className="flex items-center gap-1">승 {renderSortIndicator('wins')}</div>
              </th>
              <th
                onClick={() => handleSort('losses')}
                title="패전: 적을수록 좋은 지표 (클릭 시 낮은 순 우선)"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-rose-300 group/th"
              >
                <div className="flex items-center gap-1">패(↓) {renderSortIndicator('losses')}</div>
              </th>
              <th
                onClick={() => handleSort('holds')}
                className="px-2.5 py-3 cursor-pointer hover:text-white text-amber-300 group/th"
              >
                <div className="flex items-center gap-1">홀드 {renderSortIndicator('holds')}</div>
              </th>
              <th
                onClick={() => handleSort('saves')}
                className="px-2.5 py-3 cursor-pointer hover:text-white text-cyan-300 font-bold group/th"
              >
                <div className="flex items-center gap-1">세이브 {renderSortIndicator('saves')}</div>
              </th>
              <th
                onClick={() => handleSort('totalOuts')}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">이닝(IP) {renderSortIndicator('totalOuts')}</div>
              </th>
              <th
                onClick={() => handleSort('runs')}
                title="실점: 적을수록 좋은 지표"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-slate-400 group/th"
              >
                <div className="flex items-center gap-1">실점(↓) {renderSortIndicator('runs')}</div>
              </th>
              <th
                onClick={() => handleSort('ER')}
                title="자책점: 적을수록 좋은 지표"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-slate-400 group/th"
              >
                <div className="flex items-center gap-1">자책(↓) {renderSortIndicator('ER')}</div>
              </th>
              <th
                onClick={() => handleSort('hits')}
                title="피안타: 적을수록 좋은 지표"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-slate-400 group/th"
              >
                <div className="flex items-center gap-1">피안타(↓) {renderSortIndicator('hits')}</div>
              </th>
              <th
                onClick={() => handleSort('HR')}
                title="피홈런: 적을수록 좋은 지표"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-slate-400 group/th"
              >
                <div className="flex items-center gap-1">피홈런(↓) {renderSortIndicator('HR')}</div>
              </th>
              <th
                onClick={() => handleSort('BB')}
                title="사사구: 적을수록 좋은 지표"
                className="px-2.5 py-3 cursor-pointer hover:text-white text-slate-400 group/th"
              >
                <div className="flex items-center gap-1">사사구(↓) {renderSortIndicator('BB')}</div>
              </th>
              <th
                onClick={() => handleSort('SO')}
                className="px-2.5 py-3 cursor-pointer hover:text-white text-amber-400 font-bold group/th"
              >
                <div className="flex items-center gap-1">탈삼진 {renderSortIndicator('SO')}</div>
              </th>

              {/* Advanced Sabermetrics */}
              <th
                onClick={() => handleSort('ERA')}
                onMouseEnter={() => setHoverMetric('ERA')}
                onMouseLeave={() => setHoverMetric(null)}
                title="평균자책점: 낮을수록 특급 투수 (클릭 시 낮은 순 우선)"
                className="px-3 py-3 cursor-pointer hover:text-white bg-blue-950/40 text-blue-300 font-bold border-l border-blue-500/20 group/th"
              >
                <div className="flex items-center gap-1">ERA(↓) {renderSortIndicator('ERA')}</div>
              </th>
              <th
                onClick={() => handleSort('WHIP')}
                onMouseEnter={() => setHoverMetric('WHIP')}
                onMouseLeave={() => setHoverMetric(null)}
                title="WHIP: 낮을수록 우수 (1.20 이하 특급)"
                className="px-3 py-3 cursor-pointer hover:text-white bg-blue-950/40 text-blue-300 font-bold group/th"
              >
                <div className="flex items-center gap-1">WHIP(↓) {renderSortIndicator('WHIP')}</div>
              </th>
              <th
                onClick={() => handleSort('FIP')}
                onMouseEnter={() => setHoverMetric('FIP')}
                onMouseLeave={() => setHoverMetric(null)}
                title="수비무관 평균자책점: 낮을수록 우수"
                className="px-3 py-3 cursor-pointer hover:text-white bg-blue-950/40 text-blue-300 font-bold border-r border-blue-500/20 group/th"
              >
                <div className="flex items-center gap-1">FIP(↓) {renderSortIndicator('FIP')}</div>
              </th>
              <th
                onClick={() => handleSort('K9')}
                onMouseEnter={() => setHoverMetric('K/9')}
                onMouseLeave={() => setHoverMetric(null)}
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">K/9 {renderSortIndicator('K9')}</div>
              </th>
              <th
                onClick={() => handleSort('BB9')}
                title="9이닝당 볼넷: 낮을수록 우수"
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">BB/9(↓) {renderSortIndicator('BB9')}</div>
              </th>
              <th
                onClick={() => handleSort('K_BB')}
                onMouseEnter={() => setHoverMetric('K/BB')}
                onMouseLeave={() => setHoverMetric(null)}
                className="px-2.5 py-3 cursor-pointer hover:text-white text-emerald-400 group/th"
              >
                <div className="flex items-center gap-1">K/BB {renderSortIndicator('K_BB')}</div>
              </th>
              <th
                onClick={() => handleSort('H9')}
                title="9이닝당 피안타: 낮을수록 우수"
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">H/9(↓) {renderSortIndicator('H9')}</div>
              </th>
              <th
                onClick={() => handleSort('HR9')}
                title="9이닝당 피홈런: 낮을수록 우수"
                className="px-2.5 py-3 cursor-pointer hover:text-white group/th"
              >
                <div className="flex items-center gap-1">HR/9(↓) {renderSortIndicator('HR9')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={24} className="px-6 py-12 text-center text-slate-500 font-sans">
                  등록된 투수 기록이 없습니다. 상단에서 경기 기록지를 입력해보세요!
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => {
                const isLeader = idx === 0 && !sortAsc;
                return (
                  <tr
                    key={p.name}
                    className="hover:bg-slate-900/60 transition-colors group"
                  >
                    {/* Sticky Rank Cell */}
                    <td className="px-3 py-2.5 sticky left-0 bg-slate-950 group-hover:bg-slate-900 z-10 font-sans text-center border-r border-slate-800/80 w-[50px] min-w-[50px]">
                      <div className="flex items-center justify-center gap-1">
                        {isLeader ? (
                          <Award className="w-4 h-4 text-blue-400" />
                        ) : (
                          <span className="text-slate-500 text-xs">{idx + 1}</span>
                        )}
                      </div>
                    </td>

                    {/* Sticky Pitcher Nickname Cell: Spacious, never clipped, wrapped text */}
                    <td className="px-4 py-2.5 sticky left-[50px] bg-slate-950 group-hover:bg-slate-900 z-10 font-sans font-bold text-white border-r border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.5)] min-w-[190px] max-w-[280px]">
                      <div className="flex flex-col gap-1 min-w-[170px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-bold text-white text-xs break-keep whitespace-normal"
                            title={p.name}
                          >
                            {p.name}
                          </span>
                          {p.wins >= 2 && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-normal">
                              에이스
                            </span>
                          )}
                          {p.ERA > 0 && p.ERA <= 2.5 && p.totalOuts >= 15 && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.2 rounded font-normal">
                              짠물
                            </span>
                          )}
                          {onEditPlayerStatus && (
                            <button
                              type="button"
                              onClick={() => onEditPlayerStatus(p.name)}
                              title={`${p.name} 상태 설정 (은퇴/이적/소속)`}
                              aria-label={`${p.name} 상태 설정`}
                              className="p-1 rounded-md hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status Cell */}
                    <td className="px-3 py-2.5 font-sans">
                      {p.status === 'retired' && (
                        <span
                          className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium whitespace-normal"
                          title={p.statusInfo?.note ? `은퇴 사유: ${p.statusInfo.note}` : '은퇴 (기록 보존)'}
                        >
                          🎖️ 은퇴{p.statusInfo?.note ? ` (${p.statusInfo.note})` : ''}
                        </span>
                      )}
                      {p.status === 'transferred' && (
                        <span
                          className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium whitespace-normal"
                          title={p.statusInfo?.destination ? `이적팀: ${p.statusInfo.destination}${p.statusInfo?.note ? ` (${p.statusInfo.note})` : ''}` : '이적'}
                        >
                          ✈️ 이적{p.statusInfo?.destination ? ` [${p.statusInfo.destination}]` : ''}
                        </span>
                      )}
                      {p.status === 'inactive' && (
                        <span
                          className="text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium whitespace-normal"
                          title={p.statusInfo?.note || '휴식/비활동'}
                        >
                          ⏳ 휴식{p.statusInfo?.note ? ` (${p.statusInfo.note})` : ''}
                        </span>
                      )}
                      {(!p.status || p.status === 'active') && (
                        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          현역
                        </span>
                      )}
                    </td>

                    {/* Standard Pitching Stats */}
                    <td className="px-2.5 py-2.5 text-slate-300">{p.games}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{p.starts}</td>
                    <td className="px-2.5 py-2.5 font-bold text-emerald-400">
                      {p.wins > 0 ? `${p.wins}승` : '-'}
                    </td>
                    <td className="px-2.5 py-2.5 text-rose-400">
                      {p.losses > 0 ? `${p.losses}패` : '-'}
                    </td>
                    <td className="px-2.5 py-2.5 text-amber-300">{p.holds > 0 ? p.holds : '-'}</td>
                    <td className="px-2.5 py-2.5 font-bold text-cyan-300">
                      {p.saves > 0 ? `${p.saves}세` : '-'}
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-200 font-semibold">
                      {outsToInningsText(p.totalOuts)}
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-400">{p.runs}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{p.ER}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{p.hits}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{p.HR}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{p.BB}</td>
                    <td className="px-2.5 py-2.5 font-bold text-amber-400">{p.SO}</td>

                    {/* Sabermetric Columns */}
                    <td className="px-3 py-2.5 font-bold text-blue-300 bg-blue-950/20 border-l border-blue-500/20">
                      {formatRate(p.ERA, 2)}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-blue-300 bg-blue-950/20">
                      {formatRate(p.WHIP, 2)}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-blue-300 bg-blue-950/20 border-r border-blue-500/20">
                      {formatRate(p.FIP, 2)}
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-300">{formatRate(p.K9, 1)}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{formatRate(p.BB9, 1)}</td>
                    <td className="px-2.5 py-2.5 text-emerald-400 font-semibold">
                      {formatRate(p.K_BB, 2)}
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-400">{formatRate(p.H9, 1)}</td>
                    <td className="px-2.5 py-2.5 text-slate-400">{formatRate(p.HR9, 1)}</td>
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
