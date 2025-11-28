import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ColorPicker, DEFAULT_COLORS } from "./ColorPicker";

const meta: Meta<typeof ColorPicker> = {
  title: "Shared/UI/ColorPicker",
  component: ColorPicker,
  parameters: {
    docs: {
      description: {
        component: `
컬러 선택 컴포넌트입니다.

## 사용 사례
- 태그/라벨 색상 지정
- 카테고리 색상 설정
- 이벤트/일정 색상 표시
- 테마 색상 선택

## 특징
- 선택 시 확대 + 링 효과 + 체크마크
- "없음" 옵션 지원
- 커스텀 컬러 팔레트 지원
- 3가지 크기 (sm, md, lg)
- 기본 컬러 팔레트 제공 (DEFAULT_COLORS)
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "select",
      options: ["none", "red", "orange", "yellow", "green", "blue", "purple", "pink"],
      description: "선택된 컬러 ID",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    size: {
      control: "radio",
      options: ["sm", "md", "lg"],
      description: "컬러 버튼 크기",
    },
    showNone: {
      control: "boolean",
      description: "\"없음\" 옵션 표시 여부",
    },
    onChange: {
      action: "changed",
      description: "선택 변경 이벤트",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ColorPicker>;

/** 기본 상태 */
export const Default: Story = {
  args: {
    colors: DEFAULT_COLORS,
    value: "none",
    showNone: true,
  },
};

/** 컬러 선택됨 */
export const WithSelection: Story = {
  args: {
    colors: DEFAULT_COLORS,
    value: "blue",
    showNone: true,
  },
};

/** "없음" 옵션 없이 */
export const WithoutNone: Story = {
  args: {
    colors: DEFAULT_COLORS,
    value: "green",
    showNone: false,
  },
};

/** 크기 비교 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-600 mb-2">Small</p>
        <ColorPicker colors={DEFAULT_COLORS} value="red" size="sm" />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Medium (기본)</p>
        <ColorPicker colors={DEFAULT_COLORS} value="blue" size="md" />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Large</p>
        <ColorPicker colors={DEFAULT_COLORS} value="purple" size="lg" />
      </div>
    </div>
  ),
};

/** 비활성화 상태 */
export const Disabled: Story = {
  args: {
    colors: DEFAULT_COLORS,
    value: "yellow",
    disabled: true,
  },
};

/** 커스텀 컬러 팔레트 */
export const CustomColors: Story = {
  args: {
    colors: [
      { id: "pastel-pink", color: "#ffc0cb", label: "파스텔 핑크" },
      { id: "pastel-blue", color: "#aec6cf", label: "파스텔 블루" },
      { id: "pastel-green", color: "#77dd77", label: "파스텔 그린" },
      { id: "pastel-yellow", color: "#fdfd96", label: "파스텔 옐로" },
      { id: "pastel-purple", color: "#b39eb5", label: "파스텔 퍼플" },
    ],
    value: "pastel-blue",
    showNone: true,
  },
};

/** 인터랙티브 예제 */
export const Interactive: Story = {
  render: function InteractiveStory() {
    const [color, setColor] = useState<string>("none");
    
    return (
      <div className="space-y-4">
        <ColorPicker
          colors={DEFAULT_COLORS}
          value={color}
          onChange={setColor}
          showNone
        />
        <div className="text-sm text-gray-600">
          선택된 컬러: <span className="font-bold">{color}</span>
        </div>
        {color !== "none" && (
          <div
            className="w-full h-8 rounded border border-gray-200"
            style={{ 
              backgroundColor: DEFAULT_COLORS.find(c => c.id === color)?.color 
            }}
          />
        )}
      </div>
    );
  },
};

/** 라벨 색상 미리보기 */
export const LabelPreview: Story = {
  render: function LabelPreviewStory() {
    const [color, setColor] = useState<string>("blue");
    
    const selectedColor = DEFAULT_COLORS.find(c => c.id === color);
    
    return (
      <div className="space-y-6">
        <ColorPicker
          colors={DEFAULT_COLORS}
          value={color}
          onChange={setColor}
          showNone={false}
        />
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">미리보기:</span>
          <span
            className="px-3 py-1 text-white text-sm font-bold rounded"
            style={{ backgroundColor: selectedColor?.color }}
          >
            {selectedColor?.label} 라벨
          </span>
        </div>
      </div>
    );
  },
};

/** 폼 필드로 사용 */
export const AsFormField: Story = {
  render: function FormFieldStory() {
    const [color, setColor] = useState<string>("none");
    
    return (
      <div className="w-64 space-y-2">
        <label className="block text-sm font-bold text-[#5c4d3c] uppercase tracking-wider">
          컬러 라벨 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
        </label>
        <ColorPicker
          colors={DEFAULT_COLORS}
          value={color}
          onChange={setColor}
          showNone
        />
      </div>
    );
  },
};

