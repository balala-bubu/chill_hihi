#!/usr/bin/env python3
"""背景場景素材轉檔：models/scenery/src/{symboltree.dae,bbs.obj,tent.obj} -> models/scenery/{tree,bbs,tent}.json
輸出 {p:[x,y,z...], u:[u,v...], c:[r,g,b...](可省略), i:[index...]}；腳底置中（xz 置中、y 最低點 = 0）。"""
import json, re, os
D = os.path.join(os.path.dirname(__file__), '..', 'models', 'scenery')

def rnd(a, n): return [round(x, n) for x in a]

def finish(name, P, U, C, I):
    xs, ys, zs = P[0::3], P[1::3], P[2::3]
    cx, cz, y0 = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2, min(ys)
    for i in range(0, len(P), 3):
        P[i] -= cx; P[i + 1] -= y0; P[i + 2] -= cz
    out = {'p': rnd(P, 2), 'u': rnd(U, 4), 'i': I, 'h': round(max(P[1::3]), 2), 'w': round(max(P[0::3]) - min(P[0::3]), 2)}
    if C: out['c'] = rnd(C, 3)
    json.dump(out, open(os.path.join(D, name + '.json'), 'w'), separators=(',', ':'))
    print(name, len(P) // 3, 'verts', len(I) // 3, 'tris', 'h', out['h'], 'w', out['w'])

def dae(path):
    s = open(path).read()
    arr = lambda k: list(map(float, re.search(k + r'_array_id" count="\d+">([^<]*)', s).group(1).split()))
    P, U, C = arr('mesh_0__position'), arr('mesh_0__uv0'), arr('mesh_0__color')
    I = list(map(int, re.search(r'<triangles[^>]*>.*?<p>([^<]*)', s, re.S).group(1).split()))
    C = [C[i] for j in range(0, len(C), 4) for i in (j, j + 1, j + 2)]
    return P, U, C, I

def obj(path):
    v, vt, P, U, I, seen = [], [], [], [], [], {}
    for l in open(path):
        t = l.split()
        if not t: continue
        if t[0] == 'v': v.append(list(map(float, t[1:4])))
        elif t[0] == 'vt': vt.append(list(map(float, t[1:3])))
        elif t[0] == 'f':
            ids = []
            for q in t[1:]:
                a = q.split('/'); k = (int(a[0]) - 1, int(a[1]) - 1)
                if k not in seen:
                    seen[k] = len(P) // 3; P += v[k[0]]; U += vt[k[1]]
                ids.append(seen[k])
            for j in range(1, len(ids) - 1): I += [ids[0], ids[j], ids[j + 1]]
    return P, U, None, I

finish('tree', *dae(os.path.join(D, 'src', 'symboltree.dae')))
finish('bbs', *obj(os.path.join(D, 'src', 'bbs.obj')))
finish('tent', *obj(os.path.join(D, 'src', 'tent.obj')))
finish('bird_d', *obj(os.path.join(D, 'src', 'bird_d.obj')))
finish('bird_n', *obj(os.path.join(D, 'src', 'bird_n.obj')))
