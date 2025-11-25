use curl::easy::{Easy, List};
use serde::Serialize;
use std::collections::HashMap;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
struct ProxyResponse {
    status: u32,
    body: String,
    final_url: Option<String>,
    response_headers: Vec<String>,
    request_headers: Vec<String>,
}

#[tauri::command]
async fn proxy_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
) -> Result<ProxyResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut easy = Easy::new();
        easy.url(&url).map_err(|e| e.to_string())?;
        easy.follow_location(true).map_err(|e| e.to_string())?;
        easy.accept_encoding("").map_err(|e| e.to_string())?;

        easy.cookie_file("").map_err(|e| e.to_string())?; // enable cookie engine in memory

        match method.as_str() {
            "POST" => {
                easy.post(true).map_err(|e| e.to_string())?;
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
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, proxy_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
