#!/usr/bin/env python3
"""產生召喚選單用的縮圖：models/thumbs/v0.png ... v8.png（透明背景，192×192）。

用法（需要本機有 Chrome、playwright、npm 的 three@0.152.2 和 matter-js@0.20.0，放在 repo 外的資料夾）：
    python3 tools/render_thumbs.py /path/to/node_modules

原理：用 playwright 開本機伺服器上的頁面（CDN 的 three／matter 換成本機檔案），等模型載入完，
呼叫頁面裡的測試鉤子 window.__thumb(v)（03-dogs.js）：它用獨立的 renderer 把第 v 隻（0 = 狗 A ... 4 = 哈士奇，
5 = 皮卡丘，6 = 吉伊卡哇，7 = 小八，8 = 烏薩奇）單獨畫成透明背景的肖像，回傳 PNG 資料。新增角色後重跑即可。
"""
import base64, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'node_modules'))
OUT = os.path.join(ROOT, 'models', 'thumbs')
N = 9


def main():
    os.makedirs(OUT, exist_ok=True)
    srv = subprocess.Popen(['python3', '-m', 'http.server', '8766'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path='/usr/bin/google-chrome',
                                  args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'])
            pg = b.new_page(viewport={'width': 800, 'height': 520})

            def route(r):
                u = r.request.url
                if 'three.min.js' in u:
                    r.fulfill(path=NM + '/three/build/three.min.js', content_type='application/javascript')
                elif 'matter.min.js' in u:
                    r.fulfill(path=NM + '/matter-js/build/matter.min.js', content_type='application/javascript')
                elif 'localhost' in u:
                    r.continue_()
                else:
                    r.abort()
            pg.route('**/*', route)
            pg.goto('http://localhost:8766/index.html')
            pg.wait_for_function('window.__dogs && __dogs.DV.v.length>=%d && __dogs.DV.v.every(v=>v&&v.ready)' % N, timeout=60000)
            pg.wait_for_timeout(1500)
            for v in range(N):
                url = pg.evaluate('(v)=>__thumb(v,192)', v)
                open(os.path.join(OUT, 'v%d.png' % v), 'wb').write(base64.b64decode(url.split(',')[1]))
                print('v%d.png' % v)
            b.close()
    finally:
        srv.terminate()


if __name__ == '__main__':
    main()
