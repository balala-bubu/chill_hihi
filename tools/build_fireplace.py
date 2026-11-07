#!/usr/bin/env python3
"""壁爐客廳背景轉檔（BG mode 6）
  models/fireplace/src/living_room.dae（3DS Disney Magical World 2 的史迪奇客廳，Z 向上）-> models/fireplace.json 的 living 部分
  models/fireplace/src/fireplace.obj（Gone Home 壁爐，Y 向上、約 0.06 寬）-> models/fireplace.json 的 fire 部分
輸出座標一律是「房間座標」：x 往右、y 往上、z 往鏡頭；dae 的 (x, y深, z高) -> (x, z, 2.7-y)（原房間是從 -y 往 +y 看，後牆約在 y=2.7）。
living.meshes = [{name,mat(貼圖名),p,u,i}]；貼圖（models/fireplace/*.png）由本腳本從 src/ 複製。"""
import os, sys, json, shutil, re
sys.path.insert(0, os.path.dirname(__file__))
import dae_parse as d
D = os.path.join(os.path.dirname(__file__), '..', 'models')
SRC = os.path.join(D, 'fireplace', 'src')
r = d.load(os.path.join(SRC, 'living_room.dae'))
meshes = []
for n_, it in enumerate(r['inst']):
    pos, U, C, idx = d.bake(r, it)
    P = []
    for i in range(len(pos) // 3):
        x, y, z = pos[i*3:i*3+3]
        P += [round(x, 3), round(z, 3), round(2.7 - y, 3)]
    mat = re.sub(r'^m_LS_ili00_|_png-material$', '', it['mat'])
    meshes.append({'name': 'm%d' % n_, 'mat': mat, 'p': P, 'u': [round(v, 4) for v in U], 'i': idx})
    shutil.copy(os.path.join(SRC, 'm_LS_ili00_%s.png' % mat), os.path.join(D, 'fireplace', mat + '.png'))
# 壁爐 obj：v/vt/vn/f，三角化、把 (v,vt) 組合成頂點
V, VT, F = [], [], []
for l in open(os.path.join(SRC, 'fireplace.obj')):
    t = l.split()
    if not t: continue
    if t[0] == 'v': V.append(list(map(float, t[1:4])))
    elif t[0] == 'vt': VT.append(list(map(float, t[1:3])))
    elif t[0] == 'f': F.append([tuple(int(a) - 1 if a else 0 for a in (x.split('/') + ['', ''])[:2]) for x in t[1:]])
key, P, U, I = {}, [], [], []
for f in F:
    ids = []
    for vi, ti in f:
        k = (vi, ti)
        if k not in key:
            key[k] = len(P) // 3; P += [round(c, 5) for c in V[vi]]; U += [round(c, 4) for c in VT[ti]]
        ids.append(key[k])
    for j in range(1, len(ids) - 1): I += [ids[0], ids[j], ids[j+1]]
shutil.copy(os.path.join(SRC, 'fireplace_d.png'), os.path.join(D, 'fireplace', 'fire.png'))
json.dump({'living': {'meshes': meshes}, 'fire': {'p': P, 'u': U, 'i': I}}, open(os.path.join(D, 'fireplace.json'), 'w'), separators=(',', ':'))
print('fireplace.json', os.path.getsize(os.path.join(D, 'fireplace.json')), len(meshes), 'meshes; fire', len(P)//3, 'verts', len(I)//3, 'tris')
