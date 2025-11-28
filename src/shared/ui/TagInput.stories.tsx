import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TagInput } from "./TagInput";

const meta: Meta<typeof TagInput> = {
  title: "Shared/UI/TagInput",
  component: TagInput,
  parameters: {
    docs: {
      description: {
        component: `
태그 입력 컴포넌트입니다.

## 사용 사례
- 가계부 항목 태그
- 게시물 태그
- 검색 필터
- 카테고리 라벨링

## 특징
- Enter 키 또는 추가 버튼으로 태그 추가
- 클릭으로 태그 삭제
- Backspace로 마지막 태그 삭제
- 최대 태그 개수 제한 옵션
- 중복 방지 옵션
- # 해시태그 표시 옵션
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "object",
      description: "현재 태그 목록",
    },
    placeholder: {
      control: "text",
      description: "입력 필드 플레이스홀더",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    maxTags: {
      control: "number",
      description: "최대 태그 개수",
    },
    allowDuplicates: {
      control: "boolean",
      description: "중복 허용 여부",
    },
    showHashtag: {
      control: "boolean",
      description: "태그 앞에 # 표시 여부",
    },
    addButtonText: {
      control: "text",
      description: "추가 버튼 텍스트",
    },
    onChange: {
      action: "changed",
      description: "태그 변경 이벤트",
    },
  },
};

export default meta;
type Story = StoryObj<typeof TagInput>;

/** 기본 상태 (빈 태그) */
export const Default: Story = {
  render: function DefaultStory() {
    const [tags, setTags] = useState<string[]>([]);
    return (
      <div className="w-96">
        <TagInput value={tags} onChange={setTags} />
      </div>
    );
  },
};

/** 태그가 있는 상태 */
export const WithTags: Story = {
  render: function WithTagsStory() {
    const [tags, setTags] = useState<string[]>(["점심", "회식", "카페"]);
    return (
      <div className="w-96">
        <TagInput value={tags} onChange={setTags} />
      </div>
    );
  },
};

/** 해시태그 없이 */
export const WithoutHashtag: Story = {
  render: function WithoutHashtagStory() {
    const [tags, setTags] = useState<string[]>(["중요", "긴급", "업무"]);
    return (
      <div className="w-96">
        <TagInput value={tags} onChange={setTags} showHashtag={false} />
      </div>
    );
  },
};

/** 최대 태그 개수 제한 */
export const MaxTags: Story = {
  render: function MaxTagsStory() {
    const [tags, setTags] = useState<string[]>(["태그1", "태그2"]);
    return (
      <div className="w-96">
        <TagInput value={tags} onChange={setTags} maxTags={5} />
        <p className="mt-2 text-xs text-gray-500">최대 5개까지 입력 가능</p>
      </div>
    );
  },
};

/** 최대 태그 도달 */
export const MaxTagsReached: Story = {
  render: function MaxTagsReachedStory() {
    const [tags, setTags] = useState<string[]>(["하나", "둘", "셋"]);
    return (
      <div className="w-96">
        <TagInput value={tags} onChange={setTags} maxTags={3} />
      </div>
    );
  },
};

/** 비활성화 상태 */
export const Disabled: Story = {
  render: function DisabledStory() {
    const [tags, setTags] = useState<string[]>(["읽기전용"]);
    return (
      <div className="w-96">
        <TagInput value={tags} onChange={setTags} disabled />
      </div>
    );
  },
};

/** 커스텀 플레이스홀더 */
export const CustomPlaceholder: Story = {
  render: function CustomPlaceholderStory() {
    const [tags, setTags] = useState<string[]>([]);
    return (
      <div className="w-96">
        <TagInput 
          value={tags} 
          onChange={setTags} 
          placeholder="키워드를 입력하세요..."
          addButtonText="등록"
        />
      </div>
    );
  },
};

/** 폼 필드로 사용 */
export const AsFormField: Story = {
  render: function FormFieldStory() {
    const [tags, setTags] = useState<string[]>([]);
    return (
      <div className="w-96">
        <label className="block text-sm font-bold text-[#5c4d3c] mb-2 uppercase tracking-wider">
          태그 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
        </label>
        <TagInput value={tags} onChange={setTags} maxTags={10} />
      </div>
    );
  },
};

/** 인터랙티브 예제: 가계부 태그 */
export const LedgerTags: Story = {
  render: function LedgerTagsStory() {
    const [tags, setTags] = useState<string[]>([]);
    const suggestions = ["식비", "교통", "문화", "쇼핑", "건강"];
    
    return (
      <div className="w-96 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#5c4d3c] mb-2 uppercase tracking-wider">
            태그 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
          </label>
          <TagInput value={tags} onChange={setTags} />
        </div>
        
        {/* 추천 태그 */}
        <div>
          <p className="text-xs text-[#8b7355] mb-2">추천 태그:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions
              .filter((s) => !tags.includes(s))
              .map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setTags([...tags, suggestion])}
                  className="px-2 py-1 text-xs bg-[#f6f1e9] border border-[#d4c4a8] text-[#5c4d3c] hover:border-[#c49a1a] transition-colors rounded"
                >
                  + {suggestion}
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  },
};

/** 인터랙티브 예제: 검색 필터 */
export const SearchFilter: Story = {
  render: function SearchFilterStory() {
    const [tags, setTags] = useState<string[]>(["React", "TypeScript"]);
    
    return (
      <div className="w-[500px] p-4 bg-[#f6f1e9] border border-[#d4c4a8]">
        <h3 className="text-sm font-bold text-[#2d2416] mb-3">기술 스택 필터</h3>
        <TagInput 
          value={tags} 
          onChange={setTags} 
          showHashtag={false}
          placeholder="기술 스택 추가..."
        />
        <p className="mt-3 text-xs text-[#8b7355]">
          선택된 필터로 검색합니다: {tags.join(", ") || "없음"}
        </p>
      </div>
    );
  },
};

