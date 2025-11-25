use chrono::Utc;
use curl::easy::{Easy, List};
use rusqlite::Connection;
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

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
        
        CREATE UNIQUE INDEX IF NOT EXISTS ux_naver_payment_pay_id ON tbl_naver_payment (pay_id);
        CREATE INDEX IF NOT EXISTS idx_naver_payment_user_id ON tbl_naver_payment (user_id);
        
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
    "#,
    )
    .map_err(|e| e.to_string())?;
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
    let mut stmt = conn
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
            ON CONFLICT(pay_id) DO UPDATE SET
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
            "SELECT id FROM tbl_naver_payment WHERE pay_id = ?1",
            [payment.pay_id],
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
            has_users,
            list_users,
            save_account,
            save_naver_payment,
            get_table_stats,
            truncate_table,
            get_table_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
