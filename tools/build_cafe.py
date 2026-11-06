#!/usr/bin/env python3
"""咖啡廳背景轉檔：models/cafe/src/idr_cafe.dae -> models/cafe.json
原檔單位：房間 x 64..416、z 288（後牆）..448（前緣）、牆高 112，Y 向上。輸出座標已平移成 x-240、z-288（後牆中線在 x=0、後牆 z=0，往鏡頭是 +z）。
輸出 {meshes:[{mat,p,u,i,c?}]}，mat 是原檔材質名（obj/obj2/wall/carpet/mat/shadow/window/thickness）。
地毯和後牆在程式裡另外用同樣的貼圖密度往左右、往前延伸（涵蓋任何視窗寬度），所以原檔的地毯（ID82）和後牆（z=288 那兩個三角形）不輸出，前緣的石板厚度（thickness）和門墊（mat）也不輸出。"""
import re, json, os
D = os.path.join(os.path.dirname(__file__), '..', 'models')
s = open(os.path.join(D, 'cafe', 'src', 'idr_cafe.dae')).read()
CX, CZ = 240.0, 288.0
def fl(i): return list(map(float, re.search(r'<float_array id="%s" count="\d+">([^<]*)' % i, s).group(1).split()))
out = []
for g in re.finditer(r'<geometry id="(\w+)">(.*?)</geometry>', s, re.S):
    b = g.group(2)
    srcs = {m.group(1): (m.group(2), int(m.group(3))) for m in re.finditer(r'<source id="(\w+)">.*?<float_array id="(\w+)".*?<accessor[^>]*stride="(\d+)"', b, re.S)}
    vid = re.search(r'<vertices id="(\w+)"', b).group(1)
    pos = re.search(r'<vertices id="%s">\s*<input semantic="POSITION" source="#(\w+)"' % vid, b).group(1)
    tri = re.search(r'<triangles count="\d+" material="(\w+)">(.*?)</triangles>', b, re.S)
    mat = tri.group(1)[2:]
    tc = re.search(r'semantic="TEXCOORD" source="#(\w+)"', tri.group(2)).group(1)
    col = re.search(r'semantic="COLOR" source="#(\w+)"', tri.group(2))
    ni = len(re.findall(r'offset=', tri.group(2)))
    p = list(map(int, re.search(r'<p>([^<]*)', tri.group(2)).group(1).split()))
    P, U = fl(srcs[pos][0]), fl(srcs[tc][0])
    C = fl(srcs[col.group(1)][0]) if col else None
    vi, ti, ci = p[0::ni], p[1::ni], (p[2::ni] if ni > 2 else None)
    # 逐「角」重建頂點（位置、uv、顏色索引可能不同）
    P2, U2, C2, I, seen = [], [], [], [], {}
    for k in range(len(vi)):
        key = (vi[k], ti[k], ci[k] if ci else 0)
        if key not in seen:
            seen[key] = len(P2) // 3
            x, y, z = P[vi[k] * 3:vi[k] * 3 + 3]
            P2 += [round(x - CX, 2), round(y, 2), round(z - CZ, 2)]
            U2 += [round(U[ti[k] * 2], 4), round(U[ti[k] * 2 + 1], 4)]
            if C: C2 += [round(c, 3) for c in C[ci[k] * 4:ci[k] * 4 + 3]]
        I.append(seen[key])
    if mat in ('etc_carpet', 'thickness', 'mat'): continue   # 地毯和後牆由程式延伸；前緣的石板厚度與門墊在畫面外，不輸出
    if mat == 'etc_wall':   # 後牆（z=288 的兩個三角形）改由程式延伸；其餘（側牆、牆頂、前緣柱）保留
        keep = []
        for t in range(0, len(I), 3):
            if all(abs(P2[I[t + j] * 3 + 2]) < 1e-3 for j in range(3)): continue
            keep += I[t:t + 3]
        I = keep
        mat = 'wall'
    m = {'mat': mat, 'p': P2, 'u': U2, 'i': I}
    if C2: m['c'] = C2
    out.append(m)
    print(mat, len(P2) // 3, 'verts', len(I) // 3, 'tris')
json.dump({'meshes': out}, open(os.path.join(D, 'cafe.json'), 'w'), separators=(',', ':'))
print('cafe.json', os.path.getsize(os.path.join(D, 'cafe.json')))
