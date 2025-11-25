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
      fetchTables(); // 목록 갱신 (행 수 업데이트)
      if (selectedTable === tableName) {
        fetchTableData(tableName, 1); // 데이터 뷰 갱신
      }
    } catch (err) {
      alert(`초기화 실패: ${err}`);
    }
  };

  const totalPages = tableData ? Math.ceil(tableData.totalCount / limit) : 0;

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Left Sidebar: Table List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 border-b border-gray-200 flex items-center px-4 justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-4 h-4" />
            테이블 목록
          </h2>
          <button onClick={fetchTables} className="text-gray-500 hover:text-gray-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-1">
              {tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => handleTableSelect(table.name)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center group transition-colors ${
                    selectedTable === table.name
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="truncate flex-1">{table.name}</div>
                  <div className="text-xs text-gray-400 ml-2">{table.rowCount.toLocaleString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content: Data Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTable ? (
          <>
            <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{selectedTable}</h1>
                {tableData && (
                  <p className="text-sm text-gray-500">
                    총 {tableData.totalCount.toLocaleString()}개 행 중 {(page - 1) * limit + 1}-
                    {Math.min(page * limit, tableData.totalCount)} 표시
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTruncate(selectedTable)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  데이터 초기화
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {dataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : tableData && tableData.columns.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                        <tr>
                          {tableData.columns.map((col) => (
                            <th key={col} className="px-4 py-3">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {tableData.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-4 py-2 text-gray-600 max-w-xs truncate">
                                {typeof cell === "object" && cell !== null ? JSON.stringify(cell) : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {tableData.rows.length === 0 && (
                          <tr>
                            <td colSpan={tableData.columns.length} className="px-4 py-8 text-center text-gray-400">
                              데이터가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  데이터를 불러올 수 없습니다.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="h-14 border-t border-gray-200 bg-white flex items-center justify-center px-6 gap-4 flex-shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || dataLoading}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || dataLoading}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            좌측 목록에서 테이블을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
};

