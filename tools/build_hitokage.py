#!/usr/bin/env python3
"""把 Hitokage.dae（小火龍）轉成頁面用的 models/hitokage.json/.bin（貼圖放 models/hitokage/）。

用法：
    python3 tools/build_hitokage.py

來源 models/hitokage/src/Hitokage.dae：兩個網格（身體 4002 頂點／1338 面、眼睛 108 頂點／36 面）、24 根關節、每頂點最多 4 根骨頭權重，
Z 向上、臉朝 +X、左手在 +Y，腳底 z=0，手臂是 T-pose，v 座標是負的（-1..0）。
轉檔：座標軸 (x,y,z) -> (y,z,x)（循環排列，不用翻面）＝ Y 向上、臉朝 +Z、左手在 +X；v -> 1+v；
把 24 根關節收成「假骨架」（骨頭名稱比照狗，14-dog 的行為程式不用改），權重直接用原檔的蒙皮，同一根假骨頭的權重加總：
    Hitokage/Origin/Waist → skl_root　Spine → waist／chest 隨高度混合　Neck → neck　Head/FLAME/Jaw → head
    LThigh/LLeg/LFoot/LToe → Lleg1　RThigh.. → Rleg1　LArm/LForeArm → Larm1　RArm/RForeArm → Rarm1
    Tail → tail1　Tail1 → tail2　Tail2/EfFire → tail3（尾巴和火焰會擺動）
手臂依 ARM_DOWN 繞肩膀轉下來（原檔是 T-pose）。法線由三角形自己算（相同位置的頂點合併，貼圖接縫不會有明暗斷層）。
貼圖（走和皮卡丘／史迪奇一樣的像素貼圖路徑，meta.tex）：body＝HitokageDh.png（256×256，身體＋嘴巴內部）、eyes＝HitokageEyeDh.png（128×256，2 欄×4 列的眼睛圖集）。
眼睛表情不換貼圖，只移動貼圖偏移：meta.cells = {mat:'eyes', cols:2, rows:4, expr:{名稱:[欄,列]}}，頁面的 dogCellFx 依狀態挑格子（眨眼、開心、暈眼…）。
"""
import os, json
import numpy as np
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models', 'hitokage', 'src', 'Hitokage.dae')
OUT = os.path.join(ROOT, 'models')
K = 9.5             # 放大倍數：身高（腳到頭頂）5.48 -> 約 52，和吉伊卡哇／史迪奇差不多高
ARM_DOWN = 55.0     # 度：原檔是 T-pose，把手臂頂點繞肩膀轉下來
NS = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}

# 骨頭：名稱 -> (父, pivot（轉換後座標，腳底為原點）)；從原檔關節位置換軸 (x,y,z)->(y,z,x) 取得
BONES = [
    ('skl_root', None, (0, 1.574, 0)),
    ('waist', 'skl_root', (0, 2.254, 0)),
    ('chest', 'waist', (0, 2.898, 0)),
    ('neck', 'chest', (0, 3.27, 0)),
    ('head', 'neck', (0, 3.576, 0)),
    ('tail1', 'skl_root', (0, 0.946, -0.808)),
    ('tail2', 'tail1', (0, 0.616, -2.217)),
    ('tail3', 'tail2', (0, 1.091, -3.496)),
    ('Larm1', 'chest', (0.576, 2.898, -0.034)),
    ('Rarm1', 'chest', (-0.576, 2.898, -0.034)),
    ('Lleg1', 'skl_root', (0.801, 1.625, -0.251)),
    ('Rleg1', 'skl_root', (-0.801, 1.625, -0.251)),
]
BI = {b[0]: i for i, b in enumerate(BONES)}
# dae 關節 -> 假骨架；None = Spine，依高度在 waist / chest 之間混合
J2B = {'Hitokage': 'skl_root', 'Origin': 'skl_root', 'Waist': 'skl_root', 'Spine': None, 'Neck': 'neck', 'Head': 'head', 'FLAME': 'head', 'Jaw': 'head',
       'LThigh': 'Lleg1', 'LLeg': 'Lleg1', 'LFoot': 'Lleg1', 'LToe': 'Lleg1', 'RThigh': 'Rleg1', 'RLeg': 'Rleg1', 'RFoot': 'Rleg1', 'RToe': 'Rleg1',
       'LArm': 'Larm1', 'LForeArm': 'Larm1', 'RArm': 'Rarm1', 'RForeArm': 'Rarm1',
       'Tail': 'tail1', 'Tail1': 'tail2', 'Tail2': 'tail3', 'EfFire': 'tail3'}


