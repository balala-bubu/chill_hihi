#!/usr/bin/env python3
"""皮卡丘原模型自帶的派對帽（pika.obj 的 hat_* 群組）-> 衣櫃飾品 models/wardrobe/inbox/pika_hat.dae + 貼圖。

用法：
    python3 tools/build_pikachu_hat.py
    python3 tools/build_wardrobe.py        # 把 inbox 搬進 src/pika_hat/、轉檔、更新 manifest

兩個材質：錐身（星星貼圖 pika_hat_star.png，16x16）和頂上的球（純色貼圖 pika_hat.png，8x8，三角形較多所以是主貼圖、id 取自它）。
座標：帽緣中心放在原點、放大到半徑約 1（衣櫃的槽位縮放再乘上去），Y 向上。
"""
import os, shutil
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OBJ = os.path.join(ROOT, 'models', 'pikachu', 'src', 'pika.obj')
EX = os.path.join(ROOT, 'models', 'pikachu', 'src', 'extra')
INBOX = os.path.join(ROOT, 'models', 'wardrobe', 'inbox')
GROUPS = {'hat_3943B2A5_0_058': ('material1', 'pika_hat_star.png'), 'hat_0_0_032': ('material0', 'pika_hat.png')}
BASE_Y, S = .28, 1 / .07


def main():
    V, VT, VN, grp, F = [], [], [], None, {}
    for l in open(OBJ):
        p = l.split()
        if not p: continue
        if p[0] == 'v': V.append([float(x) for x in p[1:4]])
        elif p[0] == 'vt': VT.append([float(x) for x in p[1:3]])
        elif p[0] == 'vn': VN.append([float(x) for x in p[1:4]])
        elif p[0] == 'g': grp = p[1]; F[grp] = []
        elif p[0] == 'f' and grp in GROUPS: F[grp].append([tuple(int(x) - 1 for x in t.split('/')) for t in p[1:]])
    # 原模型的球不在錐尖上（偏後、偏高）：把球的中心搬到錐尖正上方
    def verts(g):
        return np.array([V[t[0]] for f in F[g] for t in f])
    cone, pom = verts('hat_3943B2A5_0_058'), verts('hat_0_0_032')
    apex = cone[cone[:, 1].argmax()]
    shift = {'hat_0_0_032': apex + (0, .012, 0) - (pom.min(0) + pom.max(0)) / 2, 'hat_3943B2A5_0_058': np.zeros(3)}
    pos, nor, uv, nodes = [], [], [], []
    for g, (mat, _) in GROUPS.items():
        p0 = len(pos)
        for f in F[g]:
            for t in f:
                v = (np.array(V[t[0]]) + shift[g] - (0, BASE_Y, 0)) * S
                pos.append(v); uv.append(VT[t[1]]); nor.append(VN[t[2]])
        nodes.append((mat, p0, len(pos)))
    fmt = lambda a: ' '.join('%.5f' % x for x in np.array(a).reshape(-1))
    tri = ''.join('<triangles material="%s" count="%d"><input semantic="VERTEX" source="#vtx" offset="0"/><input semantic="NORMAL" source="#nrm" offset="1"/><input semantic="TEXCOORD" source="#uvs" offset="2" set="0"/><p>%s</p></triangles>'
                  % (m, (b - a) // 3, ' '.join('%d %d %d' % (i, i, i) for i in range(a, b))) for m, a, b in nodes)
    imgs = ''.join('<image id="img-%s"><init_from>%s</init_from></image>' % (m, f) for m, f in GROUPS.values())
    mats = ''.join('<material id="%s"><instance_effect url="#eff-%s"/></material>' % (m, m) for m, _ in GROUPS.values())
    eff = ''.join('<effect id="eff-%s"><profile_COMMON><newparam sid="s-%s"><surface type="2D"><init_from>img-%s</init_from></surface></newparam><newparam sid="m-%s"><sampler2D><source>s-%s</source><wrap_s>WRAP</wrap_s><wrap_t>WRAP</wrap_t><minfilter>NEAREST</minfilter><magfilter>NEAREST</magfilter></sampler2D></newparam><technique sid="common"><phong><diffuse><texture texture="m-%s" texcoord="tc"/></diffuse></phong></technique></profile_COMMON></effect>' % (m, m, m, m, m, m) for m, _ in GROUPS.values())
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><up_axis>Y_UP</up_axis></asset>'
           '<library_images>%s</library_images><library_materials>%s</library_materials><library_effects>%s</library_effects>'
           '<library_geometries><geometry id="geo"><mesh>'
           '<source id="pos"><float_array id="pos-a" count="%d">%s</float_array><technique_common><accessor source="#pos-a" count="%d" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>'
           '<source id="nrm"><float_array id="nrm-a" count="%d">%s</float_array><technique_common><accessor source="#nrm-a" count="%d" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>'
           '<source id="uvs"><float_array id="uvs-a" count="%d">%s</float_array><technique_common><accessor source="#uvs-a" count="%d" stride="2"><param name="S" type="float"/><param name="T" type="float"/></accessor></technique_common></source>'
           '<vertices id="vtx"><input semantic="POSITION" source="#pos"/></vertices>%s</mesh></geometry></library_geometries></COLLADA>\n'
           % (imgs, mats, eff, len(pos) * 3, fmt(pos), len(pos), len(nor) * 3, fmt(nor), len(nor), len(uv) * 2, fmt(uv), len(uv), tri))
    os.makedirs(INBOX, exist_ok=True)
    open(os.path.join(INBOX, 'pika_hat.dae'), 'w').write(xml)
    shutil.copyfile(os.path.join(ROOT, 'models', 'pikachu', 'src', 'hat_star.png'), os.path.join(INBOX, 'pika_hat_star.png'))
    shutil.copyfile(os.path.join(ROOT, 'models', 'pikachu', 'src', 'hat_pom.png'), os.path.join(INBOX, 'pika_hat.png'))
    print('inbox: pika_hat.dae,', len(pos) // 3, 'tris')


if __name__ == '__main__':
    main()
