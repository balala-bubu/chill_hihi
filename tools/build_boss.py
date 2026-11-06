#!/usr/bin/env python3
"""咖啡廳老闆（企鵝 pge.dae）轉檔：models/boss/src/pge.dae -> models/boss.json
骨架 21 根（Y 向上、臉朝 +Z）、每頂點單骨綁定、3 張網格（身 b0 / 眼 e.0 / 衣 cloth）。
輸出 {bones:[{n,p,m(16, row-major 局部矩陣)}], meshes:[{mat,p,n,u,s,i}]}；程式端用 SkinnedMesh 重建。"""
import re, json, os
D = os.path.join(os.path.dirname(__file__), '..', 'models')
s = open(os.path.join(D, 'boss', 'src', 'pge.dae')).read()

bones, stack = [], []
for m in re.finditer(r'<node id="[^"]*" name="(\w+)" sid="\w+" type="JOINT">\s*<matrix>([^<]*)</matrix>|</node>', s):
    if m.group(0) == '</node>':
        if stack: stack.pop()
        continue
    bones.append({'n': m.group(1), 'p': stack[-1] if stack else -1, 'm': [round(float(x), 5) for x in m.group(2).split()]})
    stack.append(len(bones) - 1)
bi = {b['n']: i for i, b in enumerate(bones)}

def fl(block, key): return list(map(float, re.search(key + r'-array" count="\d+">([^<]*)', block).group(1).split()))

meshes = []
for k, mat in enumerate(['body', 'eye', 'cloth']):
    gid = 'Geometry' + (str(k) if k else '')
    g = re.search(r'<geometry id="%s" name="\w+">(.*?)</geometry>' % gid, s, re.S).group(1)
    sid = lambda n: 'GeometrySource' + (str(k * 3 + n) if k * 3 + n else '')
    P, N, U = fl(g, sid(0)), fl(g, sid(1)), fl(g, sid(2))
    I = list(map(int, re.search(r'<triangles[^>]*>.*?<p>([^<]*)', g, re.S).group(1).split()))
    c = re.search(r'<controller id="%s">(.*?)</controller>' % ('Controller' + (str(k) if k else '')), s, re.S).group(1)
    names = re.search(r'<Name_array[^>]*>([^<]*)', c).group(1).split()
    v = list(map(int, re.search(r'<v>([^<]*)', c).group(1).split()))
    S = [bi[names[v[i]]] for i in range(0, len(v), 2)]
    assert len(S) == len(P) // 3, (len(S), len(P))
    meshes.append({'mat': mat, 'p': [round(x, 3) for x in P], 'n': [round(x, 3) for x in N], 'u': [round(x, 4) for x in U], 's': S, 'i': I})
    print(mat, len(S), 'verts', len(I) // 3, 'tris', 'y', round(min(P[1::3]), 1), round(max(P[1::3]), 1))
json.dump({'bones': bones, 'meshes': meshes}, open(os.path.join(D, 'boss.json'), 'w'), separators=(',', ':'))
print('boss.json', os.path.getsize(os.path.join(D, 'boss.json')))
