#!/usr/bin/env python3
"""把 chiikawa_and_friends.glb（吉伊卡哇、小八貓、烏薩奇）轉成頁面用的
models/chiikawa.json/.bin、hachiware.json/.bin、usagi.json/.bin，以及共用的臉部圖集 models/chiikawa/face.png。

用法：
    python3 tools/build_chiikawa.py

來源 models/chiikawa/src/chiikawa_and_friends.glb 是靜態模型（沒有骨架、沒有動畫）：每隻角色是
「身體（頭＋身＋手＋腳是同一張網格）＋描邊殼＋臉（眼嘴的面片）」，小八有藍色頭髮／尾巴，烏薩奇有長耳朵和灰色尾巴。
做法同皮卡丘（見 tools/build_pikachu.py）：替它做一副「假骨架」，骨頭名稱比照狗，所以 14-dog 的行為程式不用改。
但這裡身體是整張網格，不能依群組剛體分件，所以改成**依頂點位置算權重**（頭／脖子／左右手／左右腳／腰／尾巴／烏薩奇的耳朵），
交界處用 smoothstep 平滑混合，彎腰、轉頭、擺手時不會裂開。

轉檔時做的事：
  - 把 glTF 節點矩陣（Sketchfab 的 -90° X、cm→m 等）烘進頂點，得到 Y 向上、臉朝 +Z、腳底在 y=0 的座標，並放大 K 倍。
  - 根節點預先轉 -90° X，抵銷載入程式的 +90° 轉正（同皮卡丘）。
  - 材質寫在 json 的 `mats`：顏色、是否描邊（只畫背面）、臉（圖集 + alpha 裁切，不受光）。
"""
import os, json, struct, shutil
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models', 'chiikawa', 'src', 'chiikawa_and_friends.glb')
OUT = os.path.join(ROOT, 'models')
K = 85.0

# 角色 -> (中心 x（glb 裡三隻是並排的）, 屬於它的 glb 節點名稱)
CHARS = {
    'chiikawa': dict(cx=0.0, meshes=['Chiikawa_body_0', 'Chiikawa_Material.001_0', 'Mouth.001_Eyes_0']),
    'hachiware': dict(cx=0.54, meshes=['Hachiware_body.001_0', 'Hachiware_hAIR_0', 'Hachiware_Material.002_0', 'Mouth.003_Eyes.001_0']),
    'usagi': dict(cx=-0.52, meshes=['Usagi_body.002_0', 'Usagi_Ear_0', 'Usagi_hAIR.001_0', 'Usagi_Material.003_0', 'Eyes.002_Eyes.002_0']),
}
# 材質名稱 -> 怎麼畫
# 顏色：描邊用原模型的柔和深棕（線性值換成 sRGB）；小八的藍、烏薩奇的米黃和粉紅，直接換成 sRGB 會被打光洗得太淡，所以刻意調得飽和一點。
MATS = {
    'body': dict(color='#ffffff'), 'body.001': dict(color='#ffffff'), 'body.002': dict(color='#f6cf8e'),
    'hAIR': dict(color='#3b7cc2'), 'hAIR.001': dict(color='#d4d4d4'), 'material': dict(color='#ff8d9a'),
    'Material.001': dict(color='#4f2e24', outline=True), 'Material.002': dict(color='#4f2e24', outline=True), 'Material.003': dict(color='#4f2e24', outline=True),
    'Eyes': dict(face=True, cutoff=.303), 'Eyes.001': dict(face=True, cutoff=.181), 'Eyes.002': dict(face=True, cutoff=.06),
}
# 描邊殼（反轉外殼，法線朝內）原本比身體大 0.01 glb 單位，約 0.85 模型單位，在畫面上偏粗。沿法線（朝內）收 OUTLINE_IN，只剩一圈細邊。
OUTLINE_IN = .0062

