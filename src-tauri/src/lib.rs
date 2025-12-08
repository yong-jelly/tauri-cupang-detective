use chrono::Utc;
use curl::easy::{Easy, List};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;
use md5;

#[derive(Default)]
struct AppState {
    db_path: Mutex<Option<PathBuf>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DbStatus {
    configured: bool,
    path: String,
    exists: bool,
    size_bytes: Option<u64>,
    tables: Vec<String>,
}

#[derive(Serialize)]
struct ProxyResponse {
    status: u32,
    body: String,
    final_url: Option<String>,
    response_headers: Vec<String>,
    request_headers: Vec<String>,
}

fn set_db_path(state: &AppState, path: PathBuf) {
    let mut guard = state.db_path.lock().expect("failed to lock db_path");
    *guard = Some(path);
}

fn config_file(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    dir.push("config.json");
    Ok(dir)
}

fn load_config_path(app_handle: &AppHandle) -> Result<Option<PathBuf>, String> {
    let file = config_file(app_handle)?;
    if !file.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(&file).map_err(|e| e.to_string())?;
    let value: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    if let Some(path_str) = value.get("dbPath").and_then(|v| v.as_str()) {
        if path_str.is_empty() {
            return Ok(None);
        }
        return Ok(Some(PathBuf::from(path_str)));
    }
    Ok(None)
}

fn save_config_path(app_handle: &AppHandle, path: &Path) -> Result<(), String> {
    let file = config_file(app_handle)?;
    let payload = json!({ "dbPath": path.to_string_lossy() });
    let serialized = serde_json::to_vec_pretty(&payload).map_err(|e| e.to_string())?;
    fs::write(&file, serialized).map_err(|e| e.to_string())
}

fn default_db_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    dir.push("storage");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("tauti.db"))
}

