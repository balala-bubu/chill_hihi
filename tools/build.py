#!/usr/bin/env python3
"""把 src/ 組成單一 index.html（GitHub Pages 直接讀 index.html）。

用法：
    python3 tools/build.py            # 重新組出 index.html
    python3 tools/build.py --check    # 只檢查 index.html 是否和 src/ 一致（不寫檔）

src/index.template.html 是頁面骨架（CSS、HTML、載入 three/matter 的 script），
src/<編號-功能>/*.js 依資料夾編號、檔名順序串成 <!-- @@JS@@ --> 那一段。
全部程式共用同一個 IIFE 的作用域，所以順序就是原本的執行順序，不要隨意調換編號。
"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

def js_files():
    out = []
    for d in sorted(os.listdir(SRC)):
        p = os.path.join(SRC, d)
        if os.path.isdir(p):
            out += [os.path.join(p, f) for f in sorted(os.listdir(p)) if f.endswith('.js')]
    return out

def build():
    tpl = open(os.path.join(SRC, 'index.template.html'), encoding='utf-8').read()
    js = ''.join(open(f, encoding='utf-8').read() for f in js_files())
    return tpl.replace('<!-- @@JS@@ -->\n', js, 1)

if __name__ == '__main__':
    out = build(); target = os.path.join(ROOT, 'index.html')
    if '--check' in sys.argv:
        same = open(target, encoding='utf-8').read() == out
        print('index.html 和 src/ 一致' if same else 'index.html 和 src/ 不一致，請執行 python3 tools/build.py')
        sys.exit(0 if same else 1)
    open(target, 'w', encoding='utf-8').write(out)
    print('已產生 index.html（%d 個檔案）' % len(js_files()))
