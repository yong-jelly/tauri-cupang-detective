import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Database, Trash2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface TableStat {
  name: string;
  rowCount: number;
}

interface TableDataResponse {
  columns: string[];
  rows: any[][];
  totalCount: number;
}

export const TableManagerPage = () => {
  const [tables, setTables] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  // 데이터 조회 상태
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await invoke<TableStat[]>("get_table_stats");
      setTables(stats);
    } catch (err) {
      console.error("테이블 목록 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const fetchTableData = useCallback(async (tableName: string, currentPage: number) => {
    setDataLoading(true);
    try {
      const result = await invoke<TableDataResponse>("get_table_data", {
        tableName,
        limit,
        offset: (currentPage - 1) * limit,
      });
      setTableData(result);
    } catch (err) {
      console.error("데이터 조회 실패:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, page);
    }
  }, [selectedTable, page, fetchTableData]);

  const handleTableSelect = (tableName: string) => {
    if (selectedTable === tableName) return;
    setSelectedTable(tableName);
    setPage(1);
    setTableData(null);
  };

  const handleTruncate = async (tableName: string) => {
    if (!confirm(`정말 '${tableName}' 테이블의 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await invoke("truncate_table", { tableName });
      alert("테이블이 초기화되었습니다.");
      fetchTables();
      if (selectedTable === tableName) {
        fetchTableData(tableName, 1);
      }
    } catch (err) {
      alert(`초기화 실패: ${err}`);
    }
  };

  const totalPages = tableData ? Math.ceil(tableData.totalCount / limit) : 0;

  return (
    <div className="relative flex h-full bg-[#fdfbf7] overflow-hidden font-mono">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      {/* Left Sidebar: Table List */}
      <div className="relative w-72 bg-[#fffef0] border-r-2 border-gray-800 flex flex-col">
        <div className="h-16 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center px-4 justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider text-sm">
            <Database className="w-4 h-4" />
            테이블 목록
          </h2>
          <button 
            onClick={fetchTables} 
            className="w-8 h-8 flex items-center justify-center border-2 border-gray-800 bg-white hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          ) : (
            <div className="space-y-2">
              {tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => handleTableSelect(table.name)}
                  className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center transition-all border-2 ${
                    selectedTable === table.name
                      ? "bg-gray-800 text-[#fffef0] border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]"
                      : "bg-white text-gray-700 border-gray-800 hover:bg-[#f6f1e9]"
                  }`}
                >
                  <div className="truncate flex-1 font-medium">{table.name}</div>
                  <div className={`text-xs ml-2 px-2 py-0.5 border ${
                    selectedTable === table.name
                      ? "border-[#fffef0]/30 text-[#fffef0]"
                      : "border-gray-400 text-gray-500"
                  }`}>
                    {table.rowCount.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content: Data Viewer */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {selectedTable ? (
          <>
            <div className="h-16 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between px-6 flex-shrink-0">
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-serif">{selectedTable}</h1>
                {tableData && (
                  <p className="text-xs text-gray-600 tracking-wider">
                    총 <span className="font-bold">{tableData.totalCount.toLocaleString()}</span>개 행 중{" "}
                    <span className="font-bold">{(page - 1) * limit + 1}-{Math.min(page * limit, tableData.totalCount)}</span> 표시
                  </p>
                )}
              </div>
              <button
                onClick={() => handleTruncate(selectedTable)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#e76f51] bg-white border-2 border-[#e76f51] hover:bg-[#e76f51]/10 transition-colors shadow-[2px_2px_0px_0px_rgba(231,111,81,0.4)]"
              >
                <Trash2 className="w-4 h-4" />
                데이터 초기화
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {dataLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
                  <span className="text-sm text-gray-600 uppercase tracking-wider font-bold">데이터 로딩 중...</span>
                </div>
              ) : tableData && tableData.columns.length > 0 ? (
                <div className="bg-white border-2 border-gray-800 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-[#f6f1e9] text-gray-800 font-bold border-b-2 border-gray-800 uppercase tracking-wider text-xs">
                        <tr>
                          {tableData.columns.map((col) => (
                            <th key={col} className="px-4 py-3 border-r border-gray-300 last:border-r-0">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-[linear-gradient(transparent_95%,#ede9dd_95%)] bg-[length:100%_2.5rem]">
                        {tableData.rows.map((row, idx) => (
                          <tr 
                            key={idx} 
                            className={`h-10 transition-colors ${
                              idx % 2 === 0 ? "bg-white/80" : "bg-white/60"
                            } hover:bg-yellow-50/70`}
                          >
                            {row.map((cell, cellIdx) => (
                              <td 
                                key={cellIdx} 
                                className="px-4 py-2 text-gray-700 max-w-xs truncate border-r border-gray-200 last:border-r-0"
                              >
                                {typeof cell === "object" && cell !== null ? JSON.stringify(cell) : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {tableData.rows.length === 0 && (
                          <tr>
                            <td colSpan={tableData.columns.length} className="px-4 py-12 text-center text-gray-500 italic">
                              데이터가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 italic">
                  데이터를 불러올 수 없습니다.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="h-14 border-t-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-center px-6 gap-2 flex-shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || dataLoading}
                  className={`p-2 border-2 border-gray-800 transition-colors ${
                    page === 1 || dataLoading
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-4 py-2 bg-white border-2 border-gray-800 font-bold text-sm min-w-[100px] text-center">
                  {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || dataLoading}
                  className={`p-2 border-2 border-gray-800 transition-colors ${
                    page === totalPages || dataLoading
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
            <Database className="w-12 h-12 text-gray-300" />
            <p className="font-serif text-lg italic">좌측 목록에서 테이블을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
};

