import React, { useState } from 'react';
import {
  X,
  FileText,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import {
  parseMatchRecord,
  getSampleMatchText,
} from '../utils/parser';
import {
  GameRecord,
  BatterMatchStat,
  PitcherMatchStat,
} from '../types/baseball';
import { formatAvg, formatRate } from '../utils/sabermetrics';

interface MatchInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGame: (game: GameRecord, shouldSyncSheets: boolean) => void;
  isSheetsConnected: boolean;
}

export const MatchInputModal: React.FC<MatchInputModalProps> = ({
  isOpen,
  onClose,
  onSaveGame,
  isSheetsConnected,
}) => {
  const [inputText, setInputText] = useState<string>(getSampleMatchText());
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [syncToSheets, setSyncToSheets] = useState(isSheetsConnected);
  const [activeTab, setActiveTab] = useState<'text' | 'preview'>('text');

  // Parsed state
  const parsed = React.useMemo(() => {
    return parseMatchRecord(inputText);
  }, [inputText]);

  // Local state for fine-tuning parsed data
  const [header, setHeader] = useState(parsed.header);
  const [lineScore, setLineScore] = useState(parsed.lineScore);
  const [batters, setBatters] = useState(parsed.batters);
  const [pitchers, setPitchers] = useState(parsed.pitchers);

  // Sync fine-tuning state when parsed result changes while on text tab
  React.useEffect(() => {
    setHeader(parsed.header);
    setLineScore(parsed.lineScore);
    setBatters(parsed.batters);
    setPitchers(parsed.pitchers);
  }, [parsed]);

  if (!isOpen) return null;

  const emptyTemplate = `2026. 00. 00. 00시 vs 상대팀 (홈or원정) 0:0 (승or패)

1 2 3 4 5 6 7 8 9 H E B
0 0 0 0 0 0 0 0 0 0 0 0
------------------- - - -
0 0 0 0 0 0 0 0 0 0 0 0

1. 
2. 
3. 
4. 
5. 
6. 
7. 
8. 
9. 

SP 투수닉 0이닝 0실점 0자책 0피안타 0피홈런 0사사구 0K (승or패)
RP 투수닉 0이닝 0실점 0자책 0피안타 0피홈런 0사사구 0K 
CP 투수닉 0이닝 0실점 0자책 0피안타 0피홈런 0사사구 0K`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(emptyTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleLoadSample = () => {
    setInputText(getSampleMatchText());
  };

  const handleClearText = () => {
    setInputText('');
  };

  const handleSave = () => {
    const newGame: GameRecord = {
      id: `game-${Date.now()}`,
      rawText: inputText,
      header,
      lineScore,
      batters: batters.filter((b) => b.name && b.name.trim() !== ''),
      pitchers: pitchers.filter((p) => p.name && p.name.trim() !== ''),
      createdAt: new Date().toISOString(),
    };

    onSaveGame(newGame, syncToSheets);
    onClose();
  };

  // Batter stat row updater
  const updateBatter = (index: number, field: keyof BatterMatchStat, val: any) => {
    setBatters((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Add batter row
  const addBatter = () => {
    setBatters((prev) => [
      ...prev,
      {
        order: prev.length + 1,
        name: `타자${prev.length + 1}`,
        PA: 0,
        AB: 0,
        R: 0,
        H: 0,
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
    ]);
  };

  // Pitcher row updater
  const updatePitcher = (index: number, field: keyof PitcherMatchStat, val: any) => {
    setPitchers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Add pitcher row
  const addPitcher = () => {
    setPitchers((prev) => [
      ...prev,
      {
        role: 'RP',
        name: `구원${prev.length + 1}`,
        inningsText: '1이닝',
        IP: 1,
        runs: 0,
        ER: 0,
        hits: 0,
        HR: 0,
        BB: 0,
        SO: 0,
      },
    ]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-input-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="match-input-modal-title" className="text-lg font-bold text-white">
                경기 기록지 입력 및 자동 누적
              </h2>
              <p className="text-xs text-slate-400">
                기존 양식을 그대로 붙여넣으면 선수 닉네임별로 세이버메트릭스가 자동 집계됩니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📝 텍스트 기록지 입력
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📊 파싱 결과 및 세부 편집</span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300">
                타자 {batters.length}명 / 투수 {pitchers.length}명
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-2.5 py-1.5 rounded-lg text-xs text-orange-400 hover:bg-orange-950/40 border border-orange-500/30 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>예시 경기 불러오기</span>
            </button>
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTemplate ? '복사됨!' : '빈 양식 복사'}</span>
            </button>
            <button
              type="button"
              onClick={handleClearText}
              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              비우기
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'text' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                  팀 기록지 텍스트를 붙여넣으세요. 입력 즉시 실시간으로 파싱됩니다.
                </span>
                <span>{inputText.length} 글자</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={16}
                aria-label="팀 기록지 텍스트 입력"
                placeholder="2026. 00. 00. 00시 vs 상대팀 (홈or원정) 0:0 (승or패)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-y"
              />

              {/* Instant Parse Summary Pill */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      header.outcome === '승'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : header.outcome === '패'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {header.outcome}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {header.date} vs {header.opponent} ({header.isHome ? '홈' : '원정'})
                    </div>
                    <div className="text-xs text-slate-400">
                      최종 스코어: {header.ourScore} : {header.oppScore}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-300">
                    인식된 타자: <strong className="text-orange-400">{batters.length}명</strong>
                  </span>
                  <span className="w-px h-3 bg-slate-700" />
                  <span className="text-slate-300">
                    인식된 투수: <strong className="text-blue-400">{pitchers.length}명</strong>
                  </span>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className="ml-2 text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                  >
                    세부 확인/수정 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Editor */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  경기 기본 정보
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">일시</label>
                    <input
                      type="text"
                      value={header.date}
                      onChange={(e) => setHeader({ ...header, date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">상대팀</label>
                    <input
                      type="text"
                      value={header.opponent}
                      onChange={(e) => setHeader({ ...header, opponent: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">장소</label>
                    <select
                      value={header.isHome ? '홈' : '원정'}
                      onChange={(e) => setHeader({ ...header, isHome: e.target.value === '홈' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="홈">홈 경기</option>
                      <option value="원정">원정 경기</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">스코어 (우리:상대)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={header.ourScore}
                        onChange={(e) => setHeader({ ...header, ourScore: parseInt(e.target.value, 10) || 0 })}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-center"
                      />
                      <span>:</span>
                      <input
                        type="number"
                        value={header.oppScore}
                        onChange={(e) => setHeader({ ...header, oppScore: parseInt(e.target.value, 10) || 0 })}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">경기 결과</label>
                    <select
                      value={header.outcome}
                      onChange={(e) => setHeader({ ...header, outcome: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="승">승리 (승)</option>
                      <option value="패">패전 (패)</option>
                      <option value="무">무승부 (무)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Batters Lineup Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>⚾ 타자 기록 ({batters.length}명)</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      *동일한 닉네임의 선수는 자동으로 누적 집계됩니다
                    </span>
                  </h3>
                  <button
                    onClick={addBatter}
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 타자 추가
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="text-[11px] text-slate-400 bg-slate-900 border-b border-slate-800">
                      <tr>
                        <th className="px-2.5 py-2">타순</th>
                        <th className="px-2.5 py-2">닉네임</th>
                        <th className="px-2.5 py-2">포지션</th>
                        <th className="px-2 py-2">타수</th>
                        <th className="px-2 py-2">안타</th>
                        <th className="px-2 py-2">2루타</th>
                        <th className="px-2 py-2">3루타</th>
                        <th className="px-2 py-2">홈런</th>
                        <th className="px-2 py-2">타점</th>
                        <th className="px-2 py-2">득점</th>
                        <th className="px-2 py-2">볼넷</th>
                        <th className="px-2 py-2">삼진</th>
                        <th className="px-2 py-2">도루</th>
                        <th className="px-2.5 py-2 text-right">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {batters.map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="px-2.5 py-1.5 font-sans text-slate-400">{b.order}번</td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={b.name}
                              onChange={(e) => updateBatter(idx, 'name', e.target.value)}
                              className="w-24 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white font-sans"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={b.position || ''}
                              placeholder="CF"
                              onChange={(e) => updateBatter(idx, 'position', e.target.value)}
                              className="w-14 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-white font-sans text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.AB}
                              onChange={(e) => updateBatter(idx, 'AB', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-white text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.H}
                              onChange={(e) => updateBatter(idx, 'H', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-emerald-400 font-bold text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.doubles}
                              onChange={(e) => updateBatter(idx, 'doubles', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-slate-300 text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.triples}
                              onChange={(e) => updateBatter(idx, 'triples', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-slate-300 text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.HR}
                              onChange={(e) => updateBatter(idx, 'HR', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-amber-400 font-bold text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.RBI}
                              onChange={(e) => updateBatter(idx, 'RBI', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-slate-300 text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.R}
                              onChange={(e) => updateBatter(idx, 'R', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-slate-300 text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.BB}
                              onChange={(e) => updateBatter(idx, 'BB', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-slate-300 text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.SO}
                              onChange={(e) => updateBatter(idx, 'SO', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-rose-400 text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={b.SB}
                              onChange={(e) => updateBatter(idx, 'SB', parseInt(e.target.value, 10) || 0)}
                              className="w-10 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-cyan-400 text-center"
                            />
                          </td>
                          <td className="px-2.5 py-1 text-right">
                            <button
                              onClick={() => setBatters(batters.filter((_, i) => i !== idx))}
                              aria-label="타자 삭제"
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pitchers Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>🎯 투수 기록 ({pitchers.length}명)</span>
                  </h3>
                  <button
                    onClick={addPitcher}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 투수 추가
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="text-[11px] text-slate-400 bg-slate-900 border-b border-slate-800">
                      <tr>
                        <th className="px-2.5 py-2">역할</th>
                        <th className="px-2.5 py-2">닉네임</th>
                        <th className="px-2 py-2">이닝</th>
                        <th className="px-2 py-2">실점</th>
                        <th className="px-2 py-2">자책</th>
                        <th className="px-2 py-2">피안타</th>
                        <th className="px-2 py-2">피홈런</th>
                        <th className="px-2 py-2">사사구</th>
                        <th className="px-2 py-2">탈삼진</th>
                        <th className="px-2 py-2">결과</th>
                        <th className="px-2.5 py-2 text-right">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {pitchers.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="px-2.5 py-1">
                            <select
                              value={p.role}
                              onChange={(e) => updatePitcher(idx, 'role', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white font-sans text-xs"
                            >
                              <option value="SP">SP (선발)</option>
                              <option value="RP">RP (구원)</option>
                              <option value="CP">CP (마무리)</option>
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => updatePitcher(idx, 'name', e.target.value)}
                              className="w-24 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white font-sans"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={p.inningsText}
                              placeholder="5이닝"
                              onChange={(e) => updatePitcher(idx, 'inningsText', e.target.value)}
                              className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={p.runs}
                              onChange={(e) => updatePitcher(idx, 'runs', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-white text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={p.ER}
                              onChange={(e) => updatePitcher(idx, 'ER', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-rose-400 font-bold text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={p.hits}
                              onChange={(e) => updatePitcher(idx, 'hits', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-white text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={p.HR}
                              onChange={(e) => updatePitcher(idx, 'HR', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-amber-400 text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={p.BB}
                              onChange={(e) => updatePitcher(idx, 'BB', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-white text-center"
                            />
                          </td>
                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              value={p.SO}
                              onChange={(e) => updatePitcher(idx, 'SO', parseInt(e.target.value, 10) || 0)}
                              className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-emerald-400 font-bold text-center"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <select
                              value={p.decision || ''}
                              onChange={(e) => updatePitcher(idx, 'decision', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white font-sans text-xs"
                            >
                              <option value="">-</option>
                              <option value="승">승</option>
                              <option value="패">패</option>
                              <option value="홀드">홀드</option>
                              <option value="세이브">세이브</option>
                            </select>
                          </td>
                          <td className="px-2.5 py-1 text-right">
                            <button
                              onClick={() => setPitchers(pitchers.filter((_, i) => i !== idx))}
                              aria-label="투수 삭제"
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-950 border-t border-slate-800">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncToSheets}
              onChange={(e) => setSyncToSheets(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>저장 후 Google Sheets에도 동기화</span>
            {isSheetsConnected && (
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                연결됨
              </span>
            )}
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>경기 기록 저장 및 닉네임 누적</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
