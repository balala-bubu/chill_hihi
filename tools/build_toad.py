#!/usr/bin/env python3
"""把 Toad_custom_rig.dae（奇諾比奧）轉成頁面用的 models/toad.json/.bin。

用法：
    python3 tools/build_toad.py

來源 models/toad/src/Toad_custom_rig.dae 是有骨架的版本（21 根關節，4 個蒙皮網格，每個頂點 100% 綁一根骨頭，剛體分件）：
    Limbs（78 頂點）：左右手臂 joint9／joint6、左右腳 joint17／joint13，貼圖＝調色盤 vertexColors（32x4，8 色，UV 只是一個點）
    Body（52 頂點）：身體 joint18（BodyJ）、背心 joint19（VestJ），同樣是調色盤
    Face（26 頂點）：頭（皮膚＋眼睛）joint21（HeadJ），貼圖 face.png（128x64，臉在左上角 32x32，UV 超出 0..1 會重複）
    Cap（37 頂點）：蘑菇帽 joint21，貼圖 cap.png（64x64，白底紅點）
做法同吉伊卡哇（見 tools/build_chiikawa.py）：把這 21 根骨頭收成 12 根「假骨架」，骨頭名稱比照狗，所以 14-dog 的行為程式不用改：
    joint6→Rarm1  joint9→Larm1  joint13→Rleg1  joint17→Lleg1  joint18/19→chest  joint21→head
（waist／neck／skl_root／tail1 只當關節用，沒有頂點。）

轉檔時做的事：
  - dae 的頂點、法線、UV 是三組獨立索引，展開成「每個三角形角一個頂點」（共用同一組 (位置,法線,UV) 的合併）。
  - 座標原本就是 Y 向上、臉朝 +Z、腳底在 y≈0；放大 K 倍。根節點預先轉 -90° X，抵銷載入程式的 +90° 轉正（同皮卡丘／吉伊卡哇）。
  - 三角形繞向和法線不一致時整個網格翻面。
  - json 的 `tex` 把材質對到貼圖檔（走和皮卡丘一樣的像素貼圖路徑，NearestFilter）。
"""
import os, json, re
import numpy as np
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models', 'toad', 'src', 'Toad_custom_rig.dae')
OUT = os.path.join(ROOT, 'models')
K = 50.0
ARM_DOWN = 62.0   # 度：原檔是 T-pose（手臂水平伸出），把手臂頂點繞肩膀轉下來，讓手自然垂在身側（再往外開 90-ARM_DOWN 度，不會穿進身體）
NS = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}

# 骨頭：名稱 -> (父, pivot（腳底為原點，dae 單位）)
BONES = [
    ('skl_root', None, (0, .157, .018)),
    ('waist', 'skl_root', (0, .20, .02)),
    ('chest', 'waist', (0, .26, .02)),
    ('neck', 'chest', (0, .34, .01)),
    ('head', 'neck', (0, .37, 0)),
    ('tail1', 'skl_root', (0, .12, -.10)),
    ('Larm1', 'chest', (.13, .30, -.004)),
    ('Rarm1', 'chest', (-.13, .30, -.004)),
    ('Lleg1', 'skl_root', (.095, .157, .018)),
    ('Rleg1', 'skl_root', (-.095, .157, .018)),
]
BI = {b[0]: i for i, b in enumerate(BONES)}
J2B = {'joint6': 'Rarm1', 'joint9': 'Larm1', 'joint13': 'Rleg1', 'joint17': 'Lleg1', 'joint18': 'chest', 'joint19': 'chest', 'joint21': 'head'}
# 蒙皮控制器 -> (網格名稱, 材質名稱)
PARTS = [('ID44', 'Limbs', 'palette'), ('ID59', 'Body', 'palette'), ('ID74', 'Face', 'face'), ('ID89', 'Cap', 'cap')]
TEX = {'palette': 'pal', 'face': 'face', 'cap': 'cap'}


def fl(e):
    return np.array(e.text.split(), dtype=float)


def read_part(r, ctlid):
    ctl = [c for c in r.findall('.//c:controller', NS) if c.get('id') == ctlid][0]
    sk = ctl.find('c:skin', NS)
    src = sk.get('source')[1:]
    mesh = [g for g in r.findall('.//c:geometry', NS) if g.get('id') == src][0].find('c:mesh', NS)
    srcs = {s.get('id'): s for s in mesh.findall('c:source', NS)}
    pl = mesh.find('c:polylist', NS)
    ins = {i.get('semantic'): (i.get('source')[1:], int(i.get('offset'))) for i in pl.findall('c:input', NS)}
    vx = mesh.find('c:vertices', NS)
    vpos = [i.get('source')[1:] for i in vx.findall('c:input', NS) if i.get('semantic') == 'POSITION'][0]
    P = fl(srcs[vpos].find('c:float_array', NS)).reshape(-1, 3)
    N = fl(srcs[ins['NORMAL'][0]].find('c:float_array', NS)).reshape(-1, 3)
    UV = fl(srcs[ins['TEXCOORD'][0]].find('c:float_array', NS)).reshape(-1, 2)
    assert (np.array(pl.find('c:vcount', NS).text.split(), dtype=int) == 3).all()
    p = np.array(pl.find('c:p', NS).text.split(), dtype=int).reshape(-1, len(ins))
    bsm = fl(sk.find('c:bind_shape_matrix', NS)).reshape(4, 4)
    P = (np.c_[P, np.ones(len(P))] @ bsm.T)[:, :3]
    # 蒙皮：每個頂點的 (關節, 權重)
    jn = ctl.find('.//c:Name_array', NS).text.split()
    wts = None
    for s in sk.findall('c:source', NS):
        fa = s.find('c:float_array', NS)
        if fa is not None and int(fa.get('count')) != 16 * len(jn):
            wts = fl(fa)
    vw = sk.find('c:vertex_weights', NS)
    vcs = np.array(vw.find('c:vcount', NS).text.split(), dtype=int)
    vv = np.array(vw.find('c:v', NS).text.split(), dtype=int)
    k, SK = 0, []
    for c in vcs:
        SK.append([(jn[vv[k + 2 * i]], wts[vv[k + 2 * i + 1]]) for i in range(c)])
        k += 2 * c
    return dict(P=P, N=N, UV=UV, idx=p, ins=ins, SK=SK)


