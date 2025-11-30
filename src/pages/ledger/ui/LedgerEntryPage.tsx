import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { 
  SelectableChip, 
  SelectableCardGroup, 
  ColorPicker, 
  TagInput,
  type ColorOption 
} from "@shared/ui";
import { useLedgerEntry, useCreateLedgerEntry, useUpdateLedgerEntry } from "@features/ledger/entry/hooks";
import type { LedgerEntryInput } from "@features/ledger/shared";

type Step = "type" | "basic" | "category" | "extra" | "confirm";

// 카테고리 정의 (SelectableCardGroup용)
const EXPENSE_CATEGORIES = [
  { id: "food", label: "식비", description: "외식, 식료품, 카페", icon: "🍜" },
  { id: "transport", label: "교통", description: "대중교통, 주유, 택시", icon: "🚗" },
  { id: "housing", label: "주거", description: "월세, 관리비, 공과금", icon: "🏠" },
  { id: "shopping", label: "쇼핑", description: "의류, 생필품, 가전", icon: "🛍️" },
  { id: "leisure", label: "여가", description: "문화, 취미, 여행", icon: "🎮" },
  { id: "medical", label: "의료", description: "병원, 약국", icon: "💊" },
  { id: "education", label: "교육", description: "학원, 도서, 강의", icon: "📚" },
  { id: "finance", label: "금융", description: "보험, 적금, 이자", icon: "🏦" },
  { id: "social", label: "경조사", description: "축의금, 조의금, 선물", icon: "🎁" },
  { id: "etc", label: "기타", description: "분류하기 어려운 것들", icon: "📦" },
];

const INCOME_CATEGORIES = [
  { id: "salary", label: "급여", description: "월급, 상여금", icon: "💵" },
  { id: "side", label: "부수입", description: "프리랜서, 아르바이트", icon: "💼" },
  { id: "investment", label: "투자", description: "배당, 이자 수익", icon: "📈" },
  { id: "gift", label: "용돈/선물", description: "받은 용돈, 선물", icon: "🎀" },
  { id: "refund", label: "환급", description: "세금, 보험 환급", icon: "🔄" },
  { id: "etc", label: "기타", description: "기타 수입", icon: "✨" },
];

// 각 단계별 재미있는 팁/문구
const STEP_TIPS = {
  type: [
    "💡 작은 기록이 모여 큰 그림이 됩니다",
    "🎯 꾸준한 기록이 현명한 소비의 시작!",
    "✨ 오늘의 기록이 내일의 재테크가 돼요",
  ],
  basic: {
    expense: [
      "🤔 정확한 금액이 기억 안 나면 대략적으로!",
      "💭 '라떼 한 잔'도 소중한 기록이에요",
      "📝 나중에 수정할 수 있으니 부담 없이~",
    ],
    income: [
      "🎉 수입이 생겼군요! 축하해요!",
      "💪 열심히 번 돈, 소중하게 기록해요",
      "📊 수입 패턴을 알면 계획이 쉬워져요",
    ],
  },
  category: {
    expense: [
      "🏷️ 카테고리별로 보면 소비 습관이 보여요",
      "📊 어디에 돈을 많이 쓰는지 알 수 있어요",
      "🎨 나만의 분류 기준을 세워보세요",
    ],
    income: [
      "💰 어디서 수입이 들어오는지 파악해봐요",
      "📈 수입원을 다양화하면 안정적이에요",
      "🌱 부수입의 씨앗을 찾아보세요",
    ],
  },
};

const PLATFORMS = [
  { id: "offline", label: "오프라인", description: "매장 직접 방문", icon: "🏪" },
  { id: "online_shopping", label: "온라인 쇼핑몰", description: "쿠팡, 네이버, G마켓 등", icon: "🛒" },
  { id: "social", label: "소셜", description: "인스타, 당근마켓 등", icon: "📱" },
  { id: "app", label: "앱 서비스", description: "배달, 택시 앱 등", icon: "📲" },
  { id: "subscription", label: "구독", description: "넷플릭스, 유튜브 등", icon: "🔄" },
  { id: "etc", label: "기타", description: "그 외", icon: "📦" },
];

