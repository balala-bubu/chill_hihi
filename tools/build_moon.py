#!/usr/bin/env python3
"""月亮背景轉檔：models/moon/src/moo_04.dae -> models/moon.json
原檔（Paper Mario 風格的夜空）是 17 個面片：
  hosi_02（星星，256 貼圖，UV 重複 ±5）3 層：pPlane9/6/5，z -11/-10/-7，40x30 乘 2
  seiun_v / seiun_v_x（星雲，hosi_04，白色貼圖 × 頂點色）：pPlane21/19/18/14/13，z -12.1，有旋轉
  moon_v / moon_v_x（moo_moon_01，深藍夜空）：pPlane7（15x15）和一堆小面片（頂點色 橘／綠／青，alpha .8，z -6）
  pPlane8 是灰色地板（不輸出）
這裡只把每個面片的節點變換（translate、rotateZ/Y/X、scale）烘進頂點，輸出原檔座標（Y 向上、z 往鏡頭是 +），
程式（src/10-world/06-moon.js）再依視窗縮放到畫面。
輸出 {meshes:[{name,tex,p,u,c,i}]}：tex = stars / nebula / sky；c 是每頂點 RGBA。
貼圖（models/moon/*.png）：sky = moo_moon_01（512x480 深藍夜空）、stars = moo_hosi_02、nebula = moo_hosi_04、ground = 上傳的月面碎石貼圖（256，上半透明）。"""
import re, json, os, math
D = os.path.join(os.path.dirname(__file__), '..', 'models')
s = open(os.path.join(D, 'moon', 'src', 'moo_04.dae')).read()
MATTEX = {'mat1': 'stars', 'mat2': 'sky', 'mat3': 'sky', 'mat4': 'nebula', 'mat5': 'nebula'}

def mul(a, b): return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
def ident(): return [[1 if i == j else 0 for j in range(4)] for i in range(4)]
def T(x, y, z): m = ident(); m[0][3], m[1][3], m[2][3] = x, y, z; return m
def S(x, y, z): m = ident(); m[0][0], m[1][1], m[2][2] = x, y, z; return m
def R(ax, ay, az, deg):
    a = math.radians(deg); c, sn = math.cos(a), math.sin(a); m = ident()
    if az: m[0][0], m[0][1], m[1][0], m[1][1] = c, -sn, sn, c
    elif ay: m[0][0], m[0][2], m[2][0], m[2][2] = c, sn, -sn, c
    else: m[1][1], m[1][2], m[2][1], m[2][2] = c, -sn, sn, c
    return m

nodes = {}
for n in re.finditer(r'<node id="node_(\w+)" name="\w+">(.*?)<instance_geometry url="#(\w+)">.*?target="#(\w+)"', s, re.S):
    M = ident()
    for t, body in re.findall(r'<(translate|rotate|scale)[^>]*>([^<]*)<', n.group(2)):
        v = list(map(float, body.split()))
        M = mul(M, T(*v) if t == 'translate' else S(*v) if t == 'scale' else R(*v))
    nodes[n.group(3)] = (n.group(1), M, n.group(4))

out = []
for g in re.finditer(r'<geometry id="(\w+)">(.*?)</geometry>', s, re.S):
    gid, b = g.group(1), g.group(2)
    if gid not in nodes or nodes[gid][2] not in MATTEX: continue
    name, M, mat = nodes[gid]
    def arr(k): return list(map(float, re.search(r'<float_array id="%sarray%s" count="\d+">([^<]*)' % (k, gid[4:]), b).group(1).split()))
    P, U, C = arr('point'), arr('uv'), arr('color')
    idx = list(map(int, re.search(r'<polylist[^>]*>.*?<p>([^<]*)', b, re.S).group(1).split()))[0::3]   # VERTEX/TEXCOORD/COLOR 三個索引相同
    pos = []
    for i in range(len(P) // 3):
        x, y, z = P[i * 3:i * 3 + 3]
        pos += [round(M[r][0] * x + M[r][1] * y + M[r][2] * z + M[r][3], 4) for r in range(3)]
    out.append({'name': name, 'tex': MATTEX[mat], 'mat': mat, 'p': pos, 'u': [round(v, 4) for v in U], 'c': [round(v, 3) for v in C], 'i': idx})
    print(name, MATTEX[mat], len(pos) // 3, 'verts', len(idx) // 3, 'tris')
json.dump({'meshes': out}, open(os.path.join(D, 'moon.json'), 'w'), separators=(',', ':'))
print('moon.json', os.path.getsize(os.path.join(D, 'moon.json')))
