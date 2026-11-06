#!/usr/bin/env python3
"""把第四隻（吉娃娃）（Chi_a，COLLADA .dae）轉成頁面用的 models/chihuahua.json + chihuahua.bin + 貼圖。

用法：
    python3 tools/build_chihuahua.py

來源在 models/chihuahua/src/（Chi_a.dae + 三張貼圖）。輸出：
    models/chihuahua.json / chihuahua.bin       節點、骨架、網格（格式和 dog.json 一樣）
    models/chihuahua_all.png / chihuahua_hand.png / chihuahua_eye.png

轉檔時做的事：
  - 整隻放大 K 倍（烘進頂點和骨頭位移，骨頭本身 scale 保持 1），
    這樣第四隻（吉娃娃）的骨頭座標單位和第一隻一樣，帽子、眼鏡、耳機的數字可以共用。
  - 模型原本就是 Y 向上、臉朝 +Z，所以根節點預先轉 -90° X，抵銷載入程式的 +90° 轉正。
  - 每個頂點只綁一根骨頭（權重 1）。
"""
import os, re, json, shutil, sys
import numpy as np
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models', 'chihuahua', 'src')
OUT = os.path.join(ROOT, 'models')
K = 14.0   # 放大倍率（第一隻狗的模型單位：頭高約 39，身長約 85）
NS = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}


def floats(el):
    return np.array(el.text.split(), dtype=np.float64)


def quat_from_mat(R):
    t = np.trace(R)
    if t > 0:
        s = np.sqrt(t + 1) * 2
        q = [(R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s, .25 * s]
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = np.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
        q = [.25 * s, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s, (R[2, 1] - R[1, 2]) / s]
    elif R[1, 1] > R[2, 2]:
        s = np.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
        q = [(R[0, 1] + R[1, 0]) / s, .25 * s, (R[1, 2] + R[2, 1]) / s, (R[0, 2] - R[2, 0]) / s]
    else:
        s = np.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
        q = [(R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, .25 * s, (R[1, 0] - R[0, 1]) / s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def main():
    tree = ET.parse(os.path.join(SRC, 'Chi_a.dae'))
    root = tree.getroot()
    geo = root.find('.//c:geometry/c:mesh', NS)
    src = {s.get('id'): s for s in geo.findall('c:source', NS)}
    pos = floats(src['positions'].find('c:float_array', NS)).reshape(-1, 3) * K
    uv = floats(src['texcoords'].find('c:float_array', NS)).reshape(-1, 2)
    nor = floats(src['normals'].find('c:float_array', NS)).reshape(-1, 3)
    nv = len(pos)
    assert len(uv) == nv and len(nor) == nv

    # --- skin: one joint per vertex
    skin = root.find('.//c:controller/c:skin', NS)
    jn = skin.find('.//c:Name_array', NS).text.split()
    inv_src = [s for s in skin.findall('c:source', NS) if s.get('id') == 'controller-bind-poses'][0]
    inv = floats(inv_src.find('c:float_array', NS)).reshape(-1, 4, 4)   # row-major, column vectors
    vw = skin.find('c:vertex_weights', NS)
    vcount = [int(x) for x in vw.find('c:vcount', NS).text.split()]
    v = [int(x) for x in vw.find('c:v', NS).text.split()]
    assert all(c == 1 for c in vcount) and len(vcount) == nv
    vj = np.array(v[0::2], dtype=np.uint16)
    nj = len(jn)

    # --- skeleton (visual scene)
    nodes = [{'n': '', 't': 'G', 'p': -1, 'pos': [0, 0, 0], 'q': [-np.sqrt(.5), 0, 0, np.sqrt(.5)], 's': [1, 1, 1], 'skinned': False}]
    idx = {}

    def walk(el, parent):
        for ch in el.findall('c:node', NS):
            if ch.get('type') != 'JOINT':
                continue
            M = floats(ch.find('c:matrix', NS)).reshape(4, 4)
            R = M[:3, :3]
            assert abs(np.linalg.det(R) - 1) < 1e-3 and np.allclose(R @ R.T, np.eye(3), atol=2e-3), ch.get('name')
            i = len(nodes)
            idx[ch.get('sid')] = i
            nodes.append({'n': ch.get('name'), 't': 'B', 'p': parent, 'pos': (M[:3, 3] * K).tolist(),
                          'q': quat_from_mat(R).tolist(), 's': [1, 1, 1], 'skinned': False})
            walk(ch, i)

    scene = root.find('.//c:visual_scene', NS)
    walk(scene, 0)
    assert len(idx) == nj, (len(idx), nj)
    bones = [idx[j] for j in jn]

    # --- inverse bind matrices, column-major for three.js, translation scaled by K
    inv_out = np.zeros((nj, 16), dtype=np.float32)
    for i in range(nj):
        m = inv[i].copy()
        m[:3, 3] *= K
        inv_out[i] = m.T.reshape(-1)

    # --- triangles per material
    mats = {'material0': 'all', 'material1': 'hand', 'material2': 'eye'}
    order = ['material0', 'material2', 'material1']   # body first
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

    for mname in order:
        pl = [p for p in geo.findall('c:polylist', NS) if p.get('material') == mname][0]
        assert all(int(c) == 3 for c in pl.find('c:vcount', NS).text.split())
        ids = np.array(pl.find('c:p', NS).text.split(), dtype=np.int64)
        n = len(ids)
        a = {}
        a['position'] = {'off': put(pos[ids].astype(np.float32)), 'count': n, 'size': 3}
        a['normal'] = {'off': put(nor[ids].astype(np.float32)), 'count': n, 'size': 3}
        a['uv'] = {'off': put(uv[ids].astype(np.float32)), 'count': n, 'size': 2}
        si = np.zeros((n, 4), dtype=np.uint16)
        si[:, 0] = vj[ids]
        sw = np.zeros((n, 4), dtype=np.float32)
        sw[:, 0] = 1
        a['skinIndex'] = {'off': put(si), 'count': n, 'size': 4}
        a['skinWeight'] = {'off': put(sw), 'count': n, 'size': 4}
        mi = len(nodes)
        nodes.append({'n': 'chihuahua_' + mats[mname], 't': 'M', 'p': 0, 'pos': [0, 0, 0], 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': True})
        meshes.append({'node': mi, 'bind': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 'bones': bones, 'attrs': a,
                       'inv': put(inv_out), 'mat': 'chihuahua_' + mats[mname]})

    with open(os.path.join(OUT, 'chihuahua.bin'), 'wb') as f:
        f.write(b''.join(chunks))
    with open(os.path.join(OUT, 'chihuahua.json'), 'w') as f:
        json.dump({'nodes': nodes, 'meshes': meshes}, f, separators=(',', ':'))
    for a, b in (('Chi_a_all.png', 'chihuahua_all.png'), ('Chi_a_hand.png', 'chihuahua_hand.png'), ('eye_0.png', 'chihuahua_eye.png')):
        shutil.copyfile(os.path.join(SRC, a), os.path.join(OUT, b))
    print('chihuahua: %d nodes, %d meshes, %d bytes' % (len(nodes), len(meshes), off))


if __name__ == '__main__':
    main()
