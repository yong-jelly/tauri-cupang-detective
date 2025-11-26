# 지출 탐정 데이터베이스 스키마

## 테이블 구조

### tbl_setting
시스템 설정 및 메타데이터 저장

```sql
CREATE TABLE IF NOT EXISTS tbl_setting (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**용도:**
- 앱 버전, 마이그레이션 버전
- 기본 환경설정 (예: 자동 백업 주기)
- 온보딩 완료 여부 플래그

**예시 데이터:**
- `app_version`: "0.1.0"
- `migration_version`: "1"
- `onboarding_completed`: "true"

---

### tbl_user
사용자 계정 정보 (네이버, 쿠팡 등)

```sql
CREATE TABLE IF NOT EXISTS tbl_user (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,  -- 'naver', 'coupang'
    alias TEXT NOT NULL,      -- 사용자가 지정한 별칭
    curl TEXT NOT NULL,       -- 원본 cURL 명령어
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**용도:**
- 각 플랫폼 계정의 기본 정보
- cURL 명령어 원본 보관

---

### tbl_credential
계정별 인증 정보 (쿠키, 토큰 등)

```sql
CREATE TABLE IF NOT EXISTS tbl_credential (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,        -- 예: 'Cookie', 'Authorization'
    value TEXT NOT NULL,      -- 실제 값
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES tbl_user(id) ON DELETE CASCADE,
    UNIQUE(user_id, key)
);
```

**용도:**
- cURL에서 파싱된 헤더 정보 저장
- 주로 Cookie, Authorization 등
- user_id와 key 조합으로 유니크 제약

---

### tbl_naver_payment
네이버 페이 결제 정보 (상위 결제 단위)

```sql
CREATE TABLE IF NOT EXISTS tbl_naver_payment (
    -- 내부 PK
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 TEXT NOT NULL,         -- tbl_user(id) FK

    -- 네이버 결제 식별자들
    pay_id                  TEXT NOT NULL,         -- result.payment.id / additionalData.payId
    external_id             TEXT,                  -- 목록의 _id (예: N20250704NP4195791122)
    service_type            TEXT,                  -- SIMPLE_PAYMENT 등

    -- 상태 정보
    status_code             TEXT,                  -- PAYMENT_COMPLETED 등 (status.name)
    status_text             TEXT,                  -- "결제완료" 등 (status.text)
    status_color            TEXT,                  -- BLACK 등

    -- 결제 기본 정보
    paid_at                 TEXT NOT NULL,         -- payment.date (ISO8601 or Timestamp)
    purchaser_name          TEXT,                  -- payment.purchaserName

    -- 가맹점 정보 (merchant)
    merchant_no             TEXT,                  -- 목록의 merchantNo
    merchant_name           TEXT NOT NULL,         -- merchant.name
    merchant_tel            TEXT,                  -- merchant.tel
    merchant_url            TEXT,                  -- merchant.url
    merchant_image_url      TEXT,                  -- merchant.imageUrl
    merchant_payment_id     TEXT,                  -- merchant.paymentId

    -- 서브 가맹점 정보 (subMerchant 있으면 이 쪽 이름/URL을 우선 표시)
    sub_merchant_name       TEXT,
    sub_merchant_url        TEXT,
    sub_merchant_payment_id TEXT,

    -- 세금/해외결제 관련
    is_tax_type             BOOLEAN,               -- merchant.isTaxType
    is_oversea_transfer     BOOLEAN,               -- merchant.isAgreedOverseaTransfer

    -- 결제 상품 요약 정보 (주로 단건 결제 / 대표 상품명)
    product_name            TEXT,                  -- result.product.name 또는 목록 product.name
    product_count           INTEGER,               -- result.product.count
    product_detail_url      TEXT,                  -- 목록 productDetailUrl
    order_detail_url        TEXT,                  -- 목록 orderDetailUrl

    -- 금액 정보 (amount)
    total_amount            INTEGER NOT NULL,      -- amount.totalAmount (최종 결제 금액)
    discount_amount         INTEGER DEFAULT 0,
    cup_deposit_amount      INTEGER DEFAULT 0,
    rest_amount             INTEGER,               -- 목록 product.restAmount (남은 금액/환불잔액 등)

    -- 결제 수단별 금액 (amount.paymentMethod)
    pay_easycard_amount     INTEGER DEFAULT 0,     -- easyCard
    pay_easybank_amount     INTEGER DEFAULT 0,     -- easyBank
    pay_reward_point_amount INTEGER DEFAULT 0,     -- rewardPoint
    pay_charge_point_amount INTEGER DEFAULT 0,     -- chargePoint
    pay_giftcard_amount     INTEGER DEFAULT 0,     -- giftCard

    -- 혜택 정보 (benefit) - 필요 최소만
    benefit_type            TEXT,                  -- AUTO 등
    has_plus_membership     BOOLEAN,
    benefit_waiting_period  INTEGER,               -- waitingPeriod
    benefit_expected_amount INTEGER DEFAULT 0,     -- netBenefitExpectedAmount
    benefit_amount          INTEGER DEFAULT 0,     -- benefitAmount

    -- 기타 부가 플래그 (additionalData 등)
    is_membership               BOOLEAN,
    is_branch                   BOOLEAN,
    is_last_subscription_round  BOOLEAN,
    is_cafe_safe_payment        BOOLEAN,
    merchant_country_code       TEXT,
    merchant_country_name       TEXT,
    application_completed       BOOLEAN,

    -- 타임스탬프
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY(user_id) REFERENCES tbl_user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_naver_payment_pay_id ON tbl_naver_payment (pay_id);
CREATE INDEX IF NOT EXISTS idx_naver_payment_user_id ON tbl_naver_payment (user_id);
```

---

### tbl_naver_payment_item
네이버 페이 결제 상세 항목 (상품 단위)

```sql
CREATE TABLE IF NOT EXISTS tbl_naver_payment_item (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 상위 결제 FK
    payment_id      INTEGER NOT NULL,              -- tbl_naver_payment(id) FK
    
    -- 같은 결제 내 라인 번호 (1부터 부여)
    line_no         INTEGER NOT NULL,

    -- 상품 정보
    product_name    TEXT NOT NULL,                 -- 상세 API의 상품명 / 목록 product.name
    image_url       TEXT,                          -- product.imgUrl
    info_url        TEXT,                          -- product.infoUrl
    quantity        INTEGER NOT NULL DEFAULT 1,    -- 수량
    unit_price      INTEGER,                       -- 단가
    line_amount     INTEGER,                       -- quantity * unit_price, 또는 API에서 주면 그대로
    rest_amount     INTEGER,                       -- 상품 단위로 남은 금액 정보가 있으면 사용

    -- 확장용 메모/비고
    memo            TEXT,

    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY(payment_id) REFERENCES tbl_naver_payment(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_naver_payment_item_payment_line 
    ON tbl_naver_payment_item (payment_id, line_no);
```

---

### tbl_coupang_payment
쿠팡 주문 정보 (상위 주문 단위)

```sql
CREATE TABLE IF NOT EXISTS tbl_coupang_payment (
    -- 내부 PK
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 TEXT NOT NULL,         -- tbl_user(id) FK

    -- 쿠팡 주문 식별자들
    order_id                TEXT NOT NULL,         -- orderId (예: 31100148961467)
    external_id             TEXT,                  -- 외부 식별자 (현재는 orderId와 동일)

    -- 상태 정보
    status_code             TEXT,                  -- 주문 상태 코드 (예: "ORDERED", "CANCELED", "RECEIPTED")
    status_text             TEXT,                  -- 주문 상태 텍스트 (예: "주문완료", "취소됨", "수령완료")
    status_color            TEXT,                  -- 상태 표시 색상

    -- 주문 기본 정보
    ordered_at              TEXT NOT NULL,         -- orderedAt (ISO8601 또는 Timestamp)
    
    -- 가맹점 정보 (vendor)
    merchant_name           TEXT NOT NULL,         -- vendor.vendorName 또는 title (대표 상품명)
    merchant_tel            TEXT,                  -- vendor.repPhoneNum
    merchant_url            TEXT,                  -- 판매자 URL
    merchant_image_url      TEXT,                  -- 판매자 이미지 URL

    -- 주문 상품 요약 정보
    product_name            TEXT,                  -- title (대표 상품명, 예: "[행복미트] 호주산 목초육...")
    product_count           INTEGER,               -- 주문 상품 개수
    product_detail_url      TEXT,                  -- 상품 상세 페이지 URL
    order_detail_url        TEXT,                  -- 주문 상세 페이지 URL

    -- 금액 정보
    total_amount            INTEGER NOT NULL,      -- totalProductPrice 또는 payment.totalPayedAmount (최종 결제 금액)
    discount_amount         INTEGER DEFAULT 0,     -- 할인 금액
    rest_amount             INTEGER,               -- 남은 금액/환불 잔액

    -- 타임스탬프
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY(user_id) REFERENCES tbl_user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_coupang_payment_order_id ON tbl_coupang_payment (order_id);
CREATE INDEX IF NOT EXISTS idx_coupang_payment_user_id ON tbl_coupang_payment (user_id);
```

**용도:**
- 쿠팡 주문의 기본 정보 저장
- 주문 ID 기준으로 중복 방지
- 주문 상태, 금액, 판매자 정보 관리

**예시 데이터:**
- `order_id`: "31100148961467"
- `merchant_name`: "행복미트" 또는 "[행복미트] 호주산 목초육..."
- `total_amount`: 29900
- `ordered_at`: "2025-10-28T12:30:32Z"

---

### tbl_coupang_payment_item
쿠팡 주문 상세 항목 (상품 단위)

```sql
CREATE TABLE IF NOT EXISTS tbl_coupang_payment_item (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 상위 주문 FK
    payment_id      INTEGER NOT NULL,              -- tbl_coupang_payment(id) FK
    
    -- 같은 주문 내 라인 번호 (1부터 부여)
    line_no         INTEGER NOT NULL,

    -- 상품 정보
    product_name    TEXT NOT NULL,                 -- productList[].productName
    image_url       TEXT,                          -- productList[].imagePath
    info_url        TEXT,                          -- 상품 상세 페이지 URL
    quantity        INTEGER NOT NULL DEFAULT 1,    -- productList[].quantity (수량)
    unit_price      INTEGER,                       -- productList[].unitPrice (단가)
    line_amount     INTEGER,                       -- quantity * unit_price 또는 discountedUnitPrice
    rest_amount     INTEGER,                       -- 상품 단위로 남은 금액 정보가 있으면 사용

    -- 확장용 메모/비고
    memo            TEXT,

    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY(payment_id) REFERENCES tbl_coupang_payment(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_coupang_payment_item_payment_line 
    ON tbl_coupang_payment_item (payment_id, line_no);
```

**용도:**
- 주문 내 개별 상품 정보 저장
- 한 주문에 여러 상품이 포함된 경우 각 상품별로 저장
- payment_id와 line_no 조합으로 유니크 제약

**예시 데이터:**
- `product_name`: "[행복미트] 호주산 목초육 소고기 사태살 조각 덩어리..."
- `quantity`: 1
- `unit_price`: 29900
- `line_amount`: 29900

---

## 인덱스

```sql
CREATE INDEX IF NOT EXISTS idx_credential_user_id ON tbl_credential(user_id);
CREATE INDEX IF NOT EXISTS idx_naver_payment_user_id ON tbl_naver_payment(user_id);
CREATE INDEX IF NOT EXISTS idx_coupang_payment_user_id ON tbl_coupang_payment(user_id);
```

---

## 마이그레이션 전략

- 버전 관리는 `tbl_setting`의 `migration_version`으로 추적
- 각 마이그레이션은 순차적으로 실행
- 실패 시 롤백 또는 에러 로깅
