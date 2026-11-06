#!/usr/bin/env python3
"""把第六隻（皮卡丘，靜態 .obj）轉成頁面用的 models/pikachu.json + pikachu.bin。

用法：
    python3 tools/build_pikachu.py

來源在 models/pikachu/src/（pika.obj + pika.mtl）；貼圖已經放在 models/pikachu/*.png（身體、臉、眼睛的幾種表情等）。
輸出：models/pikachu.json / pikachu.bin（格式和 dog.json 一樣：nodes、meshes、skinIndex/skinWeight、inverse bind）。

前五隻是帶骨架的 .dae；皮卡丘的 .obj 沒有骨架，而是依部位拆開的群組（head / arml / legr / tail ...）。
這裡替它做一副「假骨架」：骨頭名稱和關節順序比照狗（skl_root / waist / chest / neck / head / Lear1 / Rear1 / tail1-3 / Larm1 / Rarm1 / Lleg1 / Rleg1），
每個群組 100% 綁在一根骨頭上（剛體分件動畫）。這樣 14-dog 的行為程式（走、坐、翻肚、叼 CD、吃蘋果、頂球）完全不用改。

轉檔時做的事：
  - 整隻放大 K 倍（烘進頂點和骨頭位移），單位和前五隻接近。
  - 模型本來就是 Y 向上、臉朝 +Z，所以根節點預先轉 -90° X，抵銷載入程式的 +90° 轉正（同 build_pug.py）。
  - 寶貝球（pokeball_*）和帽子（hat_*）不放進來（寶貝球貼圖在 models/pikachu/src/extra/ 備用；帽子是衣櫃飾品）。
  - 脖子：原模型的頭和身體之間有縫，頭一轉就露出來，所以另外補一個橢球（沿高度在 chest / neck / head 三根骨頭之間平滑混合權重），像脖子一樣把兩邊連起來。
  - 材質依貼圖分成 yellow / body / tail / ear / face / eyes 六個，
    json 的 `mats` 記錄每個材質用哪張貼圖，載入程式（02-dog2.js）據此建材質；臉和眼睛的表情貼圖也列在 `alt`。
"""
import os, json
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models', 'pikachu', 'src', 'pika.obj')
OUT = os.path.join(ROOT, 'models')
K = 125.0

# 群組名稱前綴 -> (材質, 骨頭)
# 左 = +x（模型的 legl / arml 在 +x 側）
def classify(g):
    if g.startswith('pokeball'):
        return None
    if g.startswith('tail'):
        n = g[-3:]
        return 'tail', {'030': 'tail1', '029': 'tail2', '028': 'tail3'}[n]
    if g.startswith('legl'): return 'yellow', 'Lleg1'
    if g.startswith('legr'): return 'yellow', 'Rleg1'
    if g.startswith('arml'): return 'yellow', 'Larm1'
    if g.startswith('armr'): return 'yellow', 'Rarm1'
    if g.startswith('head_134F007'):
        return 'ear', 'Lear1' if g.endswith('016') else 'Rear1'   # 016 在 +x，017 在 -x（見下方 assert）
    if g.startswith('hat_'): return None   # 帽子另外做成衣櫃飾品，見 tools/build_pikachu_hat.py
    if g.startswith('head_50E7A230'): return 'eyes', 'head'
    if g.startswith('head_4E4DF27D'): return 'face', 'head'
    if g.startswith('head_'): return 'yellow', 'head'
    if g.startswith('body_5E589416'): return 'body', 'waist'
    if g.startswith('body_yellow'): return 'yellow', 'waist'
    raise ValueError(g)

# 骨頭：名稱 -> (父, 世界座標 pivot，原始 obj 單位)
BONES = [
    ('skl_root', None,       (0, .10, -.01)),
    ('waist',    'skl_root', (0, .12, 0)),
    ('chest',    'waist',    (0, .16, 0)),
    ('neck',     'chest',    (0, .19, 0)),
    ('head',     'neck',     (0, .205, .01)),
    ('Lear1',    'head',     (.05, .29, -.01)),
    ('Rear1',    'head',     (-.05, .29, -.01)),
    ('tail1',    'skl_root', (0, .06, -.12)),
    ('tail2',    'tail1',    (.03, .09, -.15)),
    ('tail3',    'tail2',    (.05, .14, -.16)),
    ('Larm1',    'chest',    (.085, .16, .04)),
    ('Rarm1',    'chest',    (-.085, .16, .04)),
    ('Lleg1',    'skl_root', (.07, .11, .01)),
    ('Rleg1',    'skl_root', (-.07, .11, .01)),
]

TEX = {'yellow': 'yellow', 'body': 'body', 'tail': 'tail', 'ear': 'ear', 'face': 'face', 'eyes': 'eyes'}
ALT = {'face': {'wavy': 'face_wavy', 'tongue': 'face_tongue', 'cyan': 'face_cyan', 'white': 'face_white'},
       'eyes': {'closed': 'eyes_closed', 'big': 'eyes_big', 'drop': 'eyes_drop'}}


