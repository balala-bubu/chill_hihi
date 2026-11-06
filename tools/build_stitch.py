#!/usr/bin/env python3
"""把 Stitch_rigged.dae（史迪奇）轉成頁面用的 models/stitch.json/.bin（貼圖放 models/stitch/）。

用法：
    python3 tools/build_stitch.py

來源 models/stitch/src/Stitch_rigged.dae：一個網格（834 頂點）、23 根關節、每個頂點 100% 綁一根骨頭（剛體分件），Y 向上、臉朝 +Z、腳底 y=0，原檔是 T-pose。
沒有法線（只有位置／UV／頂點色），所以依三角形自己算（相同位置的頂點合併計算，貼圖接縫不會有明暗斷層）。頂點色（0.6~1.0 的烘焙明暗）不用，改由頁面的燈光打。
做法同吉伊卡哇／奇諾比奧（見 tools/build_toad.py）：把 23 根關節收成「假骨架」，骨頭名稱比照狗，14-dog 的行為程式不用改：
    b_L_thigh/calf/foot → Lleg1　b_R_* → Rleg1　b_L_upperarm/forearm/hand → Larm1　b_R_* → Rarm1
    b_L_ear01/02 → Lear1　b_R_ear01/02 → Rear1　b_head／b_mouth → head
    b_root／b_spine（身體）→ 依高度在 skl_root / waist / chest 之間平滑混合（彎腰時身體不會裂開）
    屁股後面的小尾巴 → tail1
貼圖（原檔 ST_01~04，放 models/stitch/，走和皮卡丘一樣的像素貼圖路徑，NearestFilter）：
    head＝ST_01（頭＋嘴）　belly＝ST_02（身體）　skin＝ST_03（手、耳朵、腳、頭頂的毛，三個材質共用同張圖）　eyes＝ST_04（眼睛）
"""
import os, json
import numpy as np
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models', 'stitch', 'src', 'Stitch_rigged.dae')
OUT = os.path.join(ROOT, 'models')
K = 4.2             # 放大倍數：身高（腳到頭頂）12.3 -> 約 52，和吉伊卡哇／奇諾比奧差不多高
ARM_DOWN = 58.0     # 度：原檔是 T-pose，把手臂頂點繞肩膀轉下來
NS = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}

# 骨頭：名稱 -> (父, pivot（dae 單位，腳底為原點）)
BONES = [
    ('skl_root', None, (0, 2.39, 0)),
    ('waist', 'skl_root', (0, 3.6, 0)),
    ('chest', 'waist', (0, 5.2, 0)),
    ('neck', 'chest', (0, 7.3, 0)),
    ('head', 'neck', (0, 7.7, 0)),
    ('tail1', 'skl_root', (0, 3.3, -1.2)),
    ('Lear1', 'head', (2.3, 9.28, -1.4)),
    ('Rear1', 'head', (-2.3, 9.28, -1.4)),
    ('Larm1', 'chest', (1.6, 7.0, 0)),
    ('Rarm1', 'chest', (-1.6, 7.0, 0)),
    ('Lleg1', 'skl_root', (1.89, 2.39, 0)),
    ('Rleg1', 'skl_root', (-1.89, 2.39, 0)),
]
BI = {b[0]: i for i, b in enumerate(BONES)}
# dae 關節（joint0..22）-> 假骨架；None = 身體，依高度混合
J2B = {0: 'skl_root', 1: None, 2: 'Lleg1', 3: 'Lleg1', 4: 'Lleg1', 5: 'Rleg1', 6: 'Rleg1', 7: 'Rleg1', 8: None, 9: 'head',
       10: 'chest', 11: 'chest', 12: 'Larm1', 13: 'Larm1', 14: 'Larm1', 15: 'Rarm1', 16: 'Rarm1', 17: 'Rarm1',
       18: 'Rear1', 19: 'Rear1', 20: 'Lear1', 21: 'Lear1', 22: 'head'}
# polylist 材質 -> 輸出網格（名稱, 貼圖）
GROUPS = [('head', 'ST_01', ['material0']), ('belly', 'ST_02', ['material1']), ('skin', 'ST_03', ['material2', 'material3', 'material4']), ('eyes', 'ST_04', ['material5'])]