fn configured_db_path(app_handle: &AppHandle, state: &AppState) -> Result<Option<PathBuf>, String> {
    let mut guard = state.db_path.lock().expect("failed to lock db_path");
    if let Some(path) = guard.clone() {
        return Ok(Some(path));
    }
    if let Some(from_config) = load_config_path(app_handle)? {
        *guard = Some(from_config.clone());
        return Ok(Some(from_config));
    }
    Ok(None)
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn run_migrations(path: &Path) -> Result<(), String> {
    ensure_parent(path)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        
        -- 시스템 설정 테이블
        CREATE TABLE IF NOT EXISTS tbl_setting (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- 사용자 계정 테이블
        CREATE TABLE IF NOT EXISTS tbl_user (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            alias TEXT NOT NULL,
            curl TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- 인증 정보 테이블
        CREATE TABLE IF NOT EXISTS tbl_credential (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES tbl_user(id) ON DELETE CASCADE,
            UNIQUE(user_id, key)
        );
        
        -- 인덱스 생성
        CREATE INDEX IF NOT EXISTS idx_credential_user_id ON tbl_credential(user_id);
        
        -- 네이버 페이 결제 정보 테이블
        CREATE TABLE IF NOT EXISTS tbl_naver_payment (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id                 TEXT NOT NULL,
            pay_id                  TEXT NOT NULL,
            external_id             TEXT,
            service_type            TEXT,
            status_code             TEXT,
            status_text             TEXT,
            status_color            TEXT,
            paid_at                 TEXT NOT NULL,
            purchaser_name          TEXT,
            merchant_no             TEXT,
            merchant_name           TEXT NOT NULL,
            merchant_tel            TEXT,
            merchant_url            TEXT,
            merchant_image_url      TEXT,
            merchant_payment_id     TEXT,
            sub_merchant_name       TEXT,
            sub_merchant_url        TEXT,
            sub_merchant_payment_id TEXT,
            is_tax_type             BOOLEAN,
            is_oversea_transfer     BOOLEAN,
            product_name            TEXT,
            product_count           INTEGER,
            product_detail_url      TEXT,
            order_detail_url        TEXT,
            total_amount            INTEGER NOT NULL,
            discount_amount         INTEGER DEFAULT 0,
            cup_deposit_amount      INTEGER DEFAULT 0,
            rest_amount             INTEGER,
            pay_easycard_amount     INTEGER DEFAULT 0,
            pay_easybank_amount     INTEGER DEFAULT 0,
            pay_reward_point_amount INTEGER DEFAULT 0,
            pay_charge_point_amount INTEGER DEFAULT 0,
            pay_giftcard_amount     INTEGER DEFAULT 0,
            benefit_type            TEXT,
            has_plus_membership     BOOLEAN,
            benefit_waiting_period  INTEGER,
            benefit_expected_amount INTEGER DEFAULT 0,
            benefit_amount          INTEGER DEFAULT 0,
            is_membership               BOOLEAN,
            is_branch                   BOOLEAN,
            is_last_subscription_round  BOOLEAN,
            is_cafe_safe_payment        BOOLEAN,
            merchant_country_code       TEXT,
            merchant_country_name       TEXT,
            application_completed       BOOLEAN,
            created_at              TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES tbl_user(id) ON DELETE CASCADE
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS ux_naver_payment_user_pay ON tbl_naver_payment (user_id, pay_id);
        
        -- 네이버 페이 결제 상세 항목 테이블
        CREATE TABLE IF NOT EXISTS tbl_naver_payment_item (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id      INTEGER NOT NULL,
            line_no         INTEGER NOT NULL,
            product_name    TEXT NOT NULL,
            image_url       TEXT,
            info_url        TEXT,
            quantity        INTEGER NOT NULL DEFAULT 1,
            unit_price      INTEGER,
            line_amount     INTEGER,
            rest_amount     INTEGER,
            memo            TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(payment_id) REFERENCES tbl_naver_payment(id) ON DELETE CASCADE
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS ux_naver_payment_item_payment_line 
            ON tbl_naver_payment_item (payment_id, line_no);
        
        -- 쿠팡 주문/결제 정보 테이블
        CREATE TABLE IF NOT EXISTS tbl_coupang_payment (
            -- 내부 PK
            id                          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id                     TEXT NOT NULL,         -- tbl_user(id) FK

            -- 쿠팡 주문 식별자들
            order_id                    TEXT NOT NULL,         -- orderId (예: 31100148961467)
            external_id                 TEXT,                  -- 외부 식별자 (현재는 orderId와 동일)

            -- 상태 정보
            status_code                 TEXT,                  -- 주문 상태 코드 (예: "ORDERED", "CANCELED", "RECEIPTED")
            status_text                 TEXT,                  -- 주문 상태 텍스트 (예: "주문완료", "취소됨", "수령완료")
            status_color                TEXT,                  -- 상태 표시 색상

            -- 주문 기본 정보
            ordered_at                  TEXT NOT NULL,         -- orderedAt (ISO8601)
            paid_at                     TEXT,                  -- 실제 결제 시간 (payment.paidAt)
            
            -- 가맹점 정보 (vendor)
            merchant_name               TEXT NOT NULL,         -- vendor.vendorName 또는 title (대표 상품명)
            merchant_tel                TEXT,                  -- vendor.repPhoneNum
            merchant_url                TEXT,                  -- 판매자 URL
            merchant_image_url          TEXT,                  -- 판매자 이미지 URL

            -- 주문 상품 요약 정보
            product_name                TEXT,                  -- title (대표 상품명)
            product_count               INTEGER,               -- 주문 상품 개수
            product_detail_url          TEXT,                  -- 상품 상세 페이지 URL
            order_detail_url            TEXT,                  -- 주문 상세 페이지 URL

            -- 금액 정보
            total_amount                INTEGER NOT NULL,      -- payment.totalPayedAmount (최종 결제 금액)
            total_order_amount          INTEGER,               -- payment.totalOrderAmount (총 주문 금액)
            total_cancel_amount         INTEGER DEFAULT 0,     -- payment.totalCancelAmount (취소 금액)
            discount_amount             INTEGER DEFAULT 0,     -- 할인 금액
            rest_amount                 INTEGER,               -- 남은 금액/환불 잔액

            -- 결제 수단 정보
            main_pay_type               TEXT,                  -- payment.mainPayType (ROCKET_BALANCE, CARD 등)
            pay_rocket_balance_amount   INTEGER DEFAULT 0,     -- 쿠페이머니 결제 금액
            pay_card_amount             INTEGER DEFAULT 0,     -- 카드 결제 금액
            pay_coupon_amount           INTEGER DEFAULT 0,     -- 쿠폰 결제 금액
            pay_coupang_cash_amount     INTEGER DEFAULT 0,     -- 쿠팡캐시 결제 금액
            pay_rocket_bank_amount      INTEGER DEFAULT 0,     -- 로켓뱅크 결제 금액

            -- WOW 혜택 정보
            wow_instant_discount        INTEGER DEFAULT 0,     -- WOW 즉시 할인 금액
            reward_cash_amount          INTEGER DEFAULT 0,     -- 적립 예정 캐시

            -- 타임스탬프
            created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at                  TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES tbl_user(id) ON DELETE CASCADE
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS ux_coupang_payment_user_order ON tbl_coupang_payment (user_id, order_id);
        
        -- 쿠팡 주문 상세 항목 테이블 (상품 단위)
        CREATE TABLE IF NOT EXISTS tbl_coupang_payment_item (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            
            -- 상위 주문 FK
            payment_id              INTEGER NOT NULL,              -- tbl_coupang_payment(id) FK
            
            -- 같은 주문 내 라인 번호 (1부터 부여)
            line_no                 INTEGER NOT NULL,

            -- 쿠팡 상품 식별자
            product_id              TEXT,                          -- productList[].productId
            vendor_item_id          TEXT,                          -- productList[].vendorItemId

            -- 상품 정보
            product_name            TEXT NOT NULL,                 -- productList[].productName
            image_url               TEXT,                          -- productList[].imagePath
            info_url                TEXT,                          -- 상품 상세 페이지 URL
            brand_name              TEXT,                          -- productList[].brandInfo.brandName
            
            -- 수량 및 금액
            quantity                INTEGER NOT NULL DEFAULT 1,    -- productList[].quantity (수량)
            unit_price              INTEGER,                       -- productList[].unitPrice (원래 단가)
            discounted_unit_price   INTEGER,                       -- productList[].discountedUnitPrice (할인 단가)
            combined_unit_price     INTEGER,                       -- productList[].combinedUnitPrice (최종 단가)
            line_amount             INTEGER,                       -- quantity * combined_unit_price (최종 금액)
            rest_amount             INTEGER,                       -- 상품 단위로 남은 금액 정보

            -- 확장용 메모/비고
            memo                    TEXT,

            created_at              TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(payment_id) REFERENCES tbl_coupang_payment(id) ON DELETE CASCADE
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS ux_coupang_payment_item_payment_line 
            ON tbl_coupang_payment_item (payment_id, line_no);
        
        -- 가계부 계정 테이블
        CREATE TABLE IF NOT EXISTS tbl_ledger_account (
            id TEXT PRIMARY KEY,
            nickname TEXT NOT NULL,
            password_hash TEXT,
            password_expires_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- 가계부 항목 테이블
        CREATE TABLE IF NOT EXISTS tbl_ledger_entry (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            amount INTEGER NOT NULL,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            platform TEXT CHECK(platform IN ('offline', 'online_shopping', 'social', 'app', 'subscription', 'etc')),
            url TEXT,
            merchant TEXT,
            payment_method TEXT,
            memo TEXT,
            color TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(account_id) REFERENCES tbl_ledger_account(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_ledger_entry_account_id ON tbl_ledger_entry(account_id);
        CREATE INDEX IF NOT EXISTS idx_ledger_entry_date ON tbl_ledger_entry(date);
        
        -- 가계부 태그 테이블
        CREATE TABLE IF NOT EXISTS tbl_ledger_tag (
            id TEXT PRIMARY KEY,
            entry_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(entry_id) REFERENCES tbl_ledger_entry(id) ON DELETE CASCADE,
            UNIQUE(entry_id, tag)
        );
        
        CREATE INDEX IF NOT EXISTS idx_ledger_tag_entry_id ON tbl_ledger_tag(entry_id);
        
        -- 가계부 변경 이력 테이블
        CREATE TABLE IF NOT EXISTS tbl_ledger_history (
            id TEXT PRIMARY KEY,
            entry_id TEXT NOT NULL,
            action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
            snapshot_before TEXT,
            snapshot_after TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(entry_id) REFERENCES tbl_ledger_entry(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_ledger_history_entry_id ON tbl_ledger_history(entry_id);
        
        -- 상품 카테고리 마스터 테이블 (미리 정의된 카테고리)
        CREATE TABLE IF NOT EXISTS tbl_category (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            color TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- 상품 메타데이터 테이블 (네이버/쿠팡 통합)
        CREATE TABLE IF NOT EXISTS tbl_product_meta (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            memo TEXT,
            url TEXT,
            rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 10)),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(provider, item_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_product_meta_provider_item ON tbl_product_meta(provider, item_id);
        
        -- 상품-태그 관계 테이블 (자유 입력)
        CREATE TABLE IF NOT EXISTS tbl_product_tag (
            id TEXT PRIMARY KEY,
            meta_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(meta_id) REFERENCES tbl_product_meta(id) ON DELETE CASCADE,
            UNIQUE(meta_id, tag)
        );
        
        CREATE INDEX IF NOT EXISTS idx_product_tag_meta_id ON tbl_product_tag(meta_id);
        CREATE INDEX IF NOT EXISTS idx_product_tag_tag ON tbl_product_tag(tag);
        
        -- 상품-카테고리 관계 테이블
        CREATE TABLE IF NOT EXISTS tbl_product_category (
            id TEXT PRIMARY KEY,
            meta_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(meta_id) REFERENCES tbl_product_meta(id) ON DELETE CASCADE,
            FOREIGN KEY(category_id) REFERENCES tbl_category(id) ON DELETE CASCADE,
            UNIQUE(meta_id, category_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_product_category_meta_id ON tbl_product_category(meta_id);
        CREATE INDEX IF NOT EXISTS idx_product_category_category_id ON tbl_product_category(category_id);
    "#,
    )
    .map_err(|e| e.to_string())?;

    // 기존 테이블에 새 컬럼 추가 (마이그레이션)
    migrate_coupang_tables(&conn)?;
    
    // 기본 카테고리 추가
    seed_default_categories(&conn)?;

    Ok(())
}

// 쿠팡 테이블 마이그레이션: 기존 테이블에 새 컬럼 추가
fn migrate_coupang_tables(conn: &Connection) -> Result<(), String> {
    // tbl_coupang_payment에 새 컬럼 추가
    let payment_columns = vec![
        ("paid_at", "TEXT"),
        ("total_order_amount", "INTEGER"),
        ("total_cancel_amount", "INTEGER DEFAULT 0"),
        ("main_pay_type", "TEXT"),
        ("pay_rocket_balance_amount", "INTEGER DEFAULT 0"),
        ("pay_card_amount", "INTEGER DEFAULT 0"),
        ("pay_coupon_amount", "INTEGER DEFAULT 0"),
        ("pay_coupang_cash_amount", "INTEGER DEFAULT 0"),
        ("pay_rocket_bank_amount", "INTEGER DEFAULT 0"),
        ("wow_instant_discount", "INTEGER DEFAULT 0"),
        ("reward_cash_amount", "INTEGER DEFAULT 0"),
    ];

    for (col_name, col_type) in &payment_columns {
        let sql = format!(
            "ALTER TABLE tbl_coupang_payment ADD COLUMN {} {}",
            col_name, col_type
        );
        // 컬럼이 이미 존재하면 에러가 발생하지만 무시
        let _ = conn.execute(&sql, []);
    }

    // tbl_coupang_payment_item에 새 컬럼 추가
    let item_columns = vec![
        ("product_id", "TEXT"),
        ("vendor_item_id", "TEXT"),
        ("brand_name", "TEXT"),
        ("discounted_unit_price", "INTEGER"),
        ("combined_unit_price", "INTEGER"),
    ];

    for (col_name, col_type) in &item_columns {
        let sql = format!(
            "ALTER TABLE tbl_coupang_payment_item ADD COLUMN {} {}",
            col_name, col_type
        );
        // 컬럼이 이미 존재하면 에러가 발생하지만 무시
        let _ = conn.execute(&sql, []);
    }

    Ok(())
}

// 기본 카테고리 시드 데이터 추가
fn seed_default_categories(conn: &Connection) -> Result<(), String> {
    let default_categories = vec![
        ("cat_food", "식품/음료", "#ef4444"),
        ("cat_fashion", "의류/패션", "#f97316"),
        ("cat_electronics", "전자제품", "#3b82f6"),
        ("cat_living", "생활용품", "#22c55e"),
        ("cat_health", "건강/뷰티", "#ec4899"),
        ("cat_hobby", "취미/레저", "#8b5cf6"),
        ("cat_pet", "반려동물", "#f59e0b"),
        ("cat_etc", "기타", "#6b7280"),
    ];

    for (id, name, color) in default_categories {
        // INSERT OR IGNORE로 이미 존재하면 무시
        conn.execute(
            "INSERT OR IGNORE INTO tbl_category (id, name, color) VALUES (?1, ?2, ?3)",
            rusqlite::params![id, name, color],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn list_tables(path: &Path) -> Result<Vec<String>, String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let mut tables = Vec::new();
    for table in rows {
        tables.push(table.map_err(|e| e.to_string())?);
    }
    Ok(tables)
}

fn build_status(path: &Path, configured: bool) -> Result<DbStatus, String> {
    let exists = path.exists();
    let size_bytes = if exists {
        fs::metadata(path).ok().map(|meta| meta.len())
    } else {
        None
    };
    let tables = if exists {
        list_tables(path)?
    } else {
        Vec::new()
    };
    Ok(DbStatus {
        configured,
        path: path.to_string_lossy().to_string(),
        exists,
        size_bytes,
        tables,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TableStat {
    name: String,
    row_count: i64,
}

#[tauri::command]
fn get_table_stats(app_handle: AppHandle, state: State<AppState>) -> Result<Vec<TableStat>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .map_err(|e| e.to_string())?;
    let tables = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let mut stats = Vec::new();
    for table_result in tables {
        let table_name: String = table_result.map_err(|e| e.to_string())?;
        // 각 테이블의 행 수 조회 (COUNT(*))
        let count: i64 = conn
            .query_row(&format!("SELECT COUNT(*) FROM {}", table_name), [], |row| row.get(0))
            .unwrap_or(0);
            
        stats.push(TableStat {
            name: table_name,
            row_count: count,
        });
    }
    
    Ok(stats)
}

#[tauri::command]
fn truncate_table(app_handle: AppHandle, state: State<AppState>, table_name: String) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    // 안전을 위해 테이블 이름 검증 (SQL Injection 방지 - 간단히 공백/특수문자 체크)
    if table_name.contains(' ') || table_name.contains(';') {
        return Err("유효하지 않은 테이블 이름입니다.".to_string());
    }

    conn.execute(&format!("DELETE FROM {}", table_name), [])
        .map_err(|e| e.to_string())?;
        
    // VACUUM은 선택사항이지만 용량 확보를 위해 실행 가능 (오래 걸릴 수 있음)
    // conn.execute("VACUUM", []).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TableDataResponse {
    columns: Vec<String>,
    rows: Vec<Vec<serde_json::Value>>,
    total_count: i64,
}

#[tauri::command]
fn get_table_data(
    app_handle: AppHandle,
    state: State<AppState>,
    table_name: String,
    limit: i64,
    offset: i64,
) -> Result<TableDataResponse, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;

    if table_name.contains(' ') || table_name.contains(';') {
        return Err("유효하지 않은 테이블 이름입니다.".to_string());
    }

    // 컬럼명 조회
    let stmt = conn
        .prepare(&format!("SELECT * FROM {} LIMIT 0", table_name))
        .map_err(|e| e.to_string())?;
    let columns: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|s| s.to_string())
        .collect();

    // 전체 개수 조회
    let total_count: i64 = conn
        .query_row(&format!("SELECT COUNT(*) FROM {}", table_name), [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // 데이터 조회
    // JSON Value로 변환하기 위해 rusqlite의 dynamic value 처리가 필요함.
    // 여기서는 간단히 serde_json::Value로 변환하는 로직 구현
    let mut stmt = conn
        .prepare(&format!("SELECT * FROM {} LIMIT ?1 OFFSET ?2", table_name))
        .map_err(|e| e.to_string())?;
    
    let column_count = columns.len();
    let rows = stmt
        .query_map(rusqlite::params![limit, offset], |row| {
            let mut record = Vec::new();
            for i in 0..column_count {
                let val = row.get_ref(i)?;
                let json_val = match val {
                    rusqlite::types::ValueRef::Null => serde_json::Value::Null,
                    rusqlite::types::ValueRef::Integer(i) => json!(i),
                    rusqlite::types::ValueRef::Real(f) => json!(f),
                    rusqlite::types::ValueRef::Text(t) => json!(String::from_utf8_lossy(t)),
                    rusqlite::types::ValueRef::Blob(b) => json!(format!("<BLOB {} bytes>", b.len())),
                };
                record.push(json_val);
            }
            Ok(record)
        })
        .map_err(|e| e.to_string())?;

    let mut result_rows = Vec::new();
    for r in rows {
        result_rows.push(r.map_err(|e| e.to_string())?);
    }

    Ok(TableDataResponse {
        columns,
        rows: result_rows,
        total_count,
    })
}

#[tauri::command]
fn get_db_status(app_handle: AppHandle, state: State<AppState>) -> Result<DbStatus, String> {
    if let Some(path) = configured_db_path(&app_handle, &state)? {
        // DB가 존재하면 마이그레이션 실행하여 스키마 최신화
        if path.exists() {
            if let Err(e) = run_migrations(&path) {
                eprintln!("Migration failed: {}", e);
                // 마이그레이션 실패해도 상태는 반환 (에러 로그만 출력)
            }
        }
        build_status(&path, true)
    } else {
        Ok(DbStatus {
            configured: false,
            path: String::new(),
            exists: false,
            size_bytes: None,
            tables: Vec::new(),
        })
    }
}

// 로그아웃: config에서 DB 경로 제거 및 메모리 상태 초기화
#[tauri::command]
fn logout(app_handle: AppHandle, state: State<AppState>) -> Result<(), String> {
    // 메모리 상태 초기화
    {
        let mut guard = state.db_path.lock().expect("failed to lock db_path");
        *guard = None;
    }
    
    // config 파일에서 dbPath 제거
    let file = config_file(&app_handle)?;
    if file.exists() {
        let payload = json!({ "dbPath": "" });
        let serialized = serde_json::to_vec_pretty(&payload).map_err(|e| e.to_string())?;
        fs::write(&file, serialized).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
fn init_db(
    app_handle: AppHandle,
    state: State<AppState>,
    path: Option<String>,
) -> Result<DbStatus, String> {
    let target_path = if let Some(custom) = path {
        PathBuf::from(custom)
    } else {
        default_db_path(&app_handle)?
    };
    run_migrations(&target_path)?;
    save_config_path(&app_handle, &target_path)?;
    set_db_path(&state, target_path.clone());
    build_status(&target_path, true)
}

#[tauri::command]
fn load_existing_db(app_handle: AppHandle, state: State<AppState>, path: String) -> Result<DbStatus, String> {
    let path_buf = PathBuf::from(path);
    if !path_buf.exists() {
        return Err("지정한 경로에 DB 파일이 없습니다.".into());
    }
    run_migrations(&path_buf)?;
    save_config_path(&app_handle, &path_buf)?;
    set_db_path(&state, path_buf.clone());
    build_status(&path_buf, true)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HasUsersResponse {
    has_users: bool,
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct NaverPaymentItem {
    #[serde(default)]
    id: i64,
    line_no: i32,
    product_name: String,
    image_url: Option<String>,
    info_url: Option<String>,
    quantity: i32,
    unit_price: Option<i64>,
    line_amount: Option<i64>,
    rest_amount: Option<i64>,
    memo: Option<String>,
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct NaverPayment {
    pay_id: String,
    external_id: Option<String>,
    service_type: Option<String>,
    status_code: Option<String>,
    status_text: Option<String>,
    status_color: Option<String>,
    paid_at: String,
    purchaser_name: Option<String>,
    merchant_no: Option<String>,
    merchant_name: String,
    merchant_tel: Option<String>,
    merchant_url: Option<String>,
    merchant_image_url: Option<String>,
    merchant_payment_id: Option<String>,
    sub_merchant_name: Option<String>,
    sub_merchant_url: Option<String>,
    sub_merchant_payment_id: Option<String>,
    is_tax_type: Option<bool>,
    is_oversea_transfer: Option<bool>,
    product_name: Option<String>,
    product_count: Option<i32>,
    product_detail_url: Option<String>,
    order_detail_url: Option<String>,
    total_amount: i64,
    discount_amount: Option<i64>,
    cup_deposit_amount: Option<i64>,
    rest_amount: Option<i64>,
    pay_easycard_amount: Option<i64>,
    pay_easybank_amount: Option<i64>,
    pay_reward_point_amount: Option<i64>,
    pay_charge_point_amount: Option<i64>,
    pay_giftcard_amount: Option<i64>,
    benefit_type: Option<String>,
    has_plus_membership: Option<bool>,
    benefit_waiting_period: Option<i32>,
    benefit_expected_amount: Option<i64>,
    benefit_amount: Option<i64>,
    is_membership: Option<bool>,
    is_branch: Option<bool>,
    is_last_subscription_round: Option<bool>,
    is_cafe_safe_payment: Option<bool>,
    merchant_country_code: Option<String>,
    merchant_country_name: Option<String>,
    application_completed: Option<bool>,
    items: Vec<NaverPaymentItem>,
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoupangPaymentItem {
    #[serde(default)]
    id: i64,
    line_no: i32,
    product_id: Option<String>,
    vendor_item_id: Option<String>,
    product_name: String,
    image_url: Option<String>,
    info_url: Option<String>,
    brand_name: Option<String>,
    quantity: i32,
    unit_price: Option<i64>,
    discounted_unit_price: Option<i64>,
    combined_unit_price: Option<i64>,
    line_amount: Option<i64>,
    rest_amount: Option<i64>,
    memo: Option<String>,
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoupangPayment {
    order_id: String,
    external_id: Option<String>,
    status_code: Option<String>,
    status_text: Option<String>,
    status_color: Option<String>,
    ordered_at: String,
    paid_at: Option<String>,
    merchant_name: String,
    merchant_tel: Option<String>,
    merchant_url: Option<String>,
    merchant_image_url: Option<String>,
    product_name: Option<String>,
    product_count: Option<i32>,
    product_detail_url: Option<String>,
    order_detail_url: Option<String>,
    total_amount: i64,
    total_order_amount: Option<i64>,
    total_cancel_amount: Option<i64>,
    discount_amount: Option<i64>,
    rest_amount: Option<i64>,
    main_pay_type: Option<String>,
    pay_rocket_balance_amount: Option<i64>,
    pay_card_amount: Option<i64>,
    pay_coupon_amount: Option<i64>,
    pay_coupang_cash_amount: Option<i64>,
    pay_rocket_bank_amount: Option<i64>,
    wow_instant_discount: Option<i64>,
    reward_cash_amount: Option<i64>,
    items: Vec<CoupangPaymentItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NaverLatestPayment {
    pay_id: String,
    paid_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CoupangLatestPayment {
    order_id: String,
    ordered_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct User {
    id: String,
    provider: String,
    alias: String,
    curl: String,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserListResponse {
    users: Vec<User>,
}

#[tauri::command]
fn has_users(app_handle: AppHandle, state: State<AppState>) -> Result<HasUsersResponse, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(HasUsersResponse { has_users: false });
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM tbl_user", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(HasUsersResponse {
        has_users: count > 0,
    })
}

#[tauri::command]
fn list_users(app_handle: AppHandle, state: State<AppState>) -> Result<UserListResponse, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(UserListResponse { users: Vec::new() });
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, provider, alias, curl, created_at, updated_at FROM tbl_user ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                provider: row.get(1)?,
                alias: row.get(2)?,
                curl: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut users = Vec::new();
    for row in rows {
        users.push(row.map_err(|e| e.to_string())?);
    }
    Ok(UserListResponse { users })
}

#[tauri::command]
fn save_account(
    app_handle: AppHandle,
    state: State<AppState>,
    provider: String,
    alias: String,
    curl: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let user_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO tbl_user (id, provider, alias, curl, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![user_id, provider, alias, curl, now, now],
    )
    .map_err(|e| e.to_string())?;
    
    // 헤더 정보를 tbl_credential에 저장
    for (key, value) in headers {
        let cred_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR REPLACE INTO tbl_credential (id, user_id, key, value, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![cred_id, user_id, key, value, now],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(user_id)
}

#[tauri::command]
fn delete_user(
    app_handle: AppHandle,
    state: State<AppState>,
    id: String,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    // CASCADE로 인해 credential도 자동 삭제됨
    conn.execute("DELETE FROM tbl_user WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn update_user(
    app_handle: AppHandle,
    state: State<AppState>,
    id: String,
    alias: String,
) -> Result<User, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "UPDATE tbl_user SET alias = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![alias, now, id],
    )
    .map_err(|e| e.to_string())?;
    
    // 업데이트된 사용자 정보 반환
    let user = conn.query_row(
        "SELECT id, provider, alias, curl, created_at, updated_at FROM tbl_user WHERE id = ?1",
        [&id],
        |row| {
            Ok(User {
                id: row.get(0)?,
                provider: row.get(1)?,
                alias: row.get(2)?,
                curl: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    ).map_err(|e| e.to_string())?;
    
    Ok(user)
}

#[tauri::command]
fn get_user_credentials(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
) -> Result<HashMap<String, String>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM tbl_credential WHERE user_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([user_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    let mut credentials = HashMap::new();
    for row in rows {
        let (key, value) = row.map_err(|e| e.to_string())?;
        credentials.insert(key, value);
    }
    Ok(credentials)
}

#[tauri::command]
fn update_account_credentials(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
    curl: String,
    headers: HashMap<String, String>,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    
    // cURL 업데이트
    conn.execute(
        "UPDATE tbl_user SET curl = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![curl, now, user_id],
    )
    .map_err(|e| e.to_string())?;
    
    // 기존 credential 삭제
    conn.execute(
        "DELETE FROM tbl_credential WHERE user_id = ?1",
        [&user_id],
    )
    .map_err(|e| e.to_string())?;
    
    // 새로운 헤더 정보를 tbl_credential에 저장
    for (key, value) in headers {
        let cred_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO tbl_credential (id, user_id, key, value, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![cred_id, user_id, key, value, now],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
fn save_naver_payment(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
    payment: NaverPayment,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let mut conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    {
        let now = Utc::now().to_rfc3339();
        
        // 1. 결제 정보 저장 (UPSERT)
        tx.execute(
            "INSERT INTO tbl_naver_payment (
                user_id, pay_id, external_id, service_type, status_code, status_text, status_color,
                paid_at, purchaser_name, merchant_no, merchant_name, merchant_tel, merchant_url,
                merchant_image_url, merchant_payment_id, sub_merchant_name, sub_merchant_url,
                sub_merchant_payment_id, is_tax_type, is_oversea_transfer, product_name,
                product_count, product_detail_url, order_detail_url, total_amount, discount_amount,
                cup_deposit_amount, rest_amount, pay_easycard_amount, pay_easybank_amount,
                pay_reward_point_amount, pay_charge_point_amount, pay_giftcard_amount,
                benefit_type, has_plus_membership, benefit_waiting_period, benefit_expected_amount,
                benefit_amount, is_membership, is_branch, is_last_subscription_round,
                is_cafe_safe_payment, merchant_country_code, merchant_country_name,
                application_completed, created_at, updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18,
                ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34,
                ?35, ?36, ?37, ?38, ?39, ?40, ?41, ?42, ?43, ?44, ?45, ?46, ?47
            )
            ON CONFLICT(user_id, pay_id) DO UPDATE SET
                external_id = excluded.external_id,
                service_type = excluded.service_type,
                status_code = excluded.status_code,
                status_text = excluded.status_text,
                status_color = excluded.status_color,
                updated_at = excluded.updated_at,
                merchant_name = excluded.merchant_name,
                total_amount = excluded.total_amount",
            rusqlite::params![
                user_id, payment.pay_id, payment.external_id, payment.service_type, payment.status_code,
                payment.status_text, payment.status_color, payment.paid_at, payment.purchaser_name,
                payment.merchant_no, payment.merchant_name, payment.merchant_tel, payment.merchant_url,
                payment.merchant_image_url, payment.merchant_payment_id, payment.sub_merchant_name,
                payment.sub_merchant_url, payment.sub_merchant_payment_id, payment.is_tax_type,
                payment.is_oversea_transfer, payment.product_name, payment.product_count,
                payment.product_detail_url, payment.order_detail_url, payment.total_amount,
                payment.discount_amount, payment.cup_deposit_amount, payment.rest_amount,
                payment.pay_easycard_amount, payment.pay_easybank_amount, payment.pay_reward_point_amount,
                payment.pay_charge_point_amount, payment.pay_giftcard_amount, payment.benefit_type,
                payment.has_plus_membership, payment.benefit_waiting_period, payment.benefit_expected_amount,
                payment.benefit_amount, payment.is_membership, payment.is_branch,
                payment.is_last_subscription_round, payment.is_cafe_safe_payment,
                payment.merchant_country_code, payment.merchant_country_name,
                payment.application_completed, now, now
            ],
        ).map_err(|e| e.to_string())?;

        // 저장된 결제의 ID 조회
        let payment_pk: i64 = tx.query_row(
            "SELECT id FROM tbl_naver_payment WHERE user_id = ?1 AND pay_id = ?2",
            rusqlite::params![&user_id, payment.pay_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        // 2. 기존 상품 상세 항목 삭제 후 재생성 (또는 UPSERT)
        // 여기서는 간단히 UPSERT 방식을 사용 (line_no 기준)
        for item in payment.items {
            tx.execute(
                "INSERT INTO tbl_naver_payment_item (
                    payment_id, line_no, product_name, image_url, info_url, quantity,
                    unit_price, line_amount, rest_amount, memo, created_at, updated_at
                ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
                )
                ON CONFLICT(payment_id, line_no) DO UPDATE SET
                    product_name = excluded.product_name,
                    image_url = excluded.image_url,
                    info_url = excluded.info_url,
                    quantity = excluded.quantity,
                    unit_price = excluded.unit_price,
                    line_amount = excluded.line_amount,
                    updated_at = excluded.updated_at",
                rusqlite::params![
                    payment_pk, item.line_no, item.product_name, item.image_url, item.info_url,
                    item.quantity, item.unit_price, item.line_amount, item.rest_amount,
                    item.memo, now, now
                ],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NaverPaymentListItem {
    id: i64,
    pay_id: String,
    external_id: Option<String>,
    service_type: Option<String>,
    status_code: Option<String>,
    status_text: Option<String>,
    status_color: Option<String>,
    paid_at: String,
    purchaser_name: Option<String>,
    merchant_name: String,
    product_name: Option<String>,
    product_count: Option<i32>,
    total_amount: i64,
    discount_amount: Option<i64>,
    items: Vec<NaverPaymentItem>,
}

#[tauri::command]
fn list_naver_payments(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<NaverPaymentListItem>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    
    let mut stmt = conn
        .prepare(
            "SELECT id, pay_id, external_id, service_type, status_code, status_text, status_color,
                    paid_at, purchaser_name, merchant_name, product_name, product_count,
                    total_amount, discount_amount
             FROM tbl_naver_payment
             WHERE user_id = ?1
               AND status_code IN ('PURCHASE_CONFIRMED', 'PAYMENT_COMPLETED', 'DELIVERED', 'PURCHASE_CONFIRM_EXTENDED')
               AND (service_type IS NULL OR service_type NOT IN ('BOOKING', 'CONTENTS'))
             ORDER BY paid_at DESC
             LIMIT ?2 OFFSET ?3"
        )
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map(rusqlite::params![user_id, limit, offset], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, String>(9)?,
                row.get::<_, Option<String>>(10)?,
                row.get::<_, Option<i32>>(11)?,
                row.get::<_, i64>(12)?,
                row.get::<_, Option<i64>>(13)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    
    let mut payments = Vec::new();
    for row_result in rows {
        let (id, pay_id, external_id, service_type, status_code, status_text, status_color,
             paid_at, purchaser_name, merchant_name, product_name, product_count,
             total_amount, discount_amount) = row_result.map_err(|e| e.to_string())?;
        
        // 상세 항목 조회
        let mut item_stmt = conn
            .prepare(
                "SELECT id, line_no, product_name, image_url, info_url, quantity,
                        unit_price, line_amount, rest_amount, memo
                 FROM tbl_naver_payment_item
                 WHERE payment_id = ?1
                 ORDER BY line_no"
            )
            .map_err(|e| e.to_string())?;
        
        let item_rows = item_stmt
            .query_map([id], |row| {
                Ok(NaverPaymentItem {
                    id: row.get(0)?,
                    line_no: row.get(1)?,
                    product_name: row.get(2)?,
                    image_url: row.get(3)?,
                    info_url: row.get(4)?,
                    quantity: row.get(5)?,
                    unit_price: row.get(6)?,
                    line_amount: row.get(7)?,
                    rest_amount: row.get(8)?,
                    memo: row.get(9)?,
                })
            })
            .map_err(|e| e.to_string())?;
        
        let mut items = Vec::new();
        for item_result in item_rows {
            items.push(item_result.map_err(|e| e.to_string())?);
        }
        
        payments.push(NaverPaymentListItem {
            id,
            pay_id,
            external_id,
            service_type,
            status_code,
            status_text,
            status_color,
            paid_at,
            purchaser_name,
            merchant_name,
            product_name,
            product_count,
            total_amount,
            discount_amount,
            items,
        });
    }
    
    Ok(payments)
}

// 쿠팡 결제 목록 조회용 구조체
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CoupangPaymentListItem {
    id: i64,
    order_id: String,
    external_id: Option<String>,
    status_code: Option<String>,
    status_text: Option<String>,
    status_color: Option<String>,
    ordered_at: String,
    paid_at: Option<String>,
    merchant_name: String,
    merchant_tel: Option<String>,
    merchant_url: Option<String>,
    merchant_image_url: Option<String>,
    product_name: Option<String>,
    product_count: Option<i32>,
    total_amount: i64,
    total_order_amount: Option<i64>,
    total_cancel_amount: Option<i64>,
    discount_amount: Option<i64>,
    rest_amount: Option<i64>,
    main_pay_type: Option<String>,
    items: Vec<CoupangPaymentItem>,
}

#[tauri::command]
fn list_coupang_payments(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<CoupangPaymentListItem>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    
    let mut stmt = conn
        .prepare(
            "SELECT id, order_id, external_id, status_code, status_text, status_color,
                    ordered_at, paid_at, merchant_name, merchant_tel, merchant_url, merchant_image_url,
                    product_name, product_count, total_amount, total_order_amount, total_cancel_amount,
                    discount_amount, rest_amount, main_pay_type
             FROM tbl_coupang_payment
             WHERE user_id = ?1
               AND (status_code IS NULL OR status_code != 'CANCELED')
             ORDER BY ordered_at DESC
             LIMIT ?2 OFFSET ?3"
        )
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map(rusqlite::params![user_id, limit, offset], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, String>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, Option<String>>(10)?,
                row.get::<_, Option<String>>(11)?,
                row.get::<_, Option<String>>(12)?,
                row.get::<_, Option<i32>>(13)?,
                row.get::<_, i64>(14)?,
                row.get::<_, Option<i64>>(15)?,
                row.get::<_, Option<i64>>(16)?,
                row.get::<_, Option<i64>>(17)?,
                row.get::<_, Option<i64>>(18)?,
                row.get::<_, Option<String>>(19)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    
    let mut payments = Vec::new();
    for row_result in rows {
        let (id, order_id, external_id, status_code, status_text, status_color,
             ordered_at, paid_at, merchant_name, merchant_tel, merchant_url, merchant_image_url,
             product_name, product_count, total_amount, total_order_amount, total_cancel_amount,
             discount_amount, rest_amount, main_pay_type) = row_result.map_err(|e| e.to_string())?;
        
        // 상세 항목 조회
        let mut item_stmt = conn
            .prepare(
                "SELECT id, line_no, product_id, vendor_item_id, product_name, image_url, info_url,
                        brand_name, quantity, unit_price, discounted_unit_price, combined_unit_price,
                        line_amount, rest_amount, memo
                 FROM tbl_coupang_payment_item
                 WHERE payment_id = ?1
                 ORDER BY line_no"
            )
            .map_err(|e| e.to_string())?;
        
        let item_rows = item_stmt
            .query_map([id], |row| {
                Ok(CoupangPaymentItem {
                    id: row.get(0)?,
                    line_no: row.get(1)?,
                    product_id: row.get(2)?,
                    vendor_item_id: row.get(3)?,
                    product_name: row.get(4)?,
                    image_url: row.get(5)?,
                    info_url: row.get(6)?,
                    brand_name: row.get(7)?,
                    quantity: row.get(8)?,
                    unit_price: row.get(9)?,
                    discounted_unit_price: row.get(10)?,
                    combined_unit_price: row.get(11)?,
                    line_amount: row.get(12)?,
                    rest_amount: row.get(13)?,
                    memo: row.get(14)?,
                })
            })
            .map_err(|e| e.to_string())?;
        
        let mut items = Vec::new();
        for item_result in item_rows {
            items.push(item_result.map_err(|e| e.to_string())?);
        }
        
        payments.push(CoupangPaymentListItem {
            id,
            order_id,
            external_id,
            status_code,
            status_text,
            status_color,
            ordered_at,
            paid_at,
            merchant_name,
            merchant_tel,
            merchant_url,
            merchant_image_url,
            product_name,
            product_count,
            total_amount,
            total_order_amount,
            total_cancel_amount,
            discount_amount,
            rest_amount,
            main_pay_type,
            items,
        });
    }
    
    Ok(payments)
}

#[tauri::command]
fn save_coupang_payment(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
    payment: CoupangPayment,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let mut conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    {
        let now = Utc::now().to_rfc3339();
        
        // 1. 결제 정보 저장 (UPSERT)
        tx.execute(
            "INSERT INTO tbl_coupang_payment (
                user_id, order_id, external_id, status_code, status_text, status_color,
                ordered_at, paid_at, merchant_name, merchant_tel, merchant_url, merchant_image_url,
                product_name, product_count, product_detail_url, order_detail_url,
                total_amount, total_order_amount, total_cancel_amount, discount_amount, rest_amount,
                main_pay_type, pay_rocket_balance_amount, pay_card_amount, pay_coupon_amount,
                pay_coupang_cash_amount, pay_rocket_bank_amount, wow_instant_discount, reward_cash_amount,
                created_at, updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31
            )
            ON CONFLICT(user_id, order_id) DO UPDATE SET
                external_id = excluded.external_id,
                status_code = excluded.status_code,
                status_text = excluded.status_text,
                status_color = excluded.status_color,
                ordered_at = excluded.ordered_at,
                paid_at = excluded.paid_at,
                merchant_name = excluded.merchant_name,
                merchant_tel = excluded.merchant_tel,
                merchant_url = excluded.merchant_url,
                merchant_image_url = excluded.merchant_image_url,
                product_name = excluded.product_name,
                product_count = excluded.product_count,
                product_detail_url = excluded.product_detail_url,
                order_detail_url = excluded.order_detail_url,
                total_amount = excluded.total_amount,
                total_order_amount = excluded.total_order_amount,
                total_cancel_amount = excluded.total_cancel_amount,
                discount_amount = excluded.discount_amount,
                rest_amount = excluded.rest_amount,
                main_pay_type = excluded.main_pay_type,
                pay_rocket_balance_amount = excluded.pay_rocket_balance_amount,
                pay_card_amount = excluded.pay_card_amount,
                pay_coupon_amount = excluded.pay_coupon_amount,
                pay_coupang_cash_amount = excluded.pay_coupang_cash_amount,
                pay_rocket_bank_amount = excluded.pay_rocket_bank_amount,
                wow_instant_discount = excluded.wow_instant_discount,
                reward_cash_amount = excluded.reward_cash_amount,
                updated_at = excluded.updated_at",
            rusqlite::params![
                user_id, payment.order_id, payment.external_id, payment.status_code,
                payment.status_text, payment.status_color, payment.ordered_at, payment.paid_at,
                payment.merchant_name, payment.merchant_tel, payment.merchant_url,
                payment.merchant_image_url, payment.product_name, payment.product_count,
                payment.product_detail_url, payment.order_detail_url, payment.total_amount,
                payment.total_order_amount, payment.total_cancel_amount, payment.discount_amount,
                payment.rest_amount, payment.main_pay_type, payment.pay_rocket_balance_amount,
                payment.pay_card_amount, payment.pay_coupon_amount, payment.pay_coupang_cash_amount,
                payment.pay_rocket_bank_amount, payment.wow_instant_discount, payment.reward_cash_amount,
                now, now
            ],
        ).map_err(|e| e.to_string())?;

        // 저장된 결제의 ID 조회
        let payment_pk: i64 = tx.query_row(
            "SELECT id FROM tbl_coupang_payment WHERE user_id = ?1 AND order_id = ?2",
            rusqlite::params![&user_id, &payment.order_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        // 2. 결제 항목 UPSERT
        for item in payment.items {
            tx.execute(
                "INSERT INTO tbl_coupang_payment_item (
                    payment_id, line_no, product_id, vendor_item_id, product_name, image_url, info_url,
                    brand_name, quantity, unit_price, discounted_unit_price, combined_unit_price,
                    line_amount, rest_amount, memo, created_at, updated_at
                ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17
                )
                ON CONFLICT(payment_id, line_no) DO UPDATE SET
                    product_id = excluded.product_id,
                    vendor_item_id = excluded.vendor_item_id,
                    product_name = excluded.product_name,
                    image_url = excluded.image_url,
                    info_url = excluded.info_url,
                    brand_name = excluded.brand_name,
                    quantity = excluded.quantity,
                    unit_price = excluded.unit_price,
                    discounted_unit_price = excluded.discounted_unit_price,
                    combined_unit_price = excluded.combined_unit_price,
                    line_amount = excluded.line_amount,
                    rest_amount = excluded.rest_amount,
                    memo = excluded.memo,
                    updated_at = excluded.updated_at",
                rusqlite::params![
                    payment_pk, item.line_no, item.product_id, item.vendor_item_id, item.product_name,
                    item.image_url, item.info_url, item.brand_name, item.quantity, item.unit_price,
                    item.discounted_unit_price, item.combined_unit_price, item.line_amount,
                    item.rest_amount, item.memo, now, now
                ],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResultItem {
    id: i64,
    provider: String,
    product_name: String,
    image_url: Option<String>,
    merchant_name: String,
    paid_at: String,
    quantity: i64,
    unit_price: Option<i64>,
    line_amount: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResponse {
    items: Vec<SearchResultItem>,
    total: i64,
}

#[tauri::command]
fn search_products(
    app_handle: AppHandle,
    state: State<AppState>,
    query: String,
    limit: Option<i64>,
) -> Result<SearchResponse, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(SearchResponse { items: vec![], total: 0 });
    }
    
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let search_term = format!("%{}%", query);
    let result_limit = limit.unwrap_or(50);
    
    let mut items = Vec::new();
    
    // 네이버 결제 항목 검색 (실제 거래만: 구매확정, 결제완료, 배송완료, 구매확정연장)
    let mut naver_stmt = conn.prepare(
        "SELECT i.id, i.product_name, i.image_url, p.merchant_name, p.paid_at, 
                i.quantity, i.unit_price, i.line_amount
         FROM tbl_naver_payment_item i
         JOIN tbl_naver_payment p ON i.payment_id = p.id
         WHERE i.product_name LIKE ?1
           AND p.status_code IN ('PURCHASE_CONFIRMED', 'PAYMENT_COMPLETED', 'DELIVERED', 'PURCHASE_CONFIRM_EXTENDED')
         ORDER BY p.paid_at DESC
         LIMIT ?2"
    ).map_err(|e| e.to_string())?;
    
    let naver_rows = naver_stmt.query_map(rusqlite::params![&search_term, result_limit], |row| {
        Ok(SearchResultItem {
            id: row.get(0)?,
            provider: "naver".to_string(),
            product_name: row.get(1)?,
            image_url: row.get(2)?,
            merchant_name: row.get(3)?,
            paid_at: row.get(4)?,
            quantity: row.get(5)?,
            unit_price: row.get(6)?,
            line_amount: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;
    
    for row in naver_rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    
    // 쿠팡 결제 항목 검색 (CANCELED 상태 제외)
    let mut coupang_stmt = conn.prepare(
        "SELECT i.id, i.product_name, i.image_url, p.merchant_name, p.ordered_at,
                i.quantity, i.unit_price, i.line_amount
         FROM tbl_coupang_payment_item i
         JOIN tbl_coupang_payment p ON i.payment_id = p.id
         WHERE i.product_name LIKE ?1
           AND (p.status_code IS NULL OR p.status_code != 'CANCELED')
         ORDER BY p.ordered_at DESC
         LIMIT ?2"
    ).map_err(|e| e.to_string())?;
    
    let coupang_rows = coupang_stmt.query_map(rusqlite::params![&search_term, result_limit], |row| {
        Ok(SearchResultItem {
            id: row.get(0)?,
            provider: "coupang".to_string(),
            product_name: row.get(1)?,
            image_url: row.get(2)?,
            merchant_name: row.get(3)?,
            paid_at: row.get(4)?,
            quantity: row.get(5)?,
            unit_price: row.get(6)?,
            line_amount: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;
    
    for row in coupang_rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    
    // 날짜순 정렬
    items.sort_by(|a, b| b.paid_at.cmp(&a.paid_at));
    
    let total = items.len() as i64;
    
    // limit 적용
    if items.len() > result_limit as usize {
        items.truncate(result_limit as usize);
    }
    
    Ok(SearchResponse { items, total })
}

#[tauri::command]
fn get_last_naver_payment(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
) -> Result<Option<NaverLatestPayment>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(None);
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT pay_id, paid_at 
             FROM tbl_naver_payment 
             WHERE user_id = ?1 
             ORDER BY paid_at DESC 
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query(rusqlite::params![user_id])
        .map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(NaverLatestPayment {
            pay_id: row.get(0).map_err(|e| e.to_string())?,
            paid_at: row.get(1).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn get_last_coupang_payment(
    app_handle: AppHandle,
    state: State<AppState>,
    user_id: String,
) -> Result<Option<CoupangLatestPayment>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(None);
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT order_id, ordered_at 
             FROM tbl_coupang_payment 
             WHERE user_id = ?1 
             ORDER BY ordered_at DESC 
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query(rusqlite::params![user_id])
        .map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(CoupangLatestPayment {
            order_id: row.get(0).map_err(|e| e.to_string())?,
            ordered_at: row.get(1).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn proxy_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<ProxyResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut easy = Easy::new();
        easy.url(&url).map_err(|e| e.to_string())?;
        easy.follow_location(true).map_err(|e| e.to_string())?;
        easy.accept_encoding("").map_err(|e| e.to_string())?;

        easy.cookie_file("").map_err(|e| e.to_string())?; // enable cookie engine in memory

        let payload_bytes = body.map(|b| b.into_bytes());

        match method.as_str() {
            "POST" => {
                easy.post(true).map_err(|e| e.to_string())?;
                if let Some(ref bytes) = payload_bytes {
                    easy.post_fields_copy(bytes).map_err(|e| e.to_string())?;
                }
            }
            "PUT" => {
                easy.custom_request("PUT").map_err(|e| e.to_string())?;
            }
            "DELETE" => {
                easy.custom_request("DELETE").map_err(|e| e.to_string())?;
            }
            _ => {} // GET by default
        }

        let mut header_list = List::new();
        let mut cookie_header: Option<String> = None;
        let mut request_headers: Vec<String> = Vec::new();

        for (key, value) in headers {
            if key.eq_ignore_ascii_case("cookie") {
                cookie_header = Some(value);
            } else {
                let header_line = format!("{key}: {value}");
                header_list
                    .append(&header_line)
                    .map_err(|e| e.to_string())?;
                request_headers.push(header_line);
            }
        }

        if let Some(cookies) = cookie_header {
            let cookie_line = format!("Cookie: {cookies}");
            header_list
                .append(&cookie_line)
                .map_err(|e| e.to_string())?;
            request_headers.push(cookie_line);
        }

        easy.http_headers(header_list).map_err(|e| e.to_string())?;

        let mut response_body = Vec::<u8>::new();
        let mut response_headers = Vec::<String>::new();
        {
            let mut transfer = easy.transfer();
            transfer
                .header_function(|data| {
                    if let Ok(line) = std::str::from_utf8(data) {
                        response_headers.push(line.trim_end().to_string());
                    }
                    true
                })
                .map_err(|e| e.to_string())?;
            transfer
                .write_function(|data| {
                    response_body.extend_from_slice(data);
                    Ok(data.len())
                })
                .map_err(|e| e.to_string())?;
            transfer.perform().map_err(|e| e.to_string())?;
        }

        let status = easy.response_code().map_err(|e| e.to_string())?;
        let final_url = easy
            .effective_url()
            .map_err(|e| e.to_string())?
            .map(|u| u.to_string());

        Ok(ProxyResponse {
            status,
            body: String::from_utf8_lossy(&response_body).into_owned(),
            final_url,
            response_headers,
            request_headers,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ========== 가계부 관련 구조체 및 함수 ==========

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LedgerAccount {
    id: String,
    nickname: String,
    password_hash: Option<String>,
    password_expires_at: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LedgerEntry {
    id: String,
    account_id: String,
    r#type: String,
    amount: i64,
    date: String,
    title: String,
    category: String,
    platform: Option<String>,
    url: Option<String>,
    merchant: Option<String>,
    payment_method: Option<String>,
    memo: Option<String>,
    color: Option<String>,
    tags: Vec<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LedgerEntryInput {
    account_id: String,
    r#type: String,
    amount: i64,
    date: String,
    title: String,
    category: String,
    platform: Option<String>,
    url: Option<String>,
    merchant: Option<String>,
    payment_method: Option<String>,
    memo: Option<String>,
    color: Option<String>,
    tags: Vec<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LedgerHistory {
    id: String,
    entry_id: String,
    action: String,
    snapshot_before: Option<String>,
    snapshot_after: Option<String>,
    created_at: String,
}

fn hash_password(password: &str) -> String {
    let digest = md5::compute(password.as_bytes());
    format!("{:x}", digest)
}

fn check_and_reset_expired_passwords(conn: &Connection) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE tbl_ledger_account 
         SET password_hash = NULL, password_expires_at = NULL, updated_at = ?1 
         WHERE password_expires_at IS NOT NULL AND password_expires_at < ?1",
        [&now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_ledger_account(
    app_handle: AppHandle,
    state: State<AppState>,
    nickname: String,
    password: Option<String>,
) -> Result<LedgerAccount, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&conn)?;
    
    let account_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    let password_hash = password.map(|p| hash_password(&p));
    let password_expires_at = password_hash.as_ref().map(|_| {
        let expires = Utc::now() + chrono::Duration::days(30);
        expires.to_rfc3339()
    });
    
    conn.execute(
        "INSERT INTO tbl_ledger_account (id, nickname, password_hash, password_expires_at, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![account_id, nickname, password_hash, password_expires_at, now, now],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(LedgerAccount {
        id: account_id,
        nickname,
        password_hash,
        password_expires_at,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn list_ledger_accounts(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<Vec<LedgerAccount>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&conn)?;
    
    let mut stmt = conn
        .prepare("SELECT id, nickname, password_hash, password_expires_at, created_at, updated_at FROM tbl_ledger_account ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LedgerAccount {
                id: row.get(0)?,
                nickname: row.get(1)?,
                password_hash: row.get(2)?,
                password_expires_at: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut accounts = Vec::new();
    for row in rows {
        accounts.push(row.map_err(|e| e.to_string())?);
    }
    Ok(accounts)
}

#[tauri::command]
fn verify_ledger_password(
    app_handle: AppHandle,
    state: State<AppState>,
    account_id: String,
    password: String,
) -> Result<bool, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&conn)?;
    
    let password_hash = hash_password(&password);
    let stored_hash: Option<String> = conn
        .query_row(
            "SELECT password_hash FROM tbl_ledger_account WHERE id = ?1",
            [account_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    
    Ok(stored_hash.map(|h| h == password_hash).unwrap_or(false))
}

#[tauri::command]
fn update_ledger_password(
    app_handle: AppHandle,
    state: State<AppState>,
    account_id: String,
    password: String,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&conn)?;
    
    let password_hash = hash_password(&password);
    let expires_at = Utc::now() + chrono::Duration::days(30);
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "UPDATE tbl_ledger_account 
         SET password_hash = ?1, password_expires_at = ?2, updated_at = ?3 
         WHERE id = ?4",
        rusqlite::params![password_hash, expires_at.to_rfc3339(), now, account_id],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn check_password_expiry(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    check_and_reset_expired_passwords(&conn)
}

#[tauri::command]
fn delete_ledger_account(
    app_handle: AppHandle,
    state: State<AppState>,
    account_id: String,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM tbl_ledger_account WHERE id = ?1", [account_id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn create_ledger_entry(
    app_handle: AppHandle,
    state: State<AppState>,
    account_id: String,
    entry: LedgerEntryInput,
) -> Result<String, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let mut conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&tx)?;
    
    let entry_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    // 항목 저장
    tx.execute(
        "INSERT INTO tbl_ledger_entry 
         (id, account_id, type, amount, date, title, category, platform, url, merchant, payment_method, memo, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        rusqlite::params![
            entry_id, account_id, entry.r#type, entry.amount, entry.date, entry.title,
            entry.category, entry.platform, entry.url, entry.merchant, entry.payment_method,
            entry.memo, entry.color, now, now
        ],
    )
    .map_err(|e| e.to_string())?;
    
    // 태그 저장
    for tag in &entry.tags {
        let tag_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO tbl_ledger_tag (id, entry_id, tag, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![tag_id, entry_id, tag, now],
        )
        .map_err(|e| e.to_string())?;
    }
    
    // 히스토리 기록 (완전한 LedgerEntry 생성)
    let full_entry = LedgerEntry {
        id: entry_id.clone(),
        account_id: account_id.clone(),
        r#type: entry.r#type.clone(),
        amount: entry.amount,
        date: entry.date.clone(),
        title: entry.title.clone(),
        category: entry.category.clone(),
        platform: entry.platform.clone(),
        url: entry.url.clone(),
        merchant: entry.merchant.clone(),
        payment_method: entry.payment_method.clone(),
        memo: entry.memo.clone(),
        color: entry.color.clone(),
        tags: entry.tags.clone(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    let snapshot_after = serde_json::to_string(&full_entry).map_err(|e| e.to_string())?;
    let history_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO tbl_ledger_history (id, entry_id, action, snapshot_after, created_at) 
         VALUES (?1, ?2, 'create', ?3, ?4)",
        rusqlite::params![history_id, entry_id, snapshot_after, now],
    )
    .map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(entry_id)
}

#[tauri::command]
fn update_ledger_entry(
    app_handle: AppHandle,
    state: State<AppState>,
    entry_id: String,
    entry: LedgerEntryInput,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let mut conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&tx)?;
    
    // 기존 항목 조회 (히스토리용)
    let (existing_account_id, existing_created_at): (String, String) = tx
        .query_row(
            "SELECT account_id, created_at FROM tbl_ledger_entry WHERE id = ?1",
            [&entry_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    
    let snapshot_before: Option<String> = tx
        .query_row(
            "SELECT json_object(
                'id', id, 'account_id', account_id, 'type', type, 'amount', amount,
                'date', date, 'title', title, 'category', category, 'platform', platform,
                'url', url, 'merchant', merchant, 'payment_method', payment_method,
                'memo', memo, 'color', color, 'created_at', created_at, 'updated_at', updated_at
            ) FROM tbl_ledger_entry WHERE id = ?1",
            [&entry_id],
            |row| row.get(0),
        )
        .ok();
    
    let now = Utc::now().to_rfc3339();
    
    // 항목 업데이트
    tx.execute(
        "UPDATE tbl_ledger_entry 
         SET type = ?1, amount = ?2, date = ?3, title = ?4, category = ?5, platform = ?6,
             url = ?7, merchant = ?8, payment_method = ?9, memo = ?10, color = ?11, updated_at = ?12
         WHERE id = ?13",
        rusqlite::params![
            entry.r#type, entry.amount, entry.date, entry.title, entry.category,
            entry.platform, entry.url, entry.merchant, entry.payment_method,
            entry.memo, entry.color, now, entry_id
        ],
    )
    .map_err(|e| e.to_string())?;
    
    // 태그 삭제 후 재생성
    tx.execute("DELETE FROM tbl_ledger_tag WHERE entry_id = ?1", [&entry_id])
        .map_err(|e| e.to_string())?;
    
    for tag in &entry.tags {
        let tag_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO tbl_ledger_tag (id, entry_id, tag, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![tag_id, entry_id, tag, now],
        )
        .map_err(|e| e.to_string())?;
    }
    
    // 히스토리 기록 (완전한 LedgerEntry 생성)
    let full_entry_after = LedgerEntry {
        id: entry_id.clone(),
        account_id: existing_account_id,
        r#type: entry.r#type.clone(),
        amount: entry.amount,
        date: entry.date.clone(),
        title: entry.title.clone(),
        category: entry.category.clone(),
        platform: entry.platform.clone(),
        url: entry.url.clone(),
        merchant: entry.merchant.clone(),
        payment_method: entry.payment_method.clone(),
        memo: entry.memo.clone(),
        color: entry.color.clone(),
        tags: entry.tags.clone(),
        created_at: existing_created_at,
        updated_at: now.clone(),
    };
    let snapshot_after = serde_json::to_string(&full_entry_after).map_err(|e| e.to_string())?;
    let history_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO tbl_ledger_history (id, entry_id, action, snapshot_before, snapshot_after, created_at) 
         VALUES (?1, ?2, 'update', ?3, ?4, ?5)",
        rusqlite::params![history_id, entry_id, snapshot_before, snapshot_after, now],
    )
    .map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_ledger_entry(
    app_handle: AppHandle,
    state: State<AppState>,
    entry_id: String,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let mut conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&tx)?;
    
    // 삭제 전 스냅샷 저장
    let snapshot_before: Option<String> = tx
        .query_row(
            "SELECT json_object(
                'id', id, 'account_id', account_id, 'type', type, 'amount', amount,
                'date', date, 'title', title, 'category', category, 'platform', platform,
                'url', url, 'merchant', merchant, 'payment_method', payment_method,
                'memo', memo, 'color', color, 'created_at', created_at, 'updated_at', updated_at
            ) FROM tbl_ledger_entry WHERE id = ?1",
            [&entry_id],
            |row| row.get(0),
        )
        .ok();
    
    let now = Utc::now().to_rfc3339();
    
    // 히스토리 기록
    let history_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO tbl_ledger_history (id, entry_id, action, snapshot_before, created_at) 
         VALUES (?1, ?2, 'delete', ?3, ?4)",
        rusqlite::params![history_id, entry_id, snapshot_before, now],
    )
    .map_err(|e| e.to_string())?;
    
    // 항목 삭제 (CASCADE로 태그도 자동 삭제)
    tx.execute("DELETE FROM tbl_ledger_entry WHERE id = ?1", [entry_id])
        .map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_ledger_entries(
    app_handle: AppHandle,
    state: State<AppState>,
    account_id: String,
    year_month: String,
) -> Result<Vec<LedgerEntry>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&conn)?;
    
    let mut stmt = conn
        .prepare(
            "SELECT id, account_id, type, amount, date, title, category, platform, url, merchant, 
                    payment_method, memo, color, created_at, updated_at
             FROM tbl_ledger_entry 
             WHERE account_id = ?1 AND date LIKE ?2
             ORDER BY date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    
    let date_pattern = format!("{}%", year_month);
    let rows = stmt
        .query_map(rusqlite::params![account_id, date_pattern], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, Option<String>>(10)?,
                row.get::<_, Option<String>>(11)?,
                row.get::<_, Option<String>>(12)?,
                row.get::<_, String>(13)?,
                row.get::<_, String>(14)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    
    let mut entries = Vec::new();
    for row_result in rows {
        let (
            id, account_id, r#type, amount, date, title, category, platform, url, merchant,
            payment_method, memo, color, created_at, updated_at,
        ) = row_result.map_err(|e| e.to_string())?;
        
        // 태그 조회
        let mut tag_stmt = conn
            .prepare("SELECT tag FROM tbl_ledger_tag WHERE entry_id = ?1 ORDER BY tag")
            .map_err(|e| e.to_string())?;
        let tag_rows = tag_stmt
            .query_map([&id], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        
        let mut tags = Vec::new();
        for tag_result in tag_rows {
            tags.push(tag_result.map_err(|e| e.to_string())?);
        }
        
        entries.push(LedgerEntry {
            id,
            account_id,
            r#type,
            amount,
            date,
            title,
            category,
            platform,
            url,
            merchant,
            payment_method,
            memo,
            color,
            tags,
            created_at,
            updated_at,
        });
    }
    
    Ok(entries)
}

#[tauri::command]
fn get_ledger_entry(
    app_handle: AppHandle,
    state: State<AppState>,
    entry_id: String,
) -> Result<Option<LedgerEntry>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(None);
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&conn)?;
    
    let result: Result<(String, String, String, i64, String, String, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String, String), rusqlite::Error> = conn.query_row(
        "SELECT id, account_id, type, amount, date, title, category, platform, url, merchant, 
                payment_method, memo, color, created_at, updated_at
         FROM tbl_ledger_entry WHERE id = ?1",
        [entry_id],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
                row.get(10)?,
                row.get(11)?,
                row.get(12)?,
                row.get(13)?,
                row.get(14)?,
            ))
        },
    );
    
    match result {
        Ok((
            id, account_id, r#type, amount, date, title, category, platform, url, merchant,
            payment_method, memo, color, created_at, updated_at,
        )) => {
            // 태그 조회
            let mut tag_stmt = conn
                .prepare("SELECT tag FROM tbl_ledger_tag WHERE entry_id = ?1 ORDER BY tag")
                .map_err(|e| e.to_string())?;
            let tag_rows = tag_stmt
                .query_map([&id], |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?;
            
            let mut tags = Vec::new();
            for tag_result in tag_rows {
                tags.push(tag_result.map_err(|e| e.to_string())?);
            }
            
            Ok(Some(LedgerEntry {
                id,
                account_id,
                r#type,
                amount,
                date,
                title,
                category,
                platform,
                url,
                merchant,
                payment_method,
                memo,
                color,
                tags,
                created_at,
                updated_at,
            }))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn list_ledger_history(
    app_handle: AppHandle,
    state: State<AppState>,
    entry_id: String,
) -> Result<Vec<LedgerHistory>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    check_and_reset_expired_passwords(&conn)?;
    
    let mut stmt = conn
        .prepare(
            "SELECT id, entry_id, action, snapshot_before, snapshot_after, created_at
             FROM tbl_ledger_history 
             WHERE entry_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([entry_id], |row| {
            Ok(LedgerHistory {
                id: row.get(0)?,
                entry_id: row.get(1)?,
                action: row.get(2)?,
                snapshot_before: row.get(3)?,
                snapshot_after: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut histories = Vec::new();
    for row in rows {
        histories.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(histories)
}

// ========== 상품 메타데이터 관련 구조체 및 함수 ==========

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Category {
    id: String,
    name: String,
    color: Option<String>,
    created_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProductMeta {
    id: String,
    provider: String,
    item_id: i64,
    memo: Option<String>,
    url: Option<String>,
    rating: Option<i32>,
    tags: Vec<String>,
    categories: Vec<Category>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProductMetaInput {
    memo: Option<String>,
    url: Option<String>,
    rating: Option<i32>,
    tags: Vec<String>,
    category_ids: Vec<String>,
}

#[tauri::command]
fn list_categories(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<Vec<Category>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT id, name, color, created_at FROM tbl_category ORDER BY name")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut categories = Vec::new();
    for row in rows {
        categories.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(categories)
}

#[tauri::command]
fn create_category(
    app_handle: AppHandle,
    state: State<AppState>,
    name: String,
    color: Option<String>,
) -> Result<Category, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    let category_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO tbl_category (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![category_id, name, color, now],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(Category {
        id: category_id,
        name,
        color,
        created_at: now,
    })
}

#[tauri::command]
fn delete_category(
    app_handle: AppHandle,
    state: State<AppState>,
    category_id: String,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM tbl_category WHERE id = ?1", [category_id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn get_product_meta(
    app_handle: AppHandle,
    state: State<AppState>,
    provider: String,
    item_id: i64,
) -> Result<Option<ProductMeta>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(None);
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    // 메타데이터 조회
    let meta_result: Result<(String, String, i64, Option<String>, Option<String>, Option<i32>, String, String), rusqlite::Error> = conn.query_row(
        "SELECT id, provider, item_id, memo, url, rating, created_at, updated_at
         FROM tbl_product_meta WHERE provider = ?1 AND item_id = ?2",
        rusqlite::params![provider, item_id],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
            ))
        },
    );
    
    match meta_result {
        Ok((id, provider, item_id, memo, url, rating, created_at, updated_at)) => {
            // 태그 조회
            let mut tag_stmt = conn
                .prepare("SELECT tag FROM tbl_product_tag WHERE meta_id = ?1 ORDER BY tag")
                .map_err(|e| e.to_string())?;
            let tag_rows = tag_stmt
                .query_map([&id], |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?;
            
            let mut tags = Vec::new();
            for tag_result in tag_rows {
                tags.push(tag_result.map_err(|e| e.to_string())?);
            }
            
            // 카테고리 조회
            let mut cat_stmt = conn
                .prepare(
                    "SELECT c.id, c.name, c.color, c.created_at
                     FROM tbl_category c
                     INNER JOIN tbl_product_category pc ON c.id = pc.category_id
                     WHERE pc.meta_id = ?1
                     ORDER BY c.name"
                )
                .map_err(|e| e.to_string())?;
            let cat_rows = cat_stmt
                .query_map([&id], |row| {
                    Ok(Category {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        color: row.get(2)?,
                        created_at: row.get(3)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            
            let mut categories = Vec::new();
            for cat_result in cat_rows {
                categories.push(cat_result.map_err(|e| e.to_string())?);
            }
            
            Ok(Some(ProductMeta {
                id,
                provider,
                item_id,
                memo,
                url,
                rating,
                tags,
                categories,
                created_at,
                updated_at,
            }))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_product_meta(
    app_handle: AppHandle,
    state: State<AppState>,
    provider: String,
    item_id: i64,
    input: ProductMetaInput,
) -> Result<ProductMeta, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let mut conn = Connection::open(&path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let now = Utc::now().to_rfc3339();
    
    // 기존 메타데이터 확인
    let existing_id: Option<String> = tx
        .query_row(
            "SELECT id FROM tbl_product_meta WHERE provider = ?1 AND item_id = ?2",
            rusqlite::params![provider, item_id],
            |row| row.get(0),
        )
        .ok();
    
    let meta_id = if let Some(id) = existing_id {
        // 업데이트
        tx.execute(
            "UPDATE tbl_product_meta SET memo = ?1, url = ?2, rating = ?3, updated_at = ?4 WHERE id = ?5",
            rusqlite::params![input.memo, input.url, input.rating, now, id],
        )
        .map_err(|e| e.to_string())?;
        id
    } else {
        // 새로 생성
        let new_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO tbl_product_meta (id, provider, item_id, memo, url, rating, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![new_id, provider, item_id, input.memo, input.url, input.rating, now, now],
        )
        .map_err(|e| e.to_string())?;
        new_id
    };
    
    // 태그 삭제 후 재생성
    tx.execute("DELETE FROM tbl_product_tag WHERE meta_id = ?1", [&meta_id])
        .map_err(|e| e.to_string())?;
    
    for tag in &input.tags {
        let tag_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO tbl_product_tag (id, meta_id, tag, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![tag_id, meta_id, tag, now],
        )
        .map_err(|e| e.to_string())?;
    }
    
    // 카테고리 관계 삭제 후 재생성
    tx.execute("DELETE FROM tbl_product_category WHERE meta_id = ?1", [&meta_id])
        .map_err(|e| e.to_string())?;
    
    for category_id in &input.category_ids {
        let rel_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO tbl_product_category (id, meta_id, category_id, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![rel_id, meta_id, category_id, now],
        )
        .map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    
    // 저장된 데이터 반환
    get_product_meta(app_handle, state, provider, item_id)?
        .ok_or_else(|| "저장된 메타데이터를 찾을 수 없습니다.".to_string())
}

#[tauri::command]
fn delete_product_meta(
    app_handle: AppHandle,
    state: State<AppState>,
    provider: String,
    item_id: i64,
) -> Result<(), String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Err("DB 파일이 존재하지 않습니다.".to_string());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    // CASCADE로 태그, 카테고리 관계도 자동 삭제
    conn.execute(
        "DELETE FROM tbl_product_meta WHERE provider = ?1 AND item_id = ?2",
        rusqlite::params![provider, item_id],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn search_tags(
    app_handle: AppHandle,
    state: State<AppState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<String>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    let search_term = format!("%{}%", query);
    let result_limit = limit.unwrap_or(20);
    
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT tag FROM tbl_product_tag 
             WHERE tag LIKE ?1 
             ORDER BY tag 
             LIMIT ?2"
        )
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map(rusqlite::params![search_term, result_limit], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    let mut tags = Vec::new();
    for row in rows {
        tags.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(tags)
}

/// 상품 메타데이터 요약 정보
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProductMetaSummary {
    item_id: i64,
    has_tags: bool,
    has_categories: bool,
    has_memo: bool,
    has_url: bool,
    rating: Option<i32>,
}

/// 특정 provider의 모든 상품 메타데이터 요약 조회
#[tauri::command]
fn list_product_meta_summaries(
    app_handle: AppHandle,
    state: State<AppState>,
    provider: String,
) -> Result<Vec<ProductMetaSummary>, String> {
    let path = configured_db_path(&app_handle, &state)?
        .ok_or_else(|| "DB가 설정되지 않았습니다.".to_string())?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
    // 메타데이터와 태그/카테고리 개수를 한 번에 조회
    let mut stmt = conn
        .prepare(
            "SELECT 
                m.item_id,
                m.memo,
                m.url,
                m.rating,
                (SELECT COUNT(*) FROM tbl_product_tag WHERE meta_id = m.id) as tag_count,
                (SELECT COUNT(*) FROM tbl_product_category WHERE meta_id = m.id) as category_count
             FROM tbl_product_meta m
             WHERE m.provider = ?1"
        )
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map(rusqlite::params![provider], |row| {
            let memo: Option<String> = row.get(1)?;
            let url: Option<String> = row.get(2)?;
            let rating: Option<i32> = row.get(3)?;
            let tag_count: i64 = row.get(4)?;
            let category_count: i64 = row.get(5)?;
            
            Ok(ProductMetaSummary {
                item_id: row.get(0)?,
                has_tags: tag_count > 0,
                has_categories: category_count > 0,
                has_memo: memo.is_some() && !memo.as_ref().unwrap().is_empty(),
                has_url: url.is_some() && !url.as_ref().unwrap().is_empty(),
                rating,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut summaries = Vec::new();
    for row in rows {
        summaries.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(summaries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            proxy_request,
            get_db_status,
            init_db,
            load_existing_db,
            logout,
            has_users,
            list_users,
            save_account,
            delete_user,
            update_user,
            get_user_credentials,
            update_account_credentials,
            save_naver_payment,
            list_naver_payments,
            get_last_naver_payment,
            list_coupang_payments,
            save_coupang_payment,
            get_last_coupang_payment,
            search_products,
            get_table_stats,
            truncate_table,
            get_table_data,
            create_ledger_account,
            list_ledger_accounts,
            verify_ledger_password,
            update_ledger_password,
            check_password_expiry,
            delete_ledger_account,
            create_ledger_entry,
            update_ledger_entry,
            delete_ledger_entry,
            list_ledger_entries,
            get_ledger_entry,
            list_ledger_history,
            list_categories,
            create_category,
            delete_category,
            get_product_meta,
            save_product_meta,
            delete_product_meta,
            search_tags,
            list_product_meta_summaries
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
