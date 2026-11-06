#!/usr/bin/env python3
"""博物館背景轉檔：models/museum/src/dinos2.obj + dinos2.mtl -> models/museum.json
原檔單位：大廳 x 128..448、z 130（畫牆）..448（前緣），一樓 y=0、二樓 y=84、牆高 252，Y 向上。輸出座標平移成 x-288（大廳中線 x=0）、z-130（畫牆 z=0，往鏡頭是 +z）。
輸出 {meshes:[{mat,tex,p,u,i}]}，tex 是 models/museum/<tex>.png（同材質同貼圖的物件合併成一個 mesh）。"""
import json, os
D = os.path.join(os.path.dirname(__file__), '..', 'models')
SRC = os.path.join(D, 'museum', 'src')
tex, cur = {}, None
for l in open(os.path.join(SRC, 'dinos2.mtl')):
    t = l.split()
    if not t: continue
    if t[0] == 'newmtl': cur = t[1]
    elif t[0] == 'map_Kd': tex[cur] = t[1][:-4]
V, VT, groups, mat = [], [], {}, None
for l in open(os.path.join(SRC, 'dinos2.obj')):
    t = l.split()
    if not t: continue
    if t[0] == 'v': V.append(list(map(float, t[1:4])))
    elif t[0] == 'vt': VT.append(list(map(float, t[1:3])))
    elif t[0] == 'usemtl': mat = t[1]
    elif t[0] == 'f':
        idx = [tuple(int(a) - 1 for a in x.split('/')[:2]) for x in t[1:]]
        if mat == 'm_etc.001' and all(V[i[0]][2] >= 448 for i in idx): continue   # 前緣外的紅色踏墊（畫面外的接縫）不輸出
        groups.setdefault(mat, []).extend([idx[0], idx[k], idx[k + 1]] for k in range(1, len(idx) - 1))
CX, CZ = 288.0, 130.0
out = []
for mat, tris in groups.items():
    P, U, I, seen = [], [], [], {}
    for tri in tris:
        for key in tri:
            if key not in seen:
                seen[key] = len(P) // 3
                x, y, z = V[key[0]]
                P += [round(x - CX, 2), round(y, 2), round(z - CZ, 2)]
                U += [round(VT[key[1]][0], 4), round(VT[key[1]][1], 4)]
            I.append(seen[key])
    if mat == 'm_wallB1.001':   # 右側牆原檔一路延伸到 z=512（超出大廳前緣 448，透視會很突兀）：削到 z=448，貼圖座標沿著線性插值
        n = len(P) // 3
        for a in range(n):
            if abs(P[a * 3] - (446 - CX)) < .01 and P[a * 3 + 2] > 448 - CZ + .01:
                b = min((c for c in range(n) if abs(P[c * 3] - P[a * 3]) < .01 and abs(P[c * 3 + 1] - P[a * 3 + 1]) < .01 and P[c * 3 + 2] < P[a * 3 + 2] - 1), key=lambda c: P[c * 3 + 2])
                t = (448 - CZ - P[b * 3 + 2]) / (P[a * 3 + 2] - P[b * 3 + 2])
                U[a * 2] = round(U[b * 2] + (U[a * 2] - U[b * 2]) * t, 4); U[a * 2 + 1] = round(U[b * 2 + 1] + (U[a * 2 + 1] - U[b * 2 + 1]) * t, 4)
                P[a * 3 + 2] = 448 - CZ
    out.append({'mat': mat, 'tex': tex[mat], 'p': P, 'u': U, 'i': I})
# 同貼圖的合併（同一張貼圖只要一個材質）
merged = {}
for m in out:
    g = merged.setdefault(m['tex'], {'tex': m['tex'], 'p': [], 'u': [], 'i': []})
    o = len(g['p']) // 3
    g['p'] += m['p']; g['u'] += m['u']; g['i'] += [i + o for i in m['i']]
res = list(merged.values())
json.dump({'meshes': res}, open(os.path.join(D, 'museum.json'), 'w'), separators=(',', ':'))
print(len(res), 'meshes', sum(len(m['i']) // 3 for m in res), 'tris', os.path.getsize(os.path.join(D, 'museum.json')), 'bytes')