def fl(e):
    return np.array(e.text.split(), dtype=float)


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def axes(a):   # (x,y,z) -> (y,z,x)
    return a[..., [1, 2, 0]]


def load(r, gi):
    geom = r.findall('.//c:geometry', NS)[gi]
    ctrl = r.findall('.//c:controller', NS)[gi]
    mesh = geom.find('c:mesh', NS)
    srcs = mesh.findall('c:source', NS)
    P = axes(fl(srcs[0][0]).reshape(-1, 3))
    UV = fl(srcs[2][0]).reshape(-1, 2).copy()
    UV[:, 1] += 1.0
    tri = np.array(mesh.find('c:triangles', NS).find('c:p', NS).text.split(), dtype=int).reshape(-1, 3)
    sk = ctrl.find('c:skin', NS)
    names = sk.find('c:source', NS).find('c:Name_array', NS).text.split()
    ws = fl(sk.findall('c:source', NS)[2][0])
    vw = sk.find('c:vertex_weights', NS)
    vc = np.array(vw.find('c:vcount', NS).text.split(), dtype=int)
    v = np.array(vw.find('c:v', NS).text.split(), dtype=int)
    W = np.zeros((len(P), len(BONES)))
    pos = 0
    for i, n in enumerate(vc):
        for k in range(n):
            j, w = v[pos], ws[v[pos + 1]]
            pos += 2
            b = J2B[names[j]]
            if b is None:   # Spine：waist / chest 隨高度混合
                wc = float(smooth(P[i, 1], 2.3, 2.9))
                W[i, BI['chest']] += w * wc
                W[i, BI['waist']] += w * (1 - wc)
            else:
                W[i, BI[b]] += w
    s = W.sum(1, keepdims=True)
    assert (s > 0).all()
    return P, UV, tri, W / s


def normals(P, tri):
    fn = np.cross(P[tri[:, 1]] - P[tri[:, 0]], P[tri[:, 2]] - P[tri[:, 0]])
    key = {}
    for i, p in enumerate(np.round(P, 4)):
        key.setdefault(tuple(p), []).append(i)
    acc = np.zeros_like(P)
    for t, f in zip(tri, fn):
        for i in t:
            acc[i] += f
    N = np.zeros_like(P)
    for ids in key.values():
        s = acc[ids].sum(0)
        N[ids] = s / (np.linalg.norm(s) + 1e-12)
    return N


