#!/usr/bin/env python3
"""
皮克敏資產建置腳本（需要 numpy、Pillow 不需要）

用法：
    python3 tools/build_pikmin.py

輸入（models/pikmin/src/）：
    PikminBlue.smd / PikminRed.smd / PikminYellow.smd   三隻身體（網格＋骨架＋蒙皮）
    PikminLeaf.smd                                      葉子（單骨頭，只用網格）
    Hang / Fall / Wait / Yawn / Run .smd                動畫（skeleton 區塊的多個 time 影格）
    piki_*_all.png、piki_leaf_tex.png、piki_leaf_nrm.png  貼圖

輸出：
    models/pikmin/pikmin.json    執行用：骨架、三隻身體、葉子、葉子掛點、五個動畫（四元數）
    models/pikmin/*.png          貼圖（blue / red / yellow / leaf / leaf_n）
    models/wardrobe/src/t_pikmin/ 物品櫃縮圖用的靜態模型（藍皮克敏＋葉子，單一 .dae）。
                                 產生後請再執行 python3 tools/build_wardrobe.py

SMD 的旋轉是 Euler 角（弧度），矩陣 = Rz * Ry * Rx（和 .dae 的 bone matrix 對過）。座標 Y 向上、臉朝 +Z。
"""
import json, math, os, shutil, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models', 'pikmin', 'src')
OUT = os.path.join(ROOT, 'models', 'pikmin')
FPS = 30
BODIES = ['blue', 'red', 'yellow']
ANIMS = {'hang': 'Hang', 'fall': 'Fall', 'wait': 'Wait', 'yawn': 'Yawn', 'run': 'Run'}


def euler_mat(x, y, z):
    cx, sx, cy, sy, cz, sz = math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z)
    rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return rz @ ry @ rx


