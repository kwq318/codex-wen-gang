#!/usr/bin/env python3
"""修复 Codex 桌面应用左侧历史栏不显示的 bug（完整版）。

使用说明：
1. 退出 Codex 桌面应用 (Cmd+Q)
2. 运行本脚本: python3 fix-sidebar.py
3. 重新打开 Codex 桌面应用

此脚本会：
- 从 DB 查询所有属于此项目的线程（212条）
- 更新 sidebar-project-thread-orders（5条 → 212条）
- 更新 thread-project-assignments（51条 → 212条）
- 清理不在 DB 中的无效 thread ID
"""
import json, sqlite3, shutil, os, sys, subprocess

GS_PATH = os.path.expanduser('~/.codex/.codex-global-state.json')
DB_PATH = os.path.expanduser('~/.codex/state_5.sqlite')
PROJECT_ID = 'local-d5b643d2b07a94dc7080aea1cccf88a6'
CWD = '/Users/kangweiqing/Desktop/桌面文稿/codex文稿'

print('🔍 检查 Codex 是否正在运行...')
result = subprocess.run(['pgrep', '-f', 'Codex'], capture_output=True, text=True)
if result.stdout.strip():
    print(f'⚠️  Codex 仍在运行 (PID: {result.stdout.strip()})！')
    print('   请先按 Cmd+Q 完全退出 Codex 后再运行此脚本。')
    print('   退出后重新运行: python3 fix-sidebar.py')
    sys.exit(1)
else:
    print('✅ Codex 已退出，可以安全修改')

# Backup
bak_path = GS_PATH + '.bak'
shutil.copy2(GS_PATH, bak_path)
print(f'✅ 备份已保存: {bak_path}')

# Query ALL threads matching the project cwd
conn = sqlite3.connect(DB_PATH)
rows = conn.execute(
    'SELECT id, updated_at, title FROM threads WHERE cwd = ? ORDER BY updated_at DESC',
    (CWD,)
).fetchall()
conn.close()

thread_ids = [row[0] for row in rows]

print(f'📋 从 DB 找到 {len(thread_ids)} 条线程 (cwd = {CWD})')
if rows:
    print(f'   最旧: {rows[-1][2][:40]} ({rows[-1][0][:20]}...)')
    print(f'   最新: {rows[0][2][:40]} ({rows[0][0][:20]}...)')
else:
    print('   ⚠️  没有找到属于此项目的线程')

# Load state
with open(GS_PATH) as f:
    state = json.load(f)

# 1. 更新 sidebar-project-thread-orders
old_sidebar = state.get('sidebar-project-thread-orders', {}).get(PROJECT_ID, {}).get('threadIds', [])
old_count = len(old_sidebar)
state['sidebar-project-thread-orders'][PROJECT_ID] = {'threadIds': thread_ids}
print(f'📌 sidebar-project-thread-orders: {old_count} 条 → {len(thread_ids)} 条')
if old_sidebar:
    invalid_ids = [x for x in old_sidebar if x not in thread_ids]
    if invalid_ids:
        print(f'   🧹 清理了 {len(invalid_ids)} 个无效 ID')

# 2. 更新 thread-project-assignments（补全缺失的线程）
assignments = state.get('thread-project-assignments', {})
old_assign_count = len(assignments)

for tid in thread_ids:
    if tid not in assignments:
        assignments[tid] = {
            'projectKind': 'local',
            'projectId': PROJECT_ID,
            'cwd': CWD,
            'pendingCoreUpdate': False
        }

new_assign_count = len(assignments)
print(f'📌 thread-project-assignments: {old_assign_count} 条 → {new_assign_count} 条')
state['thread-project-assignments'] = assignments

# Write back
with open(GS_PATH, 'w') as f:
    json.dump(state, f, ensure_ascii=False)

print('✅ 状态文件已写入')
print()
print('📋 下一步操作：')
print('   1. 重新打开 Codex 桌面应用')
print('   2. 左侧历史栏将显示全部历史线程')
print()
print('💡 如果仍然不显示：')
print('   1. 完全退出 Codex (Cmd+Q)')
print('   2. 重新运行: python3 fix-sidebar.py')
print('   3. 再次打开 Codex')
