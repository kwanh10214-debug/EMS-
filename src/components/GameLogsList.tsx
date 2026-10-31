import React, { useState } from 'react';
import { GameRecord } from '../types/baseball';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  Trophy,
} from 'lucide-react';

interface GameLogsListProps {
  games: GameRecord[];
  onDeleteGame: (gameId: string) => void;
}

export const GameLogsList: React.FC<GameLogsListProps> = ({
  games,
  onDeleteGame,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    games.length > 0 ? games[0].id : null
  );

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-12 text-center text-slate-500">
        <Trophy className="w-10 h-10 mx-auto text-slate-700 mb-3" />
        <p className="text-base font-semibold text-slate-400">아직 등록된 경기 기록이 없습니다.</p>
        <p className="text-xs text-slate-600 mt-1">
          상단의 "새 경기 기록지 등록" 버튼을 눌러 첫 번째 경기를 추가해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>기록된 경기 목록</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            총 {games.length}경기
          </span>
        </h3>
      </div>

      <div className="space-y-3">
        {games.map((g) => {
          const isExpanded = expandedId === g.id;
          const isWin = g.header.outcome === '승';
          const isLoss = g.header.outcome === '패';

          return (
            <div
              key={g.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg transition-all"
            >
              {/* Card Header Bar */}
              <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow-sm ${
                      isWin
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isLoss
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {g.header.outcome}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">
                        우리팀 {g.header.ourScore} : {g.header.oppScore} {g.header.opponent}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {g.header.isHome ? '홈 경기' : '원정 경기'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{g.header.date}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Pitchers and Batters preview chips */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : g.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? '상세 접기' : '박스스코어'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteGame(g.id)}
                    title="이 경기 삭제"
                    aria-label="이 경기 삭제"
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inning Linescore Banner */}
              {g.lineScore && g.lineScore.headers && (
                <div className="px-4 sm:px-5 pb-3">
                  <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
                    <table className="w-full text-xs text-center font-mono text-slate-300">
                      <thead>
                        <tr className="text-slate-500 text-[10px] border-b border-slate-800 pb-1">
                          <th className="text-left font-sans px-2 py-1">팀</th>
                          {g.lineScore.headers.map((h, i) => (
                            <th key={i} className="px-2 py-1">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        <tr>
                          <td className="text-left font-sans font-semibold text-slate-300 px-2 py-1">
                            {g.lineScore.away.name}
                          </td>
                          {g.lineScore.away.innings.map((v, i) => (
                            <td key={i} className="px-2 py-1 text-slate-300">
                              {v}
                            </td>
                          ))}
                          <td className="px-2 py-1 font-bold text-white">{g.lineScore.away.H}</td>
                          <td className="px-2 py-1 text-rose-400">{g.lineScore.away.E}</td>
                          <td className="px-2 py-1 text-slate-400">{g.lineScore.away.B}</td>
                        </tr>
                        <tr>
                          <td className="text-left font-sans font-semibold text-orange-400 px-2 py-1">
                            {g.lineScore.home.name}
                          </td>
                          {g.lineScore.home.innings.map((v, i) => (
                            <td key={i} className="px-2 py-1 text-slate-300">
                              {v}
                            </td>
                          ))}
                          <td className="px-2 py-1 font-bold text-white">{g.lineScore.home.H}</td>
                          <td className="px-2 py-1 text-rose-400">{g.lineScore.home.E}</td>
                          <td className="px-2 py-1 text-slate-400">{g.lineScore.home.B}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Expandable Box Score Detail */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 sm:p-5 space-y-4">
                  {/* Batters */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      타자 박스스코어 ({g.batters.length}명)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-xs text-left text-slate-300">
                        <thead className="bg-slate-900/80 text-[10px] text-slate-400 border-b border-slate-800 uppercase">
                          <tr>
                            <th className="px-3 py-2">타순</th>
                            <th className="px-3 py-2">닉네임</th>
                            <th className="px-2 py-2">타수</th>
                            <th className="px-2 py-2">안타</th>
                            <th className="px-2 py-2">2B</th>
                            <th className="px-2 py-2">3B</th>
                            <th className="px-2 py-2">홈런</th>
                            <th className="px-2 py-2">타점</th>
                            <th className="px-2 py-2">득점</th>
                            <th className="px-2 py-2">볼넷</th>
                            <th className="px-2 py-2">삼진</th>
                            <th className="px-2 py-2">도루</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 font-mono">
                          {g.batters.map((b) => (
                            <tr key={b.order} className="hover:bg-slate-900/30">
                              <td className="px-3 py-1.5 text-slate-500 font-sans">{b.order}번</td>
                              <td className="px-3 py-1.5 font-bold text-white font-sans">
                                {b.name}
                                {b.position && (
                                  <span className="text-slate-500 font-normal ml-1">
                                    ({b.position})
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5">{b.AB}</td>
                              <td className="px-2 py-1.5 font-bold text-emerald-400">{b.H}</td>
                              <td className="px-2 py-1.5 text-slate-400">{b.doubles}</td>
                              <td className="px-2 py-1.5 text-slate-400">{b.triples}</td>
                              <td className="px-2 py-1.5 font-bold text-amber-400">
                                {b.HR > 0 ? b.HR : '-'}
                              </td>
                              <td className="px-2 py-1.5 text-slate-300 font-semibold">{b.RBI}</td>
                              <td className="px-2 py-1.5 text-slate-300">{b.R}</td>
                              <td className="px-2 py-1.5 text-slate-300">{b.BB}</td>
                              <td className="px-2 py-1.5 text-rose-400">{b.SO}</td>
                              <td className="px-2 py-1.5 text-cyan-400">{b.SB}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pitchers */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      투수 박스스코어 ({g.pitchers.length}명)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-xs text-left text-slate-300">
                        <thead className="bg-slate-900/80 text-[10px] text-slate-400 border-b border-slate-800 uppercase">
                          <tr>
                            <th className="px-3 py-2">구분</th>
                            <th className="px-3 py-2">투수 닉네임</th>
                            <th className="px-2 py-2">이닝</th>
                            <th className="px-2 py-2">실점</th>
                            <th className="px-2 py-2">자책</th>
                            <th className="px-2 py-2">피안타</th>
                            <th className="px-2 py-2">피홈런</th>
                            <th className="px-2 py-2">사사구</th>
                            <th className="px-2 py-2">탈삼진</th>
                            <th className="px-3 py-2">결과</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 font-mono">
                          {g.pitchers.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/30">
                              <td className="px-3 py-1.5 font-bold text-blue-400 font-sans">{p.role}</td>
                              <td className="px-3 py-1.5 font-bold text-white font-sans">{p.name}</td>
                              <td className="px-2 py-1.5 font-semibold text-white">{p.inningsText}</td>
                              <td className="px-2 py-1.5 text-slate-400">{p.runs}</td>
                              <td className="px-2 py-1.5 text-rose-400 font-bold">{p.ER}</td>
                              <td className="px-2 py-1.5 text-slate-400">{p.hits}</td>
                              <td className="px-2 py-1.5 text-amber-400">{p.HR}</td>
                              <td className="px-2 py-1.5 text-slate-400">{p.BB}</td>
                              <td className="px-2 py-1.5 font-bold text-emerald-400">{p.SO}</td>
                              <td className="px-3 py-1.5 font-sans">
                                {p.decision ? (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                                    {p.decision}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