def main():
    r = ET.parse(SRC).getroot()
    body = load(r, 1)
    eyes = load(r, 0)
    # 身體的捲繞方向：面法線應朝外（相對於身體中心）
    P, UV, tri, W = body
    fn = np.cross(P[tri[:, 1]] - P[tri[:, 0]], P[tri[:, 2]] - P[tri[:, 0]])
    agree = ((fn * (P[tri].mean(1) - P.mean(0))).sum(1) > 0).mean()
    print('winding: body agree %.2f' % agree)
    meshes_in = []
    for nm, (P, UV, tri, W) in (('body', body), ('eyes', eyes)):
        if agree < .5:
            tri = tri[:, ::-1]
        N = normals(P, tri)
        # T-pose -> 手臂垂下
        a_ = np.radians(ARM_DOWN)
        for bn, sg in (('Larm1', -1), ('Rarm1', 1)):
            sel = W[:, BI[bn]] > .5
            c_, s_ = np.cos(sg * a_), np.sin(sg * a_)
            R = np.array([[c_, -s_, 0], [s_, c_, 0], [0, 0, 1]])
            piv = np.array(BONES[BI[bn]][2])
            P = P.copy()
            P[sel] = (P[sel] - piv) @ R.T + piv
            N[sel] = N[sel] @ R.T
        meshes_in.append((nm, P, N, UV, tri, W))
    # ---- 骨架節點 ----
    nodes = [{'n': '', 't': 'G', 'p': -1, 'pos': [0, 0, 0], 'q': [-np.sqrt(.5), 0, 0, np.sqrt(.5)], 's': [1, 1, 1], 'skinned': False}]
    idx, wpos = {}, {}
    for name, par_, w in BONES:
        w = np.array(w) * K
        wpos[name] = w
        local = w - (wpos[par_] if par_ else 0)
        idx[name] = len(nodes)
        nodes.append({'n': name, 't': 'B', 'p': idx[par_] if par_ else 0, 'pos': local.tolist(), 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': False})
    bone_nodes = [idx[b[0]] for b in BONES]
    inv_out = np.zeros((len(BONES), 16), dtype=np.float32)
    for i, (name, _, _) in enumerate(BONES):
        m = np.eye(4)
        m[:3, 3] = -wpos[name]
        inv_out[i] = m.T.reshape(-1)
    chunks, meshes, off = [], [], 0

    def put(arr):
        nonlocal off
        bb = np.ascontiguousarray(arr).tobytes()
        o = off
        chunks.append(bb)
        off += len(bb)
        while off % 4:
            chunks.append(b'\0')
            off += 1
        return o

    yr = [1e9, -1e9]
    xr = [1e9, -1e9]
    zr = [1e9, -1e9]
    for nm, P, N, UV, tri, W in meshes_in:
        pos = P * K
        top = np.argsort(-W, axis=1)[:, :4]
        s4 = top.astype(np.uint16)
        w4 = np.take_along_axis(W, top, 1)
        w4 /= w4.sum(1, keepdims=True)
        yr = [min(yr[0], pos[:, 1].min()), max(yr[1], pos[:, 1].max())]
        xr = [min(xr[0], pos[:, 0].min()), max(xr[1], pos[:, 0].max())]
        zr = [min(zr[0], pos[:, 2].min()), max(zr[1], pos[:, 2].max())]
        n_ = len(P)
        a = {}
        a['position'] = {'off': put(pos.astype(np.float32)), 'count': n_, 'size': 3}
        a['normal'] = {'off': put(N.astype(np.float32)), 'count': n_, 'size': 3}
        a['uv'] = {'off': put(UV.astype(np.float32)), 'count': n_, 'size': 2}
        a['skinIndex'] = {'off': put(s4), 'count': n_, 'size': 4}
        a['skinWeight'] = {'off': put(w4.astype(np.float32)), 'count': n_, 'size': 4}
        ind = tri.reshape(-1).astype(np.uint32)
        mi = len(nodes)
        nodes.append({'n': 'hitokage_' + nm, 't': 'M', 'p': 0, 'pos': [0, 0, 0], 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': True})
        meshes.append({'node': mi, 'bind': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 'bones': bone_nodes, 'attrs': a,
                       'index': put(ind), 'indexCount': int(len(ind)), 'inv': put(inv_out), 'mat': nm})
        print('%s: %d verts, %d tris, y %.1f..%.1f x %.1f..%.1f z %.1f..%.1f' % (nm, n_, len(tri), pos[:, 1].min(), pos[:, 1].max(), pos[:, 0].min(), pos[:, 0].max(), pos[:, 2].min(), pos[:, 2].max()))
        if nm == 'eyes':
            print('  eye centre', pos.mean(0))
        else:
            hs = W[:, BI['head']] > .5
            print('  head verts bbox', pos[hs].min(0), pos[hs].max(0))
    meta = {'nodes': nodes, 'meshes': meshes, 'tex': {'body': 'HitokageDh', 'eyes': 'HitokageEyeDh'},
            'cells': {'mat': 'eyes', 'cols': 2, 'rows': 4, 'expr': {'base': [0, 0], 'closed': [0, 2], 'happy': [1, 1], 'fierce': [1, 0], 'half': [0, 1], 'spiral': [1, 3]}}, 'K': K}
    with open(os.path.join(OUT, 'hitokage.bin'), 'wb') as f:
        f.write(b''.join(chunks))
    with open(os.path.join(OUT, 'hitokage.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    print('hitokage: %d meshes, %d bytes, y %.1f..%.1f, x %.1f..%.1f, z %.1f..%.1f' % (len(meshes), off, yr[0], yr[1], xr[0], xr[1], zr[0], zr[1]))


if __name__ == '__main__':
    main()
