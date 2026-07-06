with open('main.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Add the new IPC handle at the end of the file
new_ipc = """
ipcMain.handle('db-manual-insert', async (event, record) => {
  try {
    await db.saveTelemetrySnapshot(record);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
"""

code += new_ipc

with open('main.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Added db-manual-insert IPC handler to main.js")
