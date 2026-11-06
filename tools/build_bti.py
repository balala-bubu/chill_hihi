#!/usr/bin/env python3
"""劇場背景轉檔：models/bti/src/bti_04.dae -> models/bti.json
原檔（Paper Mario 風格的劇院舞台 bti_04）有 233 個節點：舞台（地板 y=0、後牆 z=-10.5、兩側牆 x=±35、天花板 y=25）、紅色布幕、金邊舞台框（z≈9.5~10）、
吊燈 stg_light01~06、腳燈 bti_den、繩子、左側樓梯與小桌、觀眾席座椅 isu（z 12.7~40.7，y -5 = 觀眾席地板）。
這裡把每個節點的變換烘進頂點（Y 向上、z 往鏡頭是 +），只輸出需要的部分：
  略過：spotlight（光柱）、nozzle_*（噴嘴機關）、iron_frame（吊架機關）、escape_wall（機關牆）、A_bti_*（影子接收面）、bti_kyaku_*（觀眾席牆地，程式自己畫）、pCube2（舞台外的箱子）。
  依 (貼圖, 是否半透明) 合併成幾個 mesh；座椅每排一個 mesh（程式依距離決定留幾排）；腳燈 denki 單獨一個 mesh（程式讓它跑馬燈）。
貼圖（models/bti/*.png，上傳的貼圖沒檔名，依 dae 的檔名清單＋尺寸＋用途對應）：
  katen=紅布幕 kin=藍底金色花邊 panel=星星牆板 kabe=米色壁紙 ue=金屬條 door=紅門 door2=米色門 floor(butaiue)=舞台地板／牆／天花板 denki=腳燈 isu=座椅 kyatatu=小桌樓梯 light=燈光暈。
輸出 {meshes:[{name,tex,tr,p,u,c,i}]}：c 是每頂點 RGBA（烘好的光影）；tex='none' 是只有頂點色的燈具。"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from dae_parse import load, bake
D = os.path.join(os.path.dirname(__file__), '..', 'models')
d = load(os.path.join(D, 'bti', 'src', 'bti_04.dae'))
TEX = {'kyatatu_01.png': 'kyatatu', 'bti_4_denki.png': 'denki', 'bti_kusari_1.png': 'kusari', 'bti_4_ue.png': 'ue', 'bti_4_door.png': 'door', 'bti_kabemoyou.png': 'kabe',
       'btr_panel.png': 'panel', 'bti_4_katen.png': 'katen', 'bti_4_botan_1.png': 'botan', 'btr_kin.png': 'kin', 'bti_04_isu.png': 'isu', 'bti_4_butaiue.png': 'floor',
       'tou_03_door_04.6.png': 'door2', 'hei_bt_light_01.png': 'light'}
SKIP_PATH = ('nozzle', 'iron_frame', 'escape_wall', 'spotlight')
SKIP_NAME = ('A_bti_1_00', 'A_bti_1_01', 'bti_kyaku_yuka', 'bti_kyaku_kabe', 'pCube2_q00064', 'bti_mizu')
groups, order = {}, []
for it in d['inst']:
    if any(s in p for p in it['path'] for s in SKIP_PATH) or it['name'] in SKIP_NAME: continue
    g = d['geo'][it['geo']]
    if not g['col']: continue
    tex = TEX.get(d['mats'][it['mat']][1] or '', 'none')
    pos, U, C, idx = bake(d, it)
    tr = any(C[i] < .99 for i in range(3, len(C), 4))
    if tex == 'isu': key = ('isu', it['name'], 0)
    else: key = (tex, '', 1 if tr else 0)
    if key not in groups: groups[key] = dict(name=it['name'] if tex == 'isu' else tex + ('_tr' if tr else ''), tex=tex, tr=int(tr), p=[], u=[], c=[], i=[]); order.append(key)
    G = groups[key]; o = len(G['p']) // 3
    G['p'] += [round(v, 3) for v in pos]; G['u'] += [round(v, 4) for v in U]; G['c'] += [round(v, 3) for v in C]; G['i'] += [i + o for i in idx]
out = [groups[k] for k in order]
for m in out: print(m['name'], m['tex'], 'tr' if m['tr'] else '', len(m['p']) // 3, 'verts', len(m['i']) // 3, 'tris')
json.dump({'meshes': out}, open(os.path.join(D, 'bti.json'), 'w'), separators=(',', ':'))
print('bti.json', os.path.getsize(os.path.join(D, 'bti.json')))