def fl(e):
    return np.array(e.text.split(), dtype=float)


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def main():
    r = ET.parse(SRC).getroot()
    mesh = r.find('.//c:geometry', NS).find('c:mesh', NS)
    srcs = mesh.findall('c:source', NS)
    P = fl(srcs[0][0]).reshape(-1, 3)
    UV = fl(srcs[1][0]).reshape(-1, 2)
    sk = r.find('.//c:controller', NS).find('c:skin', NS)
    vw = sk.find('c:vertex_weights', NS)
    vcs = np.array(vw.find('c:vcount', NS).text.split(), dtype=int)
    vv = np.array(vw.find('c:v', NS).text.split(), dtype=int)
    assert (vcs == 1).all()
    vj = vv[0::2]
    polys = {p.get('material'): np.array(p.find('c:p', NS).text.split(), dtype=int).reshape(-1, 3) for p in mesh.findall('c:polylist', NS)}
    vmat = np.zeros(len(P), dtype=int)
    for m, t in polys.items():
        vmat[np.unique(t)] = int(m[-1])
    # ---- 法線：相同位置合併，面積加權 ----
    allt = np.concatenate(list(polys.values()))
    fn = np.cross(P[allt[:, 1]] - P[allt[:, 0]], P[allt[:, 2]] - P[allt[:, 0]])
    cen = P[allt].mean(1)
    head_c = P[vmat == 0].mean(0)
    agree = ((fn * (cen - head_c)).sum(1) > 0).mean()
    flip = False
    ht = polys['material0']
    hf = np.cross(P[ht[:, 1]] - P[ht[:, 0]], P[ht[:, 2]] - P[ht[:, 0]])
    ha = ((hf * (P[ht].mean(1) - head_c)).sum(1) > 0).mean()
    if ha < .5:
        flip = True
    print('winding: head agree %.2f (%s)' % (ha, 'flipped' if flip else 'ok'))
    if flip:
        polys = {m: t[:, ::-1] for m, t in polys.items()}
        allt = allt[:, ::-1]
        fn = -fn
    key = {}
    for i, p in enumerate(np.round(P, 4)):
        key.setdefault(tuple(p), []).append(i)
    N = np.zeros_like(P)
    acc = np.zeros_like(P)
    for t, f in zip(allt, fn):
        for i in t:
            acc[i] += f
    for ids in key.values():
        s = acc[ids].sum(0)
        N[ids] = s / (np.linalg.norm(s) + 1e-12)
    # ---- 權重：每個頂點 -> 骨頭權重向量 ----
    W = np.zeros((len(P), len(BONES)))
    for i in range(len(P)):
        b = J2B[vj[i]]
        y = P[i, 1]
        if b is None:   # 身體：skl_root -> waist -> chest 隨高度混合
            wc = float(smooth(y, 4.5, 6.5))
            wr = 1 - float(smooth(y, 2.2, 4.2))
            wr = min(wr, 1 - wc)
            W[i, BI['chest']] = wc; W[i, BI['skl_root']] = wr; W[i, BI['waist']] = 1 - wc - wr
            if vj[i] == 1 and vmat[i] == 4 and P[i, 2] < -1.2 and y > 2.6:   # 屁股後面的小尾巴
                W[i] = 0; W[i, BI['tail1']] = 1
        else:
            W[i, BI[b]] = 1
    print('tail verts:', int((W[:, BI['tail1']] > .5).sum()))
    # ---- T-pose -> 手臂垂下 ----
    a_ = np.radians(ARM_DOWN)
    for bn, sg in (('Larm1', -1), ('Rarm1', 1)):
        sel = W[:, BI[bn]] > .5
        c_, s_ = np.cos(sg * a_), np.sin(sg * a_)
        R = np.array([[c_, -s_, 0], [s_, c_, 0], [0, 0, 1]])
        piv = np.array(BONES[BI[bn]][2])
        P[sel] = (P[sel] - piv) @ R.T + piv
        N[sel] = N[sel] @ R.T
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
    tex = {}
    for gname, texname, mats_ in GROUPS:
        tri = np.concatenate([polys[m] for m in mats_])
        u = np.unique(tri)
        remap = np.full(len(P), -1); remap[u] = np.arange(len(u))
        tri = remap[tri]
        pos, nor, uv, W_ = P[u] * K, N[u], UV[u], W[u]
        top = np.argsort(-W_, axis=1)[:, :4]
        s4 = top.astype(np.uint16)
        w4 = np.take_along_axis(W_, top, 1)
        w4 /= w4.sum(1, keepdims=True)
        yr = [min(yr[0], pos[:, 1].min()), max(yr[1], pos[:, 1].max())]
        xr = [min(xr[0], pos[:, 0].min()), max(xr[1], pos[:, 0].max())]
        a = {}
        a['position'] = {'off': put(pos.astype(np.float32)), 'count': len(u), 'size': 3}
        a['normal'] = {'off': put(nor.astype(np.float32)), 'count': len(u), 'size': 3}
        a['uv'] = {'off': put(uv.astype(np.float32)), 'count': len(u), 'size': 2}
        a['skinIndex'] = {'off': put(s4), 'count': len(u), 'size': 4}
        a['skinWeight'] = {'off': put(w4.astype(np.float32)), 'count': len(u), 'size': 4}
        ind = tri.reshape(-1).astype(np.uint32)
        mi = len(nodes)
        nodes.append({'n': 'stitch_' + gname, 't': 'M', 'p': 0, 'pos': [0, 0, 0], 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': True})
        meshes.append({'node': mi, 'bind': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 'bones': bone_nodes, 'attrs': a,
                       'index': put(ind), 'indexCount': int(len(ind)), 'inv': put(inv_out), 'mat': gname})
        tex[gname] = texname
        print('%s: %d verts, %d tris' % (gname, len(u), len(tri)))
    meta = {'nodes': nodes, 'meshes': meshes, 'tex': tex, 'double': ['skin', 'head'], 'K': K}
    with open(os.path.join(OUT, 'stitch.bin'), 'wb') as f:
        f.write(b''.join(chunks))
    with open(os.path.join(OUT, 'stitch.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    print('stitch: %d meshes, %d bytes, y %.1f..%.1f, x %.1f..%.1f' % (len(meshes), off, yr[0], yr[1], xr[0], xr[1]))


if __name__ == '__main__':
    main()