def main():
    r = ET.parse(SRC).getroot()
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
    for ctl, gname, mname in PARTS:
        g = read_part(r, ctl)
        vo, no, to = g['ins']['VERTEX'][1], g['ins']['NORMAL'][1], g['ins']['TEXCOORD'][1]
        # 展開：每個 (頂點, 法線, uv) 組合一個新頂點
        key2new, pos, nor, uv, bone_w, tri = {}, [], [], [], [], []
        for c in g['idx']:
            kk = (c[vo], c[no], c[to])
            if kk not in key2new:
                key2new[kk] = len(pos)
                pos.append(g['P'][c[vo]]); nor.append(g['N'][c[no]]); uv.append(g['UV'][c[to]])
                W = np.zeros(len(BONES))
                for j, w in g['SK'][c[vo]]:
                    W[BI[J2B[j]]] += w
                bone_w.append(W)
            tri.append(key2new[kk])
        pos, nor, uv, bone_w = np.array(pos), np.array(nor), np.array(uv), np.array(bone_w)
        tri = np.array(tri, dtype=np.uint32).reshape(-1, 3)
        # 繞向：三角形的面法線和頂點法線平均要同向，否則翻面
        fn = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])
        vn = nor[tri].sum(1)
        agree = ((fn * vn).sum(1) > 0).mean()
        if agree < .5:
            tri = tri[:, ::-1]
        print('%s: %d verts, %d tris, winding agree %.2f%s' % (gname, len(pos), len(tri), agree, ' (flipped)' if agree < .5 else ''))
        W = bone_w / bone_w.sum(1, keepdims=True)
        # T-pose -> 手臂垂下：左手（+x）繞 z 軸轉 -ARM_DOWN，右手轉 +ARM_DOWN（繞各自的肩膀 pivot），法線一起轉
        a_ = np.radians(ARM_DOWN)
        for bn, sg in (('Larm1', -1), ('Rarm1', 1)):
            sel = W[:, BI[bn]] > .5
            if not sel.any():
                continue
            c_, s_ = np.cos(sg * a_), np.sin(sg * a_)
            R = np.array([[c_, -s_, 0], [s_, c_, 0], [0, 0, 1]])
            piv = np.array(BONES[BI[bn]][2])
            pos[sel] = (pos[sel] - piv) @ R.T + piv
            nor[sel] = nor[sel] @ R.T
        top = np.argsort(-W, axis=1)[:, :4]
        s4 = top.astype(np.uint16)
        w4 = np.take_along_axis(W, top, 1)
        w4 /= w4.sum(1, keepdims=True)
        Pk = pos * K
        yr = [min(yr[0], Pk[:, 1].min()), max(yr[1], Pk[:, 1].max())]
        a = {}
        a['position'] = {'off': put(Pk.astype(np.float32)), 'count': len(pos), 'size': 3}
        a['normal'] = {'off': put(nor.astype(np.float32)), 'count': len(pos), 'size': 3}
        a['uv'] = {'off': put(uv.astype(np.float32)), 'count': len(pos), 'size': 2}
        a['skinIndex'] = {'off': put(s4), 'count': len(pos), 'size': 4}
        a['skinWeight'] = {'off': put(w4.astype(np.float32)), 'count': len(pos), 'size': 4}
        ind = tri.reshape(-1).astype(np.uint32)
        mi = len(nodes)
        nodes.append({'n': 'toad_' + gname, 't': 'M', 'p': 0, 'pos': [0, 0, 0], 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': True})
        meshes.append({'node': mi, 'bind': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 'bones': bone_nodes, 'attrs': a,
                       'index': put(ind), 'indexCount': int(len(ind)), 'inv': put(inv_out), 'mat': mname})
    meta = {'nodes': nodes, 'meshes': meshes, 'tex': TEX, 'K': K}
    with open(os.path.join(OUT, 'toad.bin'), 'wb') as f:
        f.write(b''.join(chunks))
    with open(os.path.join(OUT, 'toad.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    print('toad: %d meshes, %d bytes, y %.1f..%.1f' % (len(meshes), off, yr[0], yr[1]))


if __name__ == '__main__':
    main()
