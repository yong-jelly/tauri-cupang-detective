import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getVersion } from "@tauri-apps/api/app";
import { join } from "@tauri-apps/api/path";
import { Database, FolderOutput, Loader2, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import type { DbStatus } from "@shared/api/types";

const TABLE_OPTIONS = ["accounts", "credentials", "metadata"];

type Props = {
  onReady?: (status: DbStatus) => void;
};

const formatTimestamp = (date: Date) => {
  const pad = (v: number, len = 2) => v.toString().padStart(len, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
};

const HeroLayout = ({
  version,
  busyAction,
  error,
  feedback,
  onSelectExisting,
  onCreateNew,
}: {
  version: string | null;
  busyAction: "init" | "load" | null;
  error: string | null;
  feedback: string | null;
  onSelectExisting: () => void;
  onCreateNew: () => void;
}) => {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 overflow-hidden bg-[#fdfbf7] font-mono">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <div className="relative max-w-xl space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#2d2416] bg-[#e9c46a] border-2 border-gray-800 px-4 py-2 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
          <Sparkles className="w-3 h-3" />
          지출 탐정 · private beta
        </div>
        <h2 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">안녕 탐정님, 사건을 파헤쳐볼까요?</h2>
        <p className="text-base text-gray-700 leading-relaxed">
          지출 탐정은 SQLite 파일 하나로 모든 영수증 단서를 보관합니다. 기존 기록을 불러오거나, 새로운 기록을
          만들고 첫 계정을 등록해보세요.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
          <button
            type="button"
            onClick={onSelectExisting}
            disabled={busyAction === "load"}
            className="px-6 py-3 text-sm font-bold uppercase tracking-wider text-gray-800 bg-white border-2 border-gray-800 hover:bg-[#f6f1e9] disabled:opacity-60 transition-colors shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]"
          >
            {busyAction === "load" ? "단서 수집 중..." : "DB 파일 불러오기"}
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            disabled={busyAction === "init"}
            className="px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#fffef0] bg-gray-800 border-2 border-gray-800 hover:bg-gray-700 disabled:bg-gray-400 transition-colors shadow-[4px_4px_0px_0px_rgba(196,154,26,1)]"
          >
            {busyAction === "init" ? "노트 작성 중..." : "새 사건 노트 만들기"}
          </button>
        </div>
        {error && <p className="text-sm text-[#e76f51] font-bold mt-4">{error}</p>}
        {feedback && <p className="text-sm text-[#2a9d8f] font-bold mt-4">{feedback}</p>}
      </div>
      {version && (
        <div className="relative mt-10 text-xs text-gray-500 tracking-[0.3em] uppercase font-bold">
          지출 탐정 · v{version}
        </div>
      )}
    </div>
  );
};

export const SystemSettingsPage = ({ onReady }: Props) => {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [lastBackupAt] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState(TABLE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"init" | "load" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [pendingPath, setPendingPath] = useState<string>("");
  
  // onReady 참조를 안정화하고 초기 마운트 시에만 호출되도록 함
  const onReadyRef = useRef(onReady);
  const initialFetchDoneRef = useRef(false);
  
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(null));
  }, []);

  const updateStatus = useCallback(
    (next: DbStatus, isInitialFetch = false) => {
      setStatus(next);
      // 초기 fetch 시에만 onReady 호출 (무한 루프 방지)
      if (next.configured && next.exists && isInitialFetch) {
        onReadyRef.current?.(next);
      }
    },
    [],
  );

  const fetchStatus = useCallback(async (isInitialFetch = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<DbStatus>("get_db_status");
      updateStatus(result, isInitialFetch);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [updateStatus]);

  useEffect(() => {
    // 초기 마운트 시에만 onReady 호출
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      fetchStatus(true);
    }
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.path) {
      setPendingPath(status.path);
    }
  }, [status?.path]);

  const selectExistingFile = async () => {
    try {
      setBusyAction("load");
      setError(null);
      setFeedback(null);
      const selected = await open({
        multiple: false,
        filters: [
          { name: "SQLite DB", extensions: ["db", "sqlite", "sqlite3"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (!selected || Array.isArray(selected)) {
        setBusyAction(null);
        return;
      }
      const result = await invoke<DbStatus>("load_existing_db", { path: selected });
      updateStatus(result, true); // 사용자 액션이므로 onReady 호출
      setFeedback("기존 데이터베이스를 불러왔습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAction(null);
    }
  };

  const createNewDatabase = async () => {
    try {
      setBusyAction("init");
      setError(null);
      setFeedback(null);
      const directory = await open({
        directory: true,
        multiple: false,
        title: "새 DB를 저장할 폴더를 선택하세요",
      });
      if (!directory || Array.isArray(directory)) {
        setBusyAction(null);
        return;
      }
      const fileName = `my-receipt-tracker-${formatTimestamp(new Date())}.db`;
      const fullPath = await join(directory, fileName);
      const result = await invoke<DbStatus>("init_db", { path: fullPath });
      updateStatus(result, true); // 사용자 액션이므로 onReady 호출
      setFeedback(`새 DB를 생성했습니다: ${fileName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadDb = async () => {
    if (!pendingPath.trim()) {
      setError("경로를 입력해주세요.");
      return;
    }
    try {
      setBusyAction("load");
      setError(null);
      setFeedback(null);
      const result = await invoke<DbStatus>("load_existing_db", { path: pendingPath.trim() });
      updateStatus(result, true); // 사용자 액션이므로 onReady 호출
      setFeedback("데이터베이스를 불러왔습니다.");
      setPendingPath("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAction(null);
    }
  };

  const dbSizeLabel = useMemo(() => {
    if (!status?.sizeBytes) {
      return "—";
    }
    const kb = status.sizeBytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
  }, [status?.sizeBytes]);

  const renderLoading = () => (
    <div className="relative flex flex-col h-screen bg-[#fdfbf7] font-mono">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <header className="relative h-16 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-600 font-bold">System</p>
          <h1 className="text-xl font-bold text-gray-900 font-serif">시스템 설정</h1>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
        <span className="text-sm font-bold uppercase tracking-wider">상태를 불러오는 중...</span>
      </div>
    </div>
  );

  if (loading || !status) {
    return renderLoading();
  }

  if (!status.configured || !status.exists) {
    return (
      <div className="flex flex-col h-screen bg-[#fdfbf7]">
        <div className="flex-1 flex flex-col">
          <HeroLayout
            version={version}
            busyAction={busyAction}
            error={error}
            feedback={feedback}
            onSelectExisting={selectExistingFile}
            onCreateNew={createNewDatabase}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen bg-[#fdfbf7] font-mono">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <header className="relative h-16 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-600 font-bold">System</p>
          <h1 className="text-xl font-bold text-gray-900 font-serif">시스템 설정</h1>
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto p-6 space-y-6">
        {feedback && (
          <div className="px-4 py-3 border-2 border-[#2a9d8f] bg-[#2a9d8f]/10 text-[#264653] text-sm font-bold">
            {feedback}
          </div>
        )}
        {error && (
          <div className="px-4 py-3 border-2 border-[#e76f51] bg-[#e76f51]/10 text-[#e76f51] text-sm font-bold">
            {error}
          </div>
        )}

        <section className="bg-[#fffef0] border-2 border-gray-800 p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#264653] border-2 border-gray-800 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-serif">데이터베이스 요약</h2>
              <p className="text-sm text-gray-600">SQLite 경로와 상태, 최근 백업 정보를 확인합니다.</p>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
            <div className="border-2 border-gray-800 p-4 bg-white">
              <dt className="text-xs font-bold text-gray-600 uppercase tracking-wider">현재 경로</dt>
              <dd className="mt-2 text-sm font-mono text-gray-900 break-all">{status.path}</dd>
            </div>
            <div className="border-2 border-gray-800 p-4 bg-white">
              <dt className="text-xs font-bold text-gray-600 uppercase tracking-wider">파일 크기</dt>
              <dd className="mt-2 text-2xl font-bold text-gray-900 font-mono">{dbSizeLabel}</dd>
              <p className="text-xs text-gray-500 mt-1">DB 상태를 새로고침하면 업데이트됩니다.</p>
            </div>
            <div className="border-2 border-gray-800 p-4 bg-white">
              <dt className="text-xs font-bold text-gray-600 uppercase tracking-wider">최근 백업</dt>
              <dd className="mt-2 text-sm font-bold text-gray-900">{lastBackupAt ?? "없음"}</dd>
              <p className="text-xs text-gray-500 mt-1">백업 실행 시 자동 갱신 예정</p>
            </div>
          </dl>
        </section>

        <section className="bg-[#fffef0] border-2 border-gray-800 p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#9b59b6] border-2 border-gray-800 flex items-center justify-center">
              <FolderOutput className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-serif">DB 위치 설정</h2>
              <p className="text-sm text-gray-600">원하는 경로로 이동하거나 새로 생성할 수 있습니다.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">새 경로</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={pendingPath}
                onChange={(e) => setPendingPath(e.target.value)}
                className="flex-1 border-2 border-gray-800 px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-0"
                placeholder="/Users/kwon/db.sqlite"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-200 border-2 border-gray-400 cursor-not-allowed"
                  disabled
                >
                  찾아보기
                </button>
                <button
                  type="button"
                  onClick={handleLoadDb}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#fffef0] bg-gray-800 border-2 border-gray-800 hover:bg-gray-700 disabled:bg-gray-400 transition-colors shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]"
                  disabled={busyAction === "load"}
                >
                  {busyAction === "load" ? "불러오는 중..." : "경로 저장"}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              추후 Finder/Explorer 연동을 통해 대화형으로 경로를 선택할 수 있도록 확장할 예정입니다.
            </p>
          </div>
        </section>

        <section className="bg-[#fffef0] border-2 border-gray-800 p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#e76f51] border-2 border-gray-800 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-serif">유지보수 도구</h2>
              <p className="text-sm text-gray-600">
                초기화, 백업, 스키마 검증 등 위험 작업을 실행하기 전에 항상 데이터를 백업하세요.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#264653] bg-[#2a9d8f]/20 border-2 border-[#264653] cursor-not-allowed"
              disabled
            >
              백업 생성
            </button>
            <button
              type="button"
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-200 border-2 border-gray-500 cursor-not-allowed"
              disabled
            >
              스키마 초기화
            </button>
            <button
              type="button"
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#e76f51] bg-[#e76f51]/10 border-2 border-[#e76f51] cursor-not-allowed"
              disabled
            >
              DB 초기화
            </button>
          </div>

          <p className="text-xs text-gray-500">
            각 버튼은 Tauri 명령과 연결한 뒤 확인 모달을 거쳐 실행되도록 연결할 예정입니다.
          </p>
        </section>

        <section className="bg-[#fffef0] border-2 border-gray-800 p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-serif">데이터 미리보기</h2>
              <p className="text-sm text-gray-600">
                임시로 최근 레코드를 확인하는 도구입니다. 현재 테이블 목록:{" "}
                {status.tables.length ? (
                  <span className="font-mono text-gray-800 font-bold">{status.tables.join(", ")}</span>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={previewTable}
                onChange={(e) => setPreviewTable(e.target.value)}
                className="border-2 border-gray-800 px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-0"
              >
                {TABLE_OPTIONS.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-200 border-2 border-gray-400 cursor-not-allowed"
                disabled
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
            </div>
          </div>

          <div className="border-2 border-gray-800 bg-white min-h-[240px] flex items-center justify-center text-sm text-gray-500 italic">
            SQLite 연결 후 결과가 여기에 표시됩니다.
          </div>
        </section>
      </div>
    </div>
  );
};