# 骨頭：名稱 -> (父, pivot（以角色中心、腳底為原點，glb 單位）)
BONES = [
    ('skl_root', None, (0, .07, 0)),
    ('waist', 'skl_root', (0, .10, 0)),
    ('chest', 'waist', (0, .15, 0)),
    ('neck', 'chest', (0, .22, 0)),
    ('head', 'neck', (0, .25, 0)),
    ('Lear1', 'head', (.075, .52, 0)),
    ('Rear1', 'head', (-.075, .52, 0)),
    ('tail1', 'skl_root', (0, .07, -.12)),
    ('Larm1', 'chest', (.15, .22, 0)),
    ('Rarm1', 'chest', (-.15, .22, 0)),
    ('Lleg1', 'skl_root', (.07, .06, 0)),
    ('Rleg1', 'skl_root', (-.07, .06, 0)),
]
BI = {b[0]: i for i, b in enumerate(BONES)}


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def weights(P, kind, name):
    """P: (n,3) 以角色中心為原點的位置（glb 單位）。回傳 (n,12) 權重。"""
    n = len(P)
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    ax = np.abs(x)
    W = np.zeros((n, len(BONES)))
    if kind == 'face':   # 臉的面片：整塊貼在頭上
        W[:, BI['head']] = 1
        return W
    if kind == 'tail':
        W[:, BI['tail1']] = 1
        return W
    if kind == 'ear':    # 烏薩奇的粉色耳內：左右各一隻
        W[:, BI['Lear1']] = (x > 0)
        W[:, BI['Rear1']] = (x <= 0)
        return W
    wh = ss(.19, .27, y)                                            # 頭（含脖子）
    wa = ss(.10, .15, ax) * ss(.08, .11, y) * (1 - ss(.23, .28, y))  # 手
    wl = 1 - ss(.045, .085, y)                                       # 腳
    wa = np.minimum(wa, 1 - wh)
    wl = np.minimum(wl, 1 - wh - wa)
    wb = np.clip(1 - wh - wa - wl, 0, 1)                             # 身體剩下的
    hip = wb * (1 - ss(.07, .13, y))
    chest = wb * ss(.13, .20, y)
    waist = wb - hip - chest
    head_only = ss(.26, .34, y)
    W[:, BI['head']] = wh * head_only
    W[:, BI['neck']] = wh * (1 - head_only)
    W[:, BI['Larm1']] = wa * (x > 0)
    W[:, BI['Rarm1']] = wa * (x <= 0)
    lside = ss(-.02, .02, x)
    W[:, BI['Lleg1']] = wl * lside
    W[:, BI['Rleg1']] = wl * (1 - lside)
    W[:, BI['skl_root']] = hip
    W[:, BI['waist']] = waist
    W[:, BI['chest']] = chest
    if name == 'usagi':   # 長耳朵：頭頂以上漸漸交給耳骨
        e = ss(.50, .60, y) * (ax > .02)
        for k in ('head', 'neck', 'chest', 'waist', 'skl_root'):
            W[:, BI[k]] *= (1 - e)[:]
        W[:, BI['Lear1']] = e * (x > 0)
        W[:, BI['Rear1']] = e * (x <= 0)
    return W


def load_glb():
    d = open(SRC, 'rb').read()
    l = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + l])
    bl = struct.unpack('<I', d[20 + l:24 + l])[0]
    b = d[28 + l:28 + l + bl]
    return j, b


