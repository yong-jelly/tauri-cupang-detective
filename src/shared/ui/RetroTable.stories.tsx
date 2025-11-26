import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { FileX } from "lucide-react";
import {
  RetroTable,
  RetroTableHeader,
  RetroTableBody,
  RetroTableRow,
  RetroTableHead,
  RetroTableCell,
  RetroTablePagination,
  RetroTableEmpty,
} from "./RetroTable";
import { RetroBadge } from "./RetroBadge";

const meta: Meta<typeof RetroTable> = {
  title: "Shared/UI/RetroTable",
  component: RetroTable,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 테이블 컴포넌트입니다. 헤더, 바디, 로우, 셀 서브컴포넌트와 페이지네이션을 함께 제공합니다.",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RetroTable>;

// 샘플 데이터
const sampleOrders = [
  { id: 1, date: "2024-01-15", item: "무선 이어폰", price: "₩89,000", status: "완료" },
  { id: 2, date: "2024-01-14", item: "USB-C 케이블", price: "₩15,000", status: "배송중" },
  { id: 3, date: "2024-01-13", item: "노트북 거치대", price: "₩45,000", status: "완료" },
  { id: 4, date: "2024-01-12", item: "키보드", price: "₩120,000", status: "취소" },
  { id: 5, date: "2024-01-11", item: "마우스 패드", price: "₩25,000", status: "완료" },
];

export const Default: Story = {
  render: () => (
    <div className="w-[700px]">
      <RetroTable>
        <RetroTableHeader>
          <tr>
            <RetroTableHead>ID</RetroTableHead>
            <RetroTableHead>날짜</RetroTableHead>
            <RetroTableHead>상품명</RetroTableHead>
            <RetroTableHead>가격</RetroTableHead>
            <RetroTableHead>상태</RetroTableHead>
          </tr>
        </RetroTableHeader>
        <RetroTableBody>
          {sampleOrders.map((order, idx) => (
            <RetroTableRow key={order.id} index={idx}>
              <RetroTableCell>{order.id}</RetroTableCell>
              <RetroTableCell>{order.date}</RetroTableCell>
              <RetroTableCell>{order.item}</RetroTableCell>
              <RetroTableCell>{order.price}</RetroTableCell>
              <RetroTableCell>
                <RetroBadge
                  variant={
                    order.status === "완료" ? "success" :
                    order.status === "배송중" ? "warning" : "danger"
                  }
                  size="sm"
                >
                  {order.status}
                </RetroBadge>
              </RetroTableCell>
            </RetroTableRow>
          ))}
        </RetroTableBody>
      </RetroTable>
    </div>
  ),
};

export const WithPagination: Story = {
  render: () => {
    const PaginatedTable = () => {
      const [page, setPage] = useState(1);
      const itemsPerPage = 3;
      const totalPages = Math.ceil(sampleOrders.length / itemsPerPage);
      const currentItems = sampleOrders.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
      );

      return (
        <div className="w-[700px]">
          <RetroTable>
            <RetroTableHeader>
              <tr>
                <RetroTableHead>ID</RetroTableHead>
                <RetroTableHead>날짜</RetroTableHead>
                <RetroTableHead>상품명</RetroTableHead>
                <RetroTableHead>가격</RetroTableHead>
              </tr>
            </RetroTableHeader>
            <RetroTableBody>
              {currentItems.map((order, idx) => (
                <RetroTableRow key={order.id} index={idx}>
                  <RetroTableCell>{order.id}</RetroTableCell>
                  <RetroTableCell>{order.date}</RetroTableCell>
                  <RetroTableCell>{order.item}</RetroTableCell>
                  <RetroTableCell>{order.price}</RetroTableCell>
                </RetroTableRow>
              ))}
            </RetroTableBody>
          </RetroTable>
          <RetroTablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      );
    };

    return <PaginatedTable />;
  },
};

export const EmptyState: Story = {
  render: () => (
    <div className="w-[700px]">
      <RetroTable>
        <RetroTableHeader>
          <tr>
            <RetroTableHead>ID</RetroTableHead>
            <RetroTableHead>날짜</RetroTableHead>
            <RetroTableHead>상품명</RetroTableHead>
            <RetroTableHead>가격</RetroTableHead>
          </tr>
        </RetroTableHeader>
        <RetroTableBody>
          <tr>
            <td colSpan={4}>
              <RetroTableEmpty
                icon={<FileX className="w-8 h-8" />}
                message="검색 결과가 없습니다"
              />
            </td>
          </tr>
        </RetroTableBody>
      </RetroTable>
    </div>
  ),
};

export const NoStripes: Story = {
  render: () => (
    <div className="w-[700px]">
      <RetroTable>
        <RetroTableHeader>
          <tr>
            <RetroTableHead>ID</RetroTableHead>
            <RetroTableHead>날짜</RetroTableHead>
            <RetroTableHead>상품명</RetroTableHead>
            <RetroTableHead>가격</RetroTableHead>
          </tr>
        </RetroTableHeader>
        <RetroTableBody>
          {sampleOrders.slice(0, 3).map((order) => (
            <RetroTableRow key={order.id} striped={false}>
              <RetroTableCell>{order.id}</RetroTableCell>
              <RetroTableCell>{order.date}</RetroTableCell>
              <RetroTableCell>{order.item}</RetroTableCell>
              <RetroTableCell>{order.price}</RetroTableCell>
            </RetroTableRow>
          ))}
        </RetroTableBody>
      </RetroTable>
    </div>
  ),
};

export const DatabaseTable: Story = {
  render: () => {
    const dbData = [
      { id: 1, table: "accounts", rows: 5, size: "12 KB", updated: "2024-01-15 10:30" },
      { id: 2, table: "credentials", rows: 5, size: "8 KB", updated: "2024-01-15 10:30" },
      { id: 3, table: "orders", rows: 1250, size: "2.1 MB", updated: "2024-01-15 09:15" },
      { id: 4, table: "products", rows: 3420, size: "1.8 MB", updated: "2024-01-14 22:00" },
    ];

    return (
      <div className="w-[700px]">
        <RetroTable>
          <RetroTableHeader>
            <tr>
              <RetroTableHead>테이블명</RetroTableHead>
              <RetroTableHead className="text-right">행 수</RetroTableHead>
              <RetroTableHead className="text-right">크기</RetroTableHead>
              <RetroTableHead>최종 수정</RetroTableHead>
            </tr>
          </RetroTableHeader>
          <RetroTableBody>
            {dbData.map((item, idx) => (
              <RetroTableRow key={item.id} index={idx}>
                <RetroTableCell className="font-bold">{item.table}</RetroTableCell>
                <RetroTableCell className="text-right">{item.rows.toLocaleString()}</RetroTableCell>
                <RetroTableCell className="text-right">{item.size}</RetroTableCell>
                <RetroTableCell className="text-gray-500">{item.updated}</RetroTableCell>
              </RetroTableRow>
            ))}
          </RetroTableBody>
        </RetroTable>
      </div>
    );
  },
};

