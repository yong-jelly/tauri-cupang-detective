import { useNavigate, useParams } from "react-router-dom";
import { X, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { useLedgerHistory } from "../hooks";
import { Loader2 } from "lucide-react";

export const LedgerHistoryPanel = () => {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const { data: histories, isLoading } = useLedgerHistory(entryId || "");

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Plus className="w-4 h-4" />;
      case "update":
        return <Edit className="w-4 h-4" />;
      case "delete":
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create":
        return "생성";
      case "update":
        return "수정";
      case "delete":
        return "삭제";
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "update":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "delete":
        return "bg-rose-100 text-rose-700 border-rose-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseSnapshot = (snapshot?: string) => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-[#fdfbf7] font-mono flex flex-col">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />

      {/* 헤더 */}
      <div className="relative flex-shrink-0 bg-[#2d2416] text-[#fffef0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-wide uppercase">변경 이력</h1>
            <p className="text-xs text-[#8b7355] mt-0.5">항목의 모든 변경 사항을 확인할 수 있습니다</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#c49a1a] mx-auto mb-4" />
              <p className="text-[#8b7355]">로딩 중...</p>
            </div>
          ) : !histories || histories.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-40">📜</div>
              <p className="text-[#8b7355]">변경 이력이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {histories.map((history) => {
                const before = parseSnapshot(history.snapshotBefore);
                const after = parseSnapshot(history.snapshotAfter);

                return (
                  <div
                    key={history.id}
                    className="bg-[#fffef0] border-2 border-[#2d2416] shadow-[4px_4px_0px_0px_rgba(45,36,22,1)] p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center gap-2 px-3 py-1 border rounded-full text-sm font-bold ${getActionColor(
                            history.action
                          )}`}
                        >
                          {getActionIcon(history.action)}
                          {getActionLabel(history.action)}
                        </div>
                        <span className="text-xs text-[#8b7355]">
                          {formatDate(history.createdAt)}
                        </span>
                      </div>
                    </div>

                    {history.action === "update" && before && after && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="border-r border-[#d4c4a8] pr-4">
                          <div className="text-xs font-bold text-[#8b7355] uppercase mb-2">
                            변경 전
                          </div>
                          <div className="space-y-1 text-sm">
                            {before.title && (
                              <div>
                                <span className="text-[#8b7355]">항목:</span>{" "}
                                <span className="font-bold text-[#2d2416]">{before.title}</span>
                              </div>
                            )}
                            {before.amount !== undefined && (
                              <div>
                                <span className="text-[#8b7355]">금액:</span>{" "}
                                <span className="font-bold text-[#2d2416]">
                                  ₩{before.amount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {before.category && (
                              <div>
                                <span className="text-[#8b7355]">카테고리:</span>{" "}
                                <span className="font-bold text-[#2d2416]">{before.category}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pl-4">
                          <div className="text-xs font-bold text-[#8b7355] uppercase mb-2">
                            변경 후
                          </div>
                          <div className="space-y-1 text-sm">
                            {after.title && (
                              <div>
                                <span className="text-[#8b7355]">항목:</span>{" "}
                                <span className="font-bold text-[#2d2416]">{after.title}</span>
                              </div>
                            )}
                            {after.amount !== undefined && (
                              <div>
                                <span className="text-[#8b7355]">금액:</span>{" "}
                                <span className="font-bold text-[#2d2416]">
                                  ₩{after.amount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {after.category && (
                              <div>
                                <span className="text-[#8b7355]">카테고리:</span>{" "}
                                <span className="font-bold text-[#2d2416]">{after.category}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {history.action === "create" && after && (
                      <div className="mt-4">
                        <div className="text-xs font-bold text-[#8b7355] uppercase mb-2">
                          생성된 항목
                        </div>
                        <div className="space-y-1 text-sm">
                          {after.title && (
                            <div>
                              <span className="text-[#8b7355]">항목:</span>{" "}
                              <span className="font-bold text-[#2d2416]">{after.title}</span>
                            </div>
                          )}
                          {after.amount !== undefined && (
                            <div>
                              <span className="text-[#8b7355]">금액:</span>{" "}
                              <span className="font-bold text-[#2d2416]">
                                ₩{after.amount.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {history.action === "delete" && before && (
                      <div className="mt-4">
                        <div className="text-xs font-bold text-[#8b7355] uppercase mb-2">
                          삭제된 항목
                        </div>
                        <div className="space-y-1 text-sm">
                          {before.title && (
                            <div>
                              <span className="text-[#8b7355]">항목:</span>{" "}
                              <span className="font-bold text-[#2d2416]">{before.title}</span>
                            </div>
                          )}
                          {before.amount !== undefined && (
                            <div>
                              <span className="text-[#8b7355]">금액:</span>{" "}
                              <span className="font-bold text-[#2d2416]">
                                ₩{before.amount.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