def mat_quat(m):   # 3x3 rotation -> (x,y,z,w)
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = math.sqrt(t + 1) * 2
        q = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, s / 4]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        q = [s / 4, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        q = [(m[0, 1] + m[1, 0]) / s, s / 4, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    else:
        s = math.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        q = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, s / 4, (m[1, 0] - m[0, 1]) / s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def read_smd(path):
    """-> nodes [(name,parent)], frames {time: [(pos(3), rot(3)) per bone]}, tris [[vert]*3]; vert = (pos,nor,uv,[(bone,w)])"""
    L = [l.strip() for l in open(path).read().split('\n')]
    i = L.index('nodes') + 1
    nodes = []
    while L[i] != 'end':
        p = L[i].split(None, 2)
        nodes.append((p[1].strip('"'), int(p[2].split()[-1])))
        i += 1
    i = L.index('skeleton') + 1
    frames, t = {}, None
    while L[i] != 'end':
        w = L[i].split()
        if w[0] == 'time':
            t = int(w[1]); frames[t] = [None] * len(nodes)
        else:
            frames[t][int(w[0])] = (np.array(w[1:4], float), np.array(w[4:7], float))
        i += 1
    tris = []
    if 'triangles' in L:
        i = L.index('triangles') + 1
        while L[i] != 'end':
            tri = []
            for k in range(3):
                w = L[i + 1 + k].split()
                n = int(w[9])
                links = [(int(w[10 + 2 * j]), float(w[11 + 2 * j])) for j in range(n)]
                tri.append((tuple(map(float, w[1:4])), tuple(map(float, w[4:7])), tuple(map(float, w[7:9])), links))
            tris.append(tri)
            i += 4
    return nodes, frames, tris


def local_mat(pos, rot):
    m = np.eye(4)
    m[:3, :3] = euler_mat(*rot)
    m[:3, 3] = pos
    return m


def world_mats(nodes, pose):
    W = [None] * len(nodes)
    for i, (n, p) in enumerate(nodes):
        lm = local_mat(*pose[i])
        W[i] = lm if p < 0 else W[p] @ lm
    return W


def mesh_arrays(tris, maxlinks):
    """dedupe vertices -> flat arrays. maxlinks = 2 for bodies (bone indices/weights per vertex), 0 for the leaf"""
    key2i, pos, nor, uv, sk, sw, idx = {}, [], [], [], [], [], []
    for tri in tris:
        for v in tri:
            links = sorted(v[3], key=lambda a: -a[1])[:maxlinks] if maxlinks else []
            tot = sum(w for _, w in links) or 1
            links = [(b, w / tot) for b, w in links]
            k = (v[0], v[1], v[2], tuple(links))
            if k not in key2i:
                key2i[k] = len(pos) // 3
                pos += [round(a, 4) for a in v[0]]
                nor += [round(a, 3) for a in v[1]]
                uv += [round(a, 4) for a in v[2]]
                if maxlinks:
                    while len(links) < maxlinks:
                        links.append((0, 0.0))
                    for b, w in links:
                        sk.append(b); sw.append(round(w, 3))
            idx.append(key2i[k])
    d = {'pos': pos, 'nor': nor, 'uv': uv, 'idx': idx}
    if maxlinks:
        d['sk'] = sk; d['sw'] = sw
    return d


def main():
    os.makedirs(OUT, exist_ok=True)
    nodes, frames, tris = read_smd(os.path.join(SRC, 'PikminBlue.smd'))
    rest = frames[0]
    names = [n for n, _ in nodes]
    for c in ('Red', 'Yellow'):
        n2, f2, _ = read_smd(os.path.join(SRC, 'Pikmin%s.smd' % c))
        assert [a[1] for a in n2] == [a[1] for a in nodes], c + ' 骨架階層不同'
        assert all(np.allclose(a[0], b[0]) and np.allclose(a[1], b[1]) for a, b in zip(f2[0], rest)), c + ' 靜止姿勢和藍色不同'
    W = world_mats(nodes, rest)
    out = {'fps': FPS,
           'bones': [{'n': n, 'p': p, 'pos': [round(float(a), 5) for a in rest[i][0]], 'q': [round(float(a), 6) for a in mat_quat(euler_mat(*rest[i][1]))]}
                     for i, (n, p) in enumerate(nodes)]}
    out['bodies'] = {}
    bodies_tris = {}
    for c in BODIES:
        _, _, t = read_smd(os.path.join(SRC, 'Pikmin%s.smd' % c.capitalize()))
        bodies_tris[c] = t
        out['bodies'][c] = mesh_arrays(t, 2)
    # leaf
    _, _, ltris = read_smd(os.path.join(SRC, 'PikminLeaf.smd'))
    out['leaf'] = mesh_arrays(ltris, 0)
    # leaf attach point: the centre of the topmost ring of the stem (blue body), the leaf's own frame = world frame at bind pose
    tip_i = names.index('happajnt3')
    pts = np.array([v[0] for tr in bodies_tris['blue'] for v in tr])
    top = pts[:, 1].max()
    tip = pts[pts[:, 1] > top - 0.15].mean(axis=0)
    inv = np.linalg.inv(W[tip_i])
    lp = (inv @ np.append(tip, 1))[:3]
    lq = mat_quat(inv[:3, :3])   # leaf (world axes at bind pose) expressed in the bone's local frame
    out['attach'] = {'bone': tip_i, 'pos': [round(float(a), 4) for a in lp], 'q': [round(float(a), 6) for a in lq], 'world': [round(float(a), 4) for a in tip]}
    lpts = np.array(out['leaf']['pos']).reshape(-1, 3)
    out['leaf']['h'] = round(float(lpts[:, 1].max()), 3)
    # animations: bone quaternions per frame (bones 1..), plus the pelvis (kosinull) position
    out['anims'] = {}
    for key, fn in ANIMS.items():
        n2, fr, _ = read_smd(os.path.join(SRC, fn + '.smd'))
        assert [a[1] for a in n2] == [a[1] for a in nodes], fn + ' 骨架階層不同'
        ts = sorted(fr)
        q, p, prev = [], [], None
        for t in ts:
            row = []
            for b in range(len(nodes)):
                if b >= 2 and not np.allclose(fr[t][b][0], rest[b][0], atol=1e-4):
                    print('  注意：%s 第%d格 骨頭%s 位置和靜止姿勢不同（忽略）' % (fn, t, names[b]))
                qq = mat_quat(euler_mat(*fr[t][b][1]))
                if prev is not None and np.dot(prev[b], qq) < 0:
                    qq = -qq
                row.append(qq)
            prev = row
            q += [round(float(a), 4) for qq in row for a in qq]
            p += [round(float(a), 4) for a in fr[t][1][0]]
        # lowest point of the skinned body over the clip (so the feet can be put on the floor): linear blend skinning in numpy
        fl, fh = 1e9, -1e9
        for t in ts:
            pose = [(rest[b][0] if b != 1 else fr[t][1][0], fr[t][b][1]) for b in range(len(nodes))]
            Wf = world_mats(nodes, pose)
            M = [Wf[b] @ np.linalg.inv(W[b]) for b in range(len(nodes))]
            fp = []
            for tr in bodies_tris['blue']:
                for v in tr:
                    pv = np.zeros(3)
                    for b, w in v[3]:
                        pv += w * (M[b] @ np.append(v[0], 1))[:3]
                    fl = min(fl, pv[1]); fh = max(fh, pv[1])
                    fp.append(pv)
        out['anims'][key] = {'n': len(ts), 'q': q, 'p': p, 'floor': round(float(fl), 3)}
        print('動畫 %-5s %3d 格  最低點 %.2f 最高點 %.2f' % (key, len(ts), fl, fh))
    with open(os.path.join(OUT, 'pikmin.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    for c in BODIES:
        shutil.copyfile(os.path.join(SRC, 'piki_%s_all.png' % c), os.path.join(OUT, c + '.png'))
    shutil.copyfile(os.path.join(SRC, 'piki_leaf_tex.png'), os.path.join(OUT, 'leaf.png'))
    shutil.copyfile(os.path.join(SRC, 'piki_leaf_nrm.png'), os.path.join(OUT, 'leaf_n.png'))
    print('葉子掛點（骨頭 happajnt3 的區域座標）', out['attach']['pos'], '世界座標', out['attach']['world'], '葉高', out['leaf']['h'])
    print('pikmin.json %d KB' % (os.path.getsize(os.path.join(OUT, 'pikmin.json')) // 1024))
    thumb_dae(bodies_tris['blue'], ltris, np.array(out['attach']['world']))


def thumb_dae(btris, ltris, tip):
    """物品櫃縮圖：藍皮克敏（靜止姿勢）＋葉子，兩個材質的靜態 .dae"""
    d = os.path.join(ROOT, 'models', 'wardrobe', 'src', 't_pikmin')
    os.makedirs(d, exist_ok=True)
    shutil.copyfile(os.path.join(SRC, 'piki_blue_all.png'), os.path.join(d, 't_pikmin.png'))
    shutil.copyfile(os.path.join(SRC, 'piki_leaf_tex.png'), os.path.join(d, 't_pikmin_leaf.png'))
    meta = os.path.join(d, 'item.json')
    if not os.path.exists(meta):
        json.dump({'slot': 'toy', 'name': '皮克敏'}, open(meta, 'w'), ensure_ascii=False)

    def flat(tris, off):
        P, N, U = [], [], []
        for tr in tris:
            for v in tr:
                P += list(np.array(v[0]) + off); N += list(v[1]); U += list(v[2])
        return P, N, U
    bp, bn, bu = flat(btris, 0)
    lp, ln, lu = flat(ltris, tip)
    P, N, U = bp + lp, bn + ln, bu + lu
    nb, nl = len(bp) // 3, len(lp) // 3
    fa = lambda a: ' '.join('%.5g' % x for x in a)
    sam = lambda i, f: ('<newparam sid="s%d"><surface type="2D"><init_from>img%d</init_from></surface></newparam>'
                        '<newparam sid="m%d"><sampler2D><source>s%d</source><wrap_s>WRAP</wrap_s><wrap_t>WRAP</wrap_t>'
                        '<minfilter>%s</minfilter></sampler2D></newparam>' % (i, i, i, i, f))
    x = ('<?xml version="1.0" encoding="utf-8"?>\n<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">'
         '<asset><up_axis>Y_UP</up_axis></asset>'
         '<library_images><image id="img0"><init_from>t_pikmin.png</init_from></image><image id="img1"><init_from>t_pikmin_leaf.png</init_from></image></library_images>'
         '<library_effects><effect id="e0"><profile_COMMON>' + sam(0, 'NONE') + '<technique sid="common"><phong><diffuse><texture texture="m0" texcoord=""/></diffuse></phong></technique></profile_COMMON></effect>'
         '<effect id="e1"><profile_COMMON>' + sam(1, 'LINEAR') + '<technique sid="common"><phong><diffuse><texture texture="m1" texcoord=""/></diffuse></phong></technique></profile_COMMON></effect></library_effects>'
         '<library_materials><material id="mat0"><instance_effect url="#e0"/></material><material id="mat1"><instance_effect url="#e1"/></material></library_materials>'
         '<library_geometries><geometry id="g"><mesh>'
         '<source id="gp"><float_array id="gpa" count="%d">%s</float_array><technique_common><accessor source="#gpa" count="%d" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>'
         '<source id="gn"><float_array id="gna" count="%d">%s</float_array><technique_common><accessor source="#gna" count="%d" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>'
         '<source id="gu"><float_array id="gua" count="%d">%s</float_array><technique_common><accessor source="#gua" count="%d" stride="2"><param name="S" type="float"/><param name="T" type="float"/></accessor></technique_common></source>'
         '<vertices id="gv"><input semantic="POSITION" source="#gp"/></vertices>'
         '<triangles material="sym0" count="%d"><input semantic="VERTEX" source="#gv" offset="0"/><input semantic="NORMAL" source="#gn" offset="1"/><input semantic="TEXCOORD" source="#gu" offset="2"/><p>%s</p></triangles>'
         '<triangles material="sym1" count="%d"><input semantic="VERTEX" source="#gv" offset="0"/><input semantic="NORMAL" source="#gn" offset="1"/><input semantic="TEXCOORD" source="#gu" offset="2"/><p>%s</p></triangles>'
         '</mesh></geometry></library_geometries>'
         '<library_visual_scenes><visual_scene id="vs"><node id="n"><instance_geometry url="#g"><bind_material><technique_common>'
         '<instance_material symbol="sym0" target="#mat0"/><instance_material symbol="sym1" target="#mat1"/></technique_common></bind_material></instance_geometry></node></visual_scene></library_visual_scenes>'
         '<scene><instance_visual_scene url="#vs"/></scene></COLLADA>') % (
        len(P), fa(P), len(P) // 3, len(N), fa(N), len(N) // 3, len(U), fa(U), len(U) // 2,
        nb // 3, ' '.join('%d %d %d' % (i, i, i) for i in range(nb)),
        nl // 3, ' '.join('%d %d %d' % (i, i, i) for i in range(nb, nb + nl)))
    open(os.path.join(d, 'pikmin.dae'), 'w').write(x)
    print('縮圖模型 models/wardrobe/src/t_pikmin/pikmin.dae（請接著跑 tools/build_wardrobe.py）')


if __name__ == '__main__':
    main()