def main():
    j, buf = load_glb()
    bv = j['bufferViews']

    def acc(i):
        a = j['accessors'][i]
        v = bv[a['bufferView']]
        nn = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dt = {5126: '<f4', 5123: '<u2', 5125: '<u4'}[a['componentType']]
        return np.frombuffer(buf, dt, a['count'] * nn, v.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, nn)

    par = {}
    for i, n in enumerate(j['nodes']):
        for c in n.get('children', []):
            par[c] = i

    def world(i):
        m = np.eye(4)
        while i is not None:
            n = j['nodes'][i]
            if 'matrix' in n:
                m = np.array(n['matrix']).reshape(4, 4).T @ m
            i = par.get(i)
        return m

    mesh = {}
    for i, n in enumerate(j['nodes']):
        if 'mesh' not in n:
            continue
        p = j['meshes'][n['mesh']]['primitives'][0]
        W = world(i)
        P = acc(p['attributes']['POSITION']).astype(float)
        N = acc(p['attributes']['NORMAL']).astype(float)
        P = (np.c_[P, np.ones(len(P))] @ W.T)[:, :3]
        N = N @ W[:3, :3].T
        N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
        mesh[n['name']] = dict(P=P, N=N, UV=acc(p['attributes']['TEXCOORD_0']).astype(float),
                               I=acc(p['indices']).reshape(-1).astype(int), mat=j['materials'][p['material']]['name'])

    # 臉部圖集
    im = j['images'][0]
    v = bv[im['bufferView']]
    os.makedirs(os.path.join(OUT, 'chiikawa'), exist_ok=True)
    open(os.path.join(OUT, 'chiikawa', 'face.png'), 'wb').write(buf[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])

    for cname, C in CHARS.items():
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

        mats = {}
        body_P, body_W = [], []
        yr = [1e9, -1e9]
        for gname in C['meshes']:
            M = mesh[gname]
            P = M['P'].copy()
            P[:, 0] -= C['cx']
            mname = M['mat']
            P_orig = P.copy()
            if MATS[mname].get('outline'):
                P = P + M['N'] * OUTLINE_IN
            mats[mname] = MATS[mname]
            kind = 'body'
            if MATS[mname].get('face'):
                kind = 'face'
            elif gname.startswith('Hachiware_hAIR'):
                # 小八的藍色：頭上的帽狀頭髮 + 屁股後面的尾巴（y 低的是尾巴）
                kind = 'hair'
            elif gname.startswith('Usagi_hAIR'):
                kind = 'tail'
            elif gname.startswith('Usagi_Ear'):
                kind = 'ear'
            if kind == 'hair':
                W = weights(P, 'body', cname)
                tail = (P[:, 1] < .22)
                W[tail] = 0
                W[tail, BI['tail1']] = 1
                head = ~tail
                W[head] = 0
                W[head, BI['head']] = 1
            else:
                W = weights(P, kind, cname)
            s = W.sum(1, keepdims=True)
            assert (s > 1e-6).all(), gname
            W /= s
            if MATS[mname].get('outline'):
                # 描邊殼的權重必須和身體一模一樣，否則尾巴一擺、頭一轉，殼就和身體分開（黑影、線條穿出來）：
                # 每個殼頂點直接沿用「最近的身體頂點」（身體、頭髮、耳朵、尾巴）的權重。
                Pb = np.concatenate(body_P)
                Wb = np.concatenate(body_W)
                near = np.empty(len(P), dtype=int)
                for i0 in range(0, len(P), 256):
                    d = ((P[i0:i0 + 256, None, :] - Pb[None, :, :]) ** 2).sum(2)
                    near[i0:i0 + 256] = d.argmin(1)
                W = Wb[near]
            elif kind != 'face':
                body_P.append(P_orig)
                body_W.append(W.copy())
            # 取最大的四個
            top = np.argsort(-W, axis=1)[:, :4]
            s4 = np.take_along_axis(np.tile(np.arange(len(BONES)), (len(W), 1)), top, 1).astype(np.uint16)
            w4 = np.take_along_axis(W, top, 1)
            w4 /= w4.sum(1, keepdims=True)
            Pk = P * K
            yr = [min(yr[0], Pk[:, 1].min()), max(yr[1], Pk[:, 1].max())]
            a = {}
            a['position'] = {'off': put(Pk.astype(np.float32)), 'count': len(P), 'size': 3}
            a['normal'] = {'off': put(M['N'].astype(np.float32)), 'count': len(P), 'size': 3}
            a['uv'] = {'off': put(M['UV'].astype(np.float32)), 'count': len(P), 'size': 2}
            a['skinIndex'] = {'off': put(s4), 'count': len(P), 'size': 4}
            a['skinWeight'] = {'off': put(w4.astype(np.float32)), 'count': len(P), 'size': 4}
            ind = M['I'].astype(np.uint32)
            mi = len(nodes)
            nodes.append({'n': cname + '_' + gname, 't': 'M', 'p': 0, 'pos': [0, 0, 0], 'q': [0, 0, 0, 1], 's': [1, 1, 1], 'skinned': True})
            meshes.append({'node': mi, 'bind': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 'bones': bone_nodes, 'attrs': a,
                           'index': put(ind), 'indexCount': int(len(ind)), 'inv': put(inv_out), 'mat': mname})
        meta = {'nodes': nodes, 'meshes': meshes, 'mats': mats, 'atlas': 'chiikawa/face.png', 'K': K}
        with open(os.path.join(OUT, cname + '.bin'), 'wb') as f:
            f.write(b''.join(chunks))
        with open(os.path.join(OUT, cname + '.json'), 'w') as f:
            json.dump(meta, f, separators=(',', ':'))
        print('%s: %d meshes, %d bytes, y %.1f..%.1f' % (cname, len(meshes), off, yr[0], yr[1]))


if __name__ == '__main__':
    main()