def neck_tris(seg=10, ring=6):
    """脖子橢球：中心、半徑單位 = obj 單位 × K；頂點權重隨高度在 chest -> neck -> head 之間平滑過渡。"""
    C = np.array((0, .185, .005)) * K
    R = np.array((.062, .058, .058)) * K
    y0, y1 = .135 * K, .24 * K
    bi = {b[0]: i for i, b in enumerate(BONES)}

    def vert(a, b):   # a = 緯度 0..pi，b = 經度 0..2pi
        d = np.array((np.sin(a) * np.cos(b), np.cos(a), np.sin(a) * np.sin(b)))
        p = C + d * R
        nrm = d / R
        nrm /= np.linalg.norm(nrm)
        t = float(np.clip((p[1] - y0) / (y1 - y0), 0, 1))
        wc, wh = max(0, 1 - 2 * t), max(0, 2 * t - 1)
        w = [(bi['chest'], wc), (bi['neck'], 1 - wc - wh), (bi['head'], wh)]
        return p, nrm, [x for x in w if x[1] > 1e-6]

    tris = []
    for i in range(ring):
        for j in range(seg):
            a0, a1 = np.pi * i / ring, np.pi * (i + 1) / ring
            b0, b1 = 2 * np.pi * j / seg, 2 * np.pi * (j + 1) / seg
            q = [vert(a0, b0), vert(a1, b0), vert(a1, b1), vert(a0, b1)]
            tris += [(q[0], q[2], q[1]), (q[0], q[3], q[2])]   # 逆時針＝朝外
    return tris


def main():
    V, VT, VN = [], [], []
    grp = None
    G = {}
    order = []
    for line in open(SRC):
        p = line.split()
        if not p:
            continue
        if p[0] == 'v': V.append([float(x) for x in p[1:4]])
        elif p[0] == 'vt': VT.append([float(x) for x in p[1:3]])
        elif p[0] == 'vn': VN.append([float(x) for x in p[1:4]])
        elif p[0] == 'g':
            grp = p[1]; G[grp] = []; order.append(grp)
        elif p[0] == 'f':
            assert len(p) == 4, 'only triangles'
            G[grp].append([tuple(int(x) - 1 for x in t.split('/')) for t in p[1:]])
    V = np.array(V) * K

    # 左右耳：確認 016 在 +x
    def cx(g):
        return np.mean([V[t[0]][0] for f in G[g] for t in f])
    assert cx('head_134F007_0_016') > 0 > cx('head_134F007_0_017')

    nodes = [{'n': '', 't': 'G', 'p': -1, 'pos': [0, 0, 0], 'q': [-np.sqrt(.5), 0, 0, np.sqrt(.5)], 's': [1, 1, 1], 'skinned': False}]
    idx, wpos = {}, {}
    for name, par, w in BONES:
        w = np.array(w) * K
        wpos[name] = w
        local = w - (wpos[par] if par else 0)
        idx[name] = len(nodes)
        nodes.append({'n': name, 't': 'B', 'p': idx[par] if par else 0, 'pos': local.tolist(), 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': False})
    bone_nodes = [idx[b[0]] for b in BONES]
    bone_index = {b[0]: i for i, b in enumerate(BONES)}
    nj = len(BONES)

    inv_out = np.zeros((nj, 16), dtype=np.float32)
    for i, (name, _, _) in enumerate(BONES):
        m = np.eye(4)
        m[:3, 3] = -wpos[name]
        inv_out[i] = m.T.reshape(-1)

    chunks, meshes = [], []
    off = 0

    def put(arr):
        nonlocal off
        b = np.ascontiguousarray(arr).tobytes()
        o = off
        chunks.append(b)
        off += len(b)
        while off % 4:
            chunks.append(b'\0')
            off += 1
        return o

    by_mat = {}
    for g in order:
        c = classify(g)
        if not c or not G[g]:
            continue
        by_mat.setdefault(c[0], []).append((g, c[1]))

    for mat in ['yellow', 'body', 'tail', 'ear', 'face', 'eyes']:
        pos, nor, uv, sk = [], [], [], []
        for g, bone in by_mat[mat]:
            for f in G[g]:
                for t in f:
                    pos.append(V[t[0]]); uv.append(VT[t[1]]); nor.append(VN[t[2]]); sk.append([(bone_index[bone], 1.0)])
        if mat == 'yellow':
            for tri in neck_tris():
                for (pv, nv, w) in tri:
                    pos.append(pv); nor.append(nv); uv.append([0, 0]); sk.append(w)
        n = len(pos)
        a = {}
        a['position'] = {'off': put(np.array(pos, dtype=np.float32)), 'count': n, 'size': 3}
        a['normal'] = {'off': put(np.array(nor, dtype=np.float32)), 'count': n, 'size': 3}
        a['uv'] = {'off': put(np.array(uv, dtype=np.float32)), 'count': n, 'size': 2}
        s4 = np.zeros((n, 4), dtype=np.uint16)
        w4 = np.zeros((n, 4), dtype=np.float32)
        for i, ws in enumerate(sk):
            for j, (b, w) in enumerate(ws):
                s4[i, j] = b; w4[i, j] = w
        a['skinIndex'] = {'off': put(s4), 'count': n, 'size': 4}
        a['skinWeight'] = {'off': put(w4), 'count': n, 'size': 4}
        mi = len(nodes)
        nodes.append({'n': 'pikachu_' + mat, 't': 'M', 'p': 0, 'pos': [0, 0, 0], 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': True})
        meshes.append({'node': mi, 'bind': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 'bones': bone_nodes, 'attrs': a,
                       'inv': put(inv_out), 'mat': mat})

    meta = {'nodes': nodes, 'meshes': meshes, 'tex': TEX, 'alt': ALT}
    with open(os.path.join(OUT, 'pikachu.bin'), 'wb') as f:
        f.write(b''.join(chunks))
    with open(os.path.join(OUT, 'pikachu.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    allv = np.array([p for m in meshes for p in []]) if False else None
    ys = V[:, 1]
    print('pikachu: %d nodes, %d meshes, %d bytes; scaled y range %.1f..%.1f' % (len(nodes), len(meshes), off, V[:, 1].min(), V[:, 1].max()))
    for m in meshes:
        print(' ', m['mat'], m['attrs']['position']['count'] // 3, 'tris')


if __name__ == '__main__':
    main()
