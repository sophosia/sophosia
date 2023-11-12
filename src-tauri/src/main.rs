// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs_extra::init())
    .invoke_handler(tauri::generate_handler![commands::show_in_folder])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