const PAYMENT_METHODS = [
  { id: "card", label: "카드", icon: "💳" },
  { id: "cash", label: "현금", icon: "💵" },
  { id: "transfer", label: "계좌이체", icon: "🏦" },
  { id: "point", label: "포인트", icon: "🎁" },
  { id: "etc", label: "기타", icon: "📋" },
];

const COLORS: ColorOption[] = [
  { id: "red", color: "#dc2626", label: "빨강" },
  { id: "orange", color: "#ea580c", label: "주황" },
  { id: "yellow", color: "#ca8a04", label: "노랑" },
  { id: "green", color: "#16a34a", label: "초록" },
  { id: "blue", color: "#2563eb", label: "파랑" },
  { id: "purple", color: "#9333ea", label: "보라" },
];

export const LedgerEntryPage = () => {
  const navigate = useNavigate();
  const { accountId, entryId } = useParams<{ accountId: string; entryId?: string }>();
  const isEditMode = !!entryId;
  
  const { data: existingEntry, isLoading: loadingEntry } = useLedgerEntry(entryId);
  const createEntry = useCreateLedgerEntry();
  const updateEntry = useUpdateLedgerEntry();
  
  const [step, setStep] = useState<Step>(isEditMode ? "basic" : "type");
  const [saving, setSaving] = useState(false);
  
  // 폼 데이터
  const [type, setType] = useState<"income" | "expense" | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState("none");
  
  // 확장 필드
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [merchant, setMerchant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [memo, setMemo] = useState("");
  
  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (existingEntry) {
      setType(existingEntry.type);
      setAmount(existingEntry.amount.toLocaleString());
      setDate(existingEntry.date);
      setTitle(existingEntry.title);
      setCategory(existingEntry.category);
      setTags(existingEntry.tags || []);
      setColor(existingEntry.color || "none");
      setPlatform(existingEntry.platform || "");
      setUrl(existingEntry.url || "");
      setMerchant(existingEntry.merchant || "");
      setPaymentMethod(existingEntry.paymentMethod || "");
      setMemo(existingEntry.memo || "");
    }
  }, [existingEntry]);
  
  if (!accountId) {
    return <div>계정 ID가 필요합니다.</div>;
  }
  
  if (isEditMode && loadingEntry) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c49a1a]" />
      </div>
    );
  }
  
  if (isEditMode && !existingEntry) {
    return <div>항목을 찾을 수 없습니다.</div>;
  }

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  
  // 스텝 정보
  const steps: { key: Step; label: string; number: number }[] = [
    { key: "type", label: "유형", number: 1 },
    { key: "basic", label: "기본 정보", number: 2 },
    { key: "category", label: "카테고리", number: 3 },
    { key: "extra", label: "추가 정보", number: 4 },
    { key: "confirm", label: "확인", number: 5 },
  ];
  
  const currentStepIndex = steps.findIndex(s => s.key === step);
  const currentStepInfo = steps[currentStepIndex];

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case "type":
        return type !== null;
      case "basic":
        return title.trim() !== "" && amount !== "";
      case "category":
        return category !== "";
      case "extra":
        return true; // 선택 사항
      case "confirm":
        return true;
      default:
        return false;
    }
  }, [step, type, title, amount, category]);

  const handleNext = () => {
    if (!canProceed()) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].key);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].key);
    }
  };

  const handleSave = async () => {
    if (!type || !title || !amount || !category || !accountId) return;
    
    setSaving(true);
    
    try {
      const entry: LedgerEntryInput = {
        accountId,
        type,
        amount: parseInt(amount.replace(/,/g, "")),
        date,
        title,
        category,
        platform: platform || undefined,
        url: url || undefined,
        merchant: merchant || undefined,
        paymentMethod: paymentMethod || undefined,
        memo: memo || undefined,
        tags,
        color: color !== "none" ? color : undefined,
      };

      if (isEditMode && entryId) {
        await updateEntry.mutateAsync({ entryId, entry });
      } else {
        await createEntry.mutateAsync({ accountId, entry });
      }
      
      navigate(`/ledger/account/${accountId}`);
    } catch (err) {
      alert("저장에 실패했습니다: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (val: string): string => {
    const num = val.replace(/[^0-9]/g, "");
    return num ? parseInt(num).toLocaleString() : "";
  };

  const getCategoryLabel = (catId: string) => {
    return categories.find(c => c.id === catId)?.label || catId;
  };

  // 입력 필드 공통 스타일
  const inputClass = `
    w-full px-5 py-4 border-2 border-[#2d2416] bg-[#fffef0] text-xl font-bold text-[#2d2416] 
    placeholder-[#8b7355] focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(196,154,26,1)]
  `;

  return (
    <div className="flex-1 h-full overflow-hidden bg-[#fdfbf7] font-mono flex flex-col">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      
      {/* 헤더 */}
      <div className="relative flex-shrink-0 bg-[#2d2416] text-[#fffef0] px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-wide uppercase">
                {isEditMode ? "항목 수정" : "수기 입력"}
              </h1>
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

      {/* 진행 상태 바 */}
      <div className="relative flex-shrink-0 bg-[#f6f1e9] border-b-2 border-[#d4c4a8] px-6 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#8b7355] uppercase tracking-wider">
              {currentStepInfo.number}단계 / {steps.length}단계
            </span>
            <span className="text-xs font-bold text-[#2d2416]">
              {currentStepInfo.label}
            </span>
          </div>
          <div className="h-2 bg-[#d4c4a8] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#c49a1a] transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          
          {/* Step 1: 유형 선택 */}
          {step === "type" && (
            <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
              {/* 환영 메시지 */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c49a1a]/15 border border-[#c49a1a]/30 text-[#8b6914] text-sm font-bold rounded-full">
                  <span className="animate-bounce">📝</span>
                  새로운 기록 시작하기
                </div>
                <h2 className="text-3xl font-black text-[#2d2416] tracking-tight uppercase">
                  오늘 무슨 일이 있었나요?
                </h2>
                <p className="text-[#5c4d3c]">먼저 수입인지 지출인지 알려주세요</p>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setType("expense");
                    setCategory("");
                    setStep("basic");
                  }}
                  className="group p-8 border-2 border-[#2d2416] bg-[#fffef0] hover:border-rose-600 hover:bg-rose-50 hover:shadow-[6px_6px_0px_0px_rgba(225,29,72,0.3)] transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-left">
                      <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">💸</div>
                      <div className="text-2xl font-black text-rose-600 mb-1">지 출</div>
                      <div className="text-sm text-[#5c4d3c]">돈을 썼어요</div>
                      <div className="mt-3 text-xs text-[#8b7355] opacity-0 group-hover:opacity-100 transition-opacity">
                        커피 한 잔도 기록해볼까요? ☕
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-[#8b7355] group-hover:text-rose-600 group-hover:translate-x-1 transition-all mt-2" />
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setType("income");
                    setCategory("");
                    setStep("basic");
                  }}
                  className="group p-8 border-2 border-[#2d2416] bg-[#fffef0] hover:border-emerald-600 hover:bg-emerald-50 hover:shadow-[6px_6px_0px_0px_rgba(5,150,105,0.3)] transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-left">
                      <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">💰</div>
                      <div className="text-2xl font-black text-emerald-600 mb-1">수 입</div>
                      <div className="text-sm text-[#5c4d3c]">돈이 들어왔어요</div>
                      <div className="mt-3 text-xs text-[#8b7355] opacity-0 group-hover:opacity-100 transition-opacity">
                        좋은 소식이네요! 🎉
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-[#8b7355] group-hover:text-emerald-600 group-hover:translate-x-1 transition-all mt-2" />
                  </div>
                </button>
              </div>

              {/* 팁 섹션 */}
              <div className="mt-8 p-4 bg-gradient-to-r from-[#f6f1e9] to-[#fffef0] border border-dashed border-[#c49a1a]/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-sm font-bold text-[#5c4d3c] mb-1">알고 계셨나요?</p>
                    <p className="text-sm text-[#8b7355]">
                      {STEP_TIPS.type[Math.floor(Math.random() * STEP_TIPS.type.length)].replace(/^[^\s]+\s/, '')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 퀵 액션 제안 */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="text-xs text-[#8b7355]">자주 기록하는 것:</span>
                {["☕ 커피", "🍱 점심", "🚌 교통비", "🛒 장보기"].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setType("expense");
                      setCategory("");
                      setStep("basic");
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-[#fffef0] border border-[#d4c4a8] text-[#5c4d3c] hover:border-[#c49a1a] hover:bg-[#c49a1a]/10 transition-colors rounded-full"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 기본 정보 */}
          {step === "basic" && (
            <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
              <div className="text-center space-y-3">
                {/* 유형 표시 배지 */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full ${
                  type === "income" 
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300" 
                    : "bg-rose-100 text-rose-700 border border-rose-300"
                }`}>
                  <span>{type === "income" ? "💰" : "💸"}</span>
                  {type === "income" ? "수입" : "지출"} 기록 중
                </div>
                <h2 className="text-3xl font-black text-[#2d2416] tracking-tight uppercase">
                  {type === "income" ? "어디서 들어왔나요?" : "어디에 썼나요?"}
                </h2>
                <p className="text-[#5c4d3c]">
                  {type === "income" 
                    ? "수입의 출처를 기록해두면 나중에 유용해요" 
                    : "기억이 가물가물해도 괜찮아요, 대략적으로!"}
                </p>
              </div>
              
              <div className="space-y-6">
                {/* 날짜 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#5c4d3c] mb-2 uppercase tracking-wider">
                    <span>📅</span> 언 제?
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className={inputClass}
                  />
                  {/* 오늘/어제 퀵 버튼 */}
                  <div className="flex gap-2 mt-2">
                    <SelectableChip
                      label="오늘"
                      selected={date === new Date().toISOString().split("T")[0]}
                      onClick={() => setDate(new Date().toISOString().split("T")[0])}
                    />
                    <SelectableChip
                      label="어제"
                      selected={date === (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })()}
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setDate(yesterday.toISOString().split("T")[0]);
                      }}
                    />
                  </div>
                </div>
                
                {/* 항목명 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#5c4d3c] mb-2 uppercase tracking-wider">
                    <span>✏️</span> 무엇에? *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={type === "income" ? "예: 월급, 용돈, 환급금..." : "예: 점심 식사, 커피, 택시..."}
                    className={inputClass}
                    autoFocus
                  />
                  {/* 제안 태그 */}
                  {!title && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs text-[#8b7355]">빠른 입력:</span>
                      {(type === "income" 
                        ? ["월급", "용돈", "환급", "이자"]
                        : ["점심", "커피", "택시", "마트"]
                      ).map((suggestion, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setTitle(suggestion)}
                          className="px-2 py-1 text-xs bg-[#f6f1e9] border border-[#d4c4a8] text-[#5c4d3c] hover:border-[#c49a1a] transition-colors rounded"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 금액 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#5c4d3c] mb-2 uppercase tracking-wider">
                    <span>💵</span> 얼마? *
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8b7355] font-bold text-xl">₩</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={e => setAmount(formatAmount(e.target.value))}
                      placeholder="0"
                      className={`${inputClass} pl-12 text-right tabular-nums text-3xl ${
                        type === "income" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    />
                  </div>
                  {/* 금액 퀵 버튼 */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(type === "income"
                      ? ["100,000", "500,000", "1,000,000", "3,000,000"]
                      : ["5,000", "10,000", "30,000", "50,000"]
                    ).map((quickAmount) => (
                      <SelectableChip
                        key={quickAmount}
                        label={`₩${quickAmount}`}
                        selected={amount === quickAmount}
                        onClick={() => setAmount(quickAmount)}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 팁 */}
              {type && (
                <div className="p-3 bg-gradient-to-r from-[#f6f1e9] to-transparent border-l-4 border-[#c49a1a]/50 text-sm text-[#8b7355]">
                  {type === "income" 
                    ? STEP_TIPS.basic.income[Math.floor(Math.random() * STEP_TIPS.basic.income.length)]
                    : STEP_TIPS.basic.expense[Math.floor(Math.random() * STEP_TIPS.basic.expense.length)]
                  }
                </div>
              )}
            </div>
          )}

          {/* Step 3: 카테고리 */}
          {step === "category" && (
            <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
              <div className="text-center space-y-3">
                {/* 입력한 정보 요약 */}
                <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg ${
                  type === "income" ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"
                }`}>
                  <span className={`text-xl font-black tabular-nums ${
                    type === "income" ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {type === "income" ? "+" : "-"}₩{amount}
                  </span>
                  <span className="text-[#5c4d3c] text-sm">· {title}</span>
                </div>
                
                <h2 className="text-3xl font-black text-[#2d2416] tracking-tight uppercase">
                  어떤 종류의 {type === "income" ? "수입" : "지출"}인가요?
                </h2>
                <p className="text-[#5c4d3c]">
                  {type === "income" 
                    ? "수입 종류를 분류해두면 재테크 계획이 쉬워져요" 
                    : "카테고리별로 정리하면 소비 패턴이 한눈에!"}
                </p>
              </div>
              
              <SelectableCardGroup
                options={categories}
                value={category}
                onChange={setCategory}
                columns={2}
              />

              {/* 팁 */}
              <div className="p-3 bg-gradient-to-r from-[#f6f1e9] to-transparent border-l-4 border-[#c49a1a]/50 text-sm text-[#8b7355]">
                {type === "income" 
                  ? STEP_TIPS.category.income[Math.floor(Math.random() * STEP_TIPS.category.income.length)]
                  : STEP_TIPS.category.expense[Math.floor(Math.random() * STEP_TIPS.category.expense.length)]
                }
              </div>
            </div>
          )}

          {/* Step 4: 추가 정보 (선택) */}
          {step === "extra" && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-[#2d2416] tracking-tight uppercase mb-2">
                  더 기록할게 있나요?
                </h2>
                <p className="text-[#5c4d3c] mb-4">필수가 아닙니다. 바로 저장해도 됩니다.</p>
                
                {/* 건너뛰기 강조 버튼 */}
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-dashed border-[#c49a1a] bg-[#c49a1a]/10 text-[#8b6914] font-bold hover:bg-[#c49a1a]/20 transition-colors"
                >
                  <span>→</span>
                  건너뛰고 바로 저장하기
                </button>
              </div>
              
              {/* 구분선 */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-dashed border-[#d4c4a8]" />
                <span className="text-xs text-[#8b7355] uppercase tracking-wider">또는 추가 입력</span>
                <div className="flex-1 border-t border-dashed border-[#d4c4a8]" />
              </div>
              
              <div className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
                {/* 플랫폼 */}
                <div>
                  <label className="block text-sm font-bold text-[#8b7355] mb-3 uppercase tracking-wider">
                    어디서 {type === "income" ? "받았" : "샀"}나요? <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
                  </label>
                  <SelectableCardGroup
                    options={PLATFORMS}
                    value={platform}
                    onChange={setPlatform}
                    columns={3}
                    size="sm"
                    toggleable
                  />
                </div>

                {/* 가맹점 */}
                <div>
                  <label className="block text-sm font-bold text-[#8b7355] mb-2 uppercase tracking-wider">
                    가맹점 / 판매자 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    placeholder="예: 스타벅스 강남점"
                    className={`${inputClass} text-base`}
                  />
                </div>

                {/* 결제 수단 */}
                <div>
                  <label className="block text-sm font-bold text-[#8b7355] mb-3 uppercase tracking-wider">
                    결제 수단 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {PAYMENT_METHODS.map(p => (
                      <SelectableChip
                        key={p.id}
                        label={p.label}
                        icon={p.icon}
                        selected={paymentMethod === p.id}
                        onClick={() => setPaymentMethod(paymentMethod === p.id ? "" : p.id)}
                        size="lg"
                      />
                    ))}
                  </div>
                </div>

                {/* 태그 */}
                <div>
                  <label className="block text-sm font-bold text-[#8b7355] mb-2 uppercase tracking-wider">
                    태그 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
                  </label>
                  <TagInput
                    value={tags}
                    onChange={setTags}
                    maxTags={10}
                  />
                </div>

                {/* 컬러 라벨 */}
                <div>
                  <label className="block text-sm font-bold text-[#8b7355] mb-3 uppercase tracking-wider">
                    컬러 라벨 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
                  </label>
                  <ColorPicker
                    colors={COLORS}
                    value={color}
                    onChange={setColor}
                    showNone
                  />
                </div>

                {/* 메모 */}
                <div>
                  <label className="block text-sm font-bold text-[#8b7355] mb-2 uppercase tracking-wider">
                    메모 <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
                  </label>
                  <textarea
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    placeholder="추가로 기록할 내용..."
                    rows={3}
                    className={`${inputClass} text-base resize-none`}
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-bold text-[#8b7355] mb-2 uppercase tracking-wider">
                    관련 URL <span className="text-[#c49a1a] text-xs font-normal">(선택)</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://..."
                    className={`${inputClass} text-base`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: 확인 */}
          {step === "confirm" && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-[#2d2416] tracking-tight uppercase mb-2">
                  확인해주세요
                </h2>
                <p className="text-[#5c4d3c]">입력한 내용이 맞나요?</p>
              </div>
              
              <div className="bg-[#fffef0] border-2 border-[#2d2416] p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(45,36,22,1)]">
                {/* 유형 & 금액 */}
                <div className="flex items-center justify-between border-b-2 border-dashed border-[#d4c4a8] pb-4">
                  <span className={`text-sm font-bold uppercase tracking-wider px-3 py-1 ${
                    type === "income" 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-rose-100 text-rose-700"
                  }`}>
                    {type === "income" ? "수입" : "지출"}
                  </span>
                  <span className={`text-3xl font-black tabular-nums ${
                    type === "income" ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {type === "income" ? "+" : "-"}₩{amount}
                  </span>
                </div>
                
                {/* 상세 정보 */}
                <div className="space-y-3 text-[#2d2416]">
                  <div className="flex justify-between">
                    <span className="text-[#8b7355]">날짜</span>
                    <span className="font-bold">{date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b7355]">항목</span>
                    <span className="font-bold">{title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b7355]">카테고리</span>
                    <span className="font-bold">{getCategoryLabel(category)}</span>
                  </div>
                  {merchant && (
                    <div className="flex justify-between">
                      <span className="text-[#8b7355]">가맹점</span>
                      <span className="font-bold">{merchant}</span>
                    </div>
                  )}
                  {paymentMethod && (
                    <div className="flex justify-between">
                      <span className="text-[#8b7355]">결제수단</span>
                      <span className="font-bold">{PAYMENT_METHODS.find(p => p.id === paymentMethod)?.label}</span>
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-[#8b7355]">태그</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {tags.map(tag => (
                          <span key={tag} className="text-sm text-[#c49a1a]">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {memo && (
                    <div className="pt-2 border-t border-dashed border-[#d4c4a8]">
                      <span className="text-[#8b7355] text-sm">메모:</span>
                      <p className="text-sm mt-1">{memo}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 네비게이션 - type 단계에서는 숨김 */}
      {step !== "type" && (
        <div className="relative flex-shrink-0 bg-[#f6f1e9] border-t-2 border-[#d4c4a8] px-6 py-4">
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={handlePrev}
              className="flex items-center gap-2 px-5 py-3 border-2 border-[#2d2416] bg-[#fffef0] text-[#2d2416] font-bold uppercase tracking-wider hover:bg-[#e8dcc8] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            
            {step !== "confirm" ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#2d2416] text-[#fffef0] font-bold uppercase tracking-wider hover:bg-[#1a1610] disabled:bg-[#d4c4a8] disabled:text-[#8b7355] disabled:cursor-not-allowed transition-colors shadow-[4px_4px_0px_0px_rgba(196,154,26,1)] disabled:shadow-none"
              >
                {step === "extra" ? "확인하기" : "다음"}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#2d2416] text-[#fffef0] font-bold uppercase tracking-wider hover:bg-[#1a1610] disabled:bg-[#d4c4a8] disabled:text-[#8b7355] disabled:cursor-not-allowed transition-colors shadow-[4px_4px_0px_0px_rgba(196,154,26,1)] disabled:shadow-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    저장하기
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
