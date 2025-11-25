import { useCallback, useEffect, useMemo, useState } from "react";
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
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff8f0] via-white to-[#f0f7ff]" />
      <div className="relative max-w-xl space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
          <Sparkles className="w-3 h-3" />
          지출 탐정 · private beta
        </div>
        <h2 className="text-3xl font-bold text-gray-900">안녕 탐정님, 사건을 파헤쳐볼까요?</h2>
        <p className="text-base text-gray-600 leading-relaxed">
          지출 탐정은 SQLite 파일 하나로 모든 영수증 단서를 보관합니다. 기존 사건 기록을 불러오거나, 새로운 수사 노트를
          만들고 첫 계정을 등록해보세요.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onSelectExisting}
            disabled={busyAction === "load"}
            className="px-5 py-3 rounded-xl border border-gray-300 text-gray-800 font-semibold bg-white hover:shadow disabled:opacity-60"
          >
            {busyAction === "load" ? "단서 수집 중..." : "DB 파일 불러오기"}
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            disabled={busyAction === "init"}
            className="px-5 py-3 rounded-xl font-semibold text-white bg-[#1164A3] hover:bg-[#0f558b] shadow disabled:bg-[#96b8d2]"
          >
            {busyAction === "init" ? "노트 작성 중..." : "새 사건 노트 만들기"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {feedback && <p className="text-sm text-green-600">{feedback}</p>}
      </div>
      {version && (
        <div className="relative mt-10 text-xs text-gray-400 tracking-widest uppercase">
          지출 탐정 · v{version}
        </div>
      )}
    </div>
  );
};

export const SystemSettingsPage = ({ onReady }: Props) => {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState(TABLE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"init" | "load" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(null));
  }, []);

  const updateStatus = useCallback(
    (next: DbStatus) => {
      setStatus(next);
      if (next.configured && next.exists) {
        onReady?.(next);
      }
    },
    [onReady],
  );

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<DbStatus>("get_db_status");
      updateStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [updateStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
      updateStatus(result);
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
      updateStatus(result);
      setFeedback(`새 DB를 생성했습니다: ${fileName}`);
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
    <div className="flex flex-col h-full bg-gray-50">
      <header className="h-16 border-b border-gray-200 bg-white flex items-center px-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">System</p>
          <h1 className="text-xl font-semibold text-gray-900">시스템 설정</h1>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          상태를 불러오는 중...
        </div>
      </div>
    </div>
  );

  if (loading || !status) {
    return renderLoading();
  }

  if (!status.configured || !status.exists) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-tr from-[#f4f9ff] to-white">
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
    <div className="flex flex-col h-full bg-gray-50">
      <header className="h-16 border-b border-gray-200 bg-white flex items-center px-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">System</p>
          <h1 className="text-xl font-semibold text-gray-900">시스템 설정</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {feedback && <div className="px-4 py-2 rounded bg-green-50 text-green-700 text-sm">{feedback}</div>}
        {error && <div className="px-4 py-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

        <section className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">데이터베이스 요약</h2>
              <p className="text-sm text-gray-500">SQLite 경로와 상태, 최근 백업 정보를 확인합니다.</p>
            </div>
          </div>

          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <dt className="text-xs font-semibold text-gray-500 uppercase">현재 경로</dt>
              <dd className="mt-2 text-sm font-mono text-gray-900 break-all">{status.path}</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <dt className="text-xs font-semibold text-gray-500 uppercase">파일 크기</dt>
              <dd className="mt-2 text-lg font-semibold text-gray-900">{dbSizeLabel}</dd>
              <p className="text-xs text-gray-500 mt-1">DB 상태를 새로고침하면 업데이트됩니다.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <dt className="text-xs font-semibold text-gray-500 uppercase">최근 백업</dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">{lastBackupAt ?? "없음"}</dd>
              <p className="text-xs text-gray-500 mt-1">백업 실행 시 자동 갱신 예정</p>
            </div>
          </dl>
        </section>

        <section className="bg-white border rounded-lg p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <FolderOutput className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">DB 위치 설정</h2>
              <p className="text-sm text-gray-500">원하는 경로로 이동하거나 새로 생성할 수 있습니다.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">새 경로</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={pendingPath}
                onChange={(e) => setPendingPath(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/Users/kwon/db.sqlite"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
                  disabled
                >
                  찾아보기
                </button>
                <button
                  type="button"
                  onClick={handleLoadDb}
                  className="px-4 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
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

        <section className="bg-white border rounded-lg p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">유지보수 도구</h2>
              <p className="text-sm text-gray-500">
                초기화, 백업, 스키마 검증 등 위험 작업을 실행하기 전에 항상 데이터를 백업하세요.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              className="px-4 py-3 border rounded-lg text-sm font-semibold text-blue-700 border-blue-200 bg-blue-50 cursor-not-allowed"
              disabled
            >
              백업 생성
            </button>
            <button
              type="button"
              className="px-4 py-3 border rounded-lg text-sm font-semibold text-gray-700 border-gray-200 bg-gray-50 cursor-not-allowed"
              disabled
            >
              스키마 초기화
            </button>
            <button
              type="button"
              className="px-4 py-3 border rounded-lg text-sm font-semibold text-red-700 border-red-200 bg-red-50 cursor-not-allowed"
              disabled
            >
              DB 초기화
            </button>
          </div>

          <p className="text-xs text-gray-500">
            각 버튼은 Tauri 명령과 연결한 뒤 확인 모달을 거쳐 실행되도록 연결할 예정입니다.
          </p>
        </section>

        <section className="bg-white border rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">데이터 미리보기</h2>
              <p className="text-sm text-gray-500">
                임시로 최근 레코드를 확인하는 도구입니다. 현재 테이블 목록:{" "}
                {status.tables.length ? (
                  <span className="font-mono text-gray-800">{status.tables.join(", ")}</span>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={previewTable}
                onChange={(e) => setPreviewTable(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TABLE_OPTIONS.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg text-gray-700 border-gray-200 cursor-not-allowed"
                disabled
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
            </div>
          </div>

          <div className="border rounded-lg bg-gray-50 min-h-[240px] flex items-center justify-center text-sm text-gray-400">
            SQLite 연결 후 결과가 여기에 표시됩니다.
          </div>
        </section>
      </div>
    </div>
  );
};

