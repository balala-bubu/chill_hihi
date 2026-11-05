#!/usr/bin/env python3
"""
衣櫃物件建置腳本（只用 Python 標準庫）

用法：
    python3 tools/build_wardrobe.py            # 收件匣 -> 歸檔 -> 轉檔 -> 產生 manifest
    python3 tools/build_wardrobe.py --check    # 只檢查，不寫任何檔案

資料夾（都在 models/wardrobe/ 底下）：
    inbox/            新物件先丟這裡：<名稱>.dae + 同名貼圖（.dae 裡寫的貼圖檔名就是要放的檔名）
    src/<id>/         歸檔後的原始檔（.dae、.png、item.json）。這裡是唯一的真相，可手改 item.json
    items/            轉好的執行用檔（<id>.json 網格、<id>.png 貼圖）。自動產生，不要手改
    slots.json        部位（帽子／眼鏡／項圈）掛在哪根骨頭、基準位置。手動維護
    manifest.json     執行時只讀這一份。自動產生，不要手改

流程：
    1. inbox/ 裡每個 .dae：id 取自它引用的貼圖檔名（小寫），搬到 src/<id>/
       部位從名稱猜（glass→glasses、coller/collar→collar、head/hat/cap→hat）；猜不到就請你手動填 item.json
    2. 對 src/<id>/ 重新轉出 items/<id>.json 與 <id>.png
    3. 依 slots.json 的順序重寫 manifest.json
"""
import json, os, re, shutil, sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, 'models', 'wardrobe')
INBOX, SRC, ITEMS = (os.path.join(W, d) for d in ('inbox', 'src', 'items'))
SLOTS, MANIFEST = os.path.join(W, 'slots.json'), os.path.join(W, 'manifest.json')

GUESS = [('glass', 'glasses'), ('coller', 'collar'), ('collar', 'collar'), ('head', 'hat'), ('hat', 'hat'), ('cap', 'hat')]
NS = '{http://www.collada.org/2005/11/COLLADASchema}'


def q(tag):
    return NS + tag


def die(msg):
    print('錯誤：' + msg, file=sys.stderr)
    sys.exit(1)


def floats(el):
    return [float(x) for x in el.text.split()]


def parse_dae(path):
    """讀 Collada，回傳 {pos, nor, uv, idx, tex:{file,wrapS,wrapT,filter,alpha}}。座標統一成 Y 向上。"""
    root = ET.parse(path).getroot()
    up = (root.findtext(q('asset') + '/' + q('up_axis')) or 'Y_UP').strip()
    geo = root.find('.//' + q('geometry') + '/' + q('mesh'))
    if geo is None:
        die(path + ' 找不到 mesh')
    src = {}
    for s in geo.findall(q('source')):
        arr = s.find(q('float_array'))
        acc = s.find('.//' + q('accessor'))
        if arr is not None:
            src[s.get('id')] = (floats(arr), int(acc.get('stride') or 1))
    vsem = {i.get('semantic'): i.get('source')[1:] for i in geo.find(q('vertices')).findall(q('input'))}
    poly = geo.find(q('polylist'))
    tri = geo.find(q('triangles'))
    node = poly if poly is not None else tri
    if node is None:
        die(path + ' 只支援 polylist / triangles')
    ins = node.findall(q('input'))
    stride = max(int(i.get('offset')) for i in ins) + 1
    off = {i.get('semantic'): int(i.get('offset')) for i in ins}
    psem = {i.get('semantic'): i.get('source')[1:] for i in ins}
    vert_off = off['VERTEX']
    p = [int(x) for x in node.findtext(q('p')).split()]
    counts = [int(x) for x in poly.findtext(q('vcount')).split()] if poly is not None else [3] * (len(p) // stride // 3)

    def get(sem, vi, row):
        """取某個屬性（可能掛在 vertices 底下、也可能直接掛在 polylist）"""
        if sem in vsem:
            data, st = src[vsem[sem]]
            i = vi
        elif sem in psem:
            data, st = src[psem[sem]]
            i = row[off[sem]]
        else:
            return None
        return data[i * st:(i + 1) * st]

    verts, key2i, idx = [], {}, []
    pos_i = 0
    for c in counts:
        face = []
        for k in range(c):
            row = p[(pos_i + k) * stride:(pos_i + k + 1) * stride]
            vi = row[vert_off]
            key = (vi, row[off['NORMAL']] if 'NORMAL' in off else -1, row[off['TEXCOORD']] if 'TEXCOORD' in off else -1)
            if key not in key2i:
                key2i[key] = len(verts)
                verts.append((get('POSITION', vi, row), get('NORMAL', vi, row) or [0, 1, 0], (get('TEXCOORD', vi, row) or [0, 0])[:2]))
            face.append(key2i[key])
        pos_i += c
        for k in range(1, c - 1):          # 扇形切三角形
            idx += [face[0], face[k], face[k + 1]]

    def fix(v):                              # Z 向上 -> Y 向上
        return [v[0], v[2], -v[1]] if up == 'Z_UP' else v
    pos = [round(a, 4) for v in verts for a in fix(v[0])]
    nor = [round(a, 3) for v in verts for a in fix(v[1])]
    uv = [round(a, 4) for v in verts for a in v[2]]

    # 貼圖與材質：檔名、包裹方式、過濾、是否用貼圖 alpha 當透明
    img = root.findtext('.//' + q('library_images') + '/' + q('image') + '/' + q('init_from'))
    if not img:
        die(path + ' 沒有貼圖')
    sm = root.find('.//' + q('sampler2D'))
    wrap = lambda t: (sm.findtext(q(t)) or 'WRAP').strip().lower() if sm is not None else 'wrap'
    filt = (sm.findtext(q('minfilter')) or 'NEAREST').strip().lower() if sm is not None else 'nearest'
    alpha = root.find('.//' + q('phong') + '/' + q('transparent')) is not None
    return {'pos': pos, 'nor': nor, 'uv': uv, 'idx': idx,
            'tex': {'file': os.path.basename(img.strip()), 'wrapS': wrap('wrap_s'), 'wrapT': wrap('wrap_t'),
                    'filter': 'nearest' if filt == 'nearest' else 'linear', 'alpha': alpha}}


def bbox(pos):
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    return [[min(a) for a in (xs, ys, zs)], [max(a) for a in (xs, ys, zs)]]


def load_json(path, default):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return default


def dump(path, obj, compact=False):
    with open(path, 'w', encoding='utf-8') as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.write('\n')


def ingest(check):
    """inbox/ -> src/<id>/"""
    if not os.path.isdir(INBOX):
        return
    slots = {s['id'] for s in load_json(SLOTS, {}).get('slots', [])}
    for fn in sorted(os.listdir(INBOX)):
        if not fn.lower().endswith('.dae'):
            continue
        info = parse_dae(os.path.join(INBOX, fn))
        tex = info['tex']['file']
        iid = re.sub(r'\.png$', '', tex, flags=re.I).lower()
        tex_path = os.path.join(INBOX, tex)
        if not os.path.exists(tex_path):
            die('inbox 裡缺貼圖：%s（%s 引用它）' % (tex, fn))
        slot = next((s for k, s in GUESS if k in iid), None)
        dst = os.path.join(SRC, iid)
        print('收件匣：%s -> src/%s/  部位=%s' % (fn, iid, slot or '（猜不到，請手動填 item.json）'))
        if check:
            continue
        os.makedirs(dst, exist_ok=True)
        shutil.move(os.path.join(INBOX, fn), os.path.join(dst, fn))
        shutil.move(tex_path, os.path.join(dst, tex))
        if not os.path.exists(os.path.join(dst, 'item.json')):
            dump(os.path.join(dst, 'item.json'), {'slot': slot or '', 'name': iid})


def build(check):
    slots_doc = load_json(SLOTS, None)
    if not slots_doc:
        die('找不到 models/wardrobe/slots.json')
    slot_ids = [s['id'] for s in slots_doc['slots']]
    entries = []
    if not os.path.isdir(SRC):
        die('找不到 models/wardrobe/src/')
    os.makedirs(ITEMS, exist_ok=True)
    for iid in sorted(os.listdir(SRC)):
        d = os.path.join(SRC, iid)
        if not os.path.isdir(d):
            continue
        meta = load_json(os.path.join(d, 'item.json'), {})
        if meta.get('slot') not in slot_ids:
            die('src/%s/item.json 的 slot 必須是 %s 其中之一（現在是「%s」）' % (iid, slot_ids, meta.get('slot', '')))
        daes = [f for f in os.listdir(d) if f.lower().endswith('.dae')]
        if len(daes) != 1:
            die('src/%s/ 需要剛好一個 .dae（現在有 %d 個）' % (iid, len(daes)))
        info = parse_dae(os.path.join(d, daes[0]))
        tex_src = os.path.join(d, info['tex']['file'])
        if not os.path.exists(tex_src):
            die('src/%s/ 缺貼圖 %s' % (iid, info['tex']['file']))
        mesh = {'v': 1, 'pos': info['pos'], 'nor': info['nor'], 'uv': info['uv'], 'idx': info['idx'],
                'bbox': bbox(info['pos']), 'tex': dict(info['tex'], file=iid + '.png')}
        print('轉檔：%-10s 部位=%-8s 頂點=%-4d 三角形=%-4d 透明=%s' % (iid, meta['slot'], len(info['pos']) // 3, len(info['idx']) // 3, info['tex']['alpha']))
        if not check:
            dump(os.path.join(ITEMS, iid + '.json'), mesh, compact=True)
            shutil.copyfile(tex_src, os.path.join(ITEMS, iid + '.png'))
        item = {'id': iid, 'slot': meta['slot'], 'name': meta.get('name', iid),
                'mesh': 'items/%s.json' % iid, 'tex': 'items/%s.png' % iid}
        if 'fit' in meta:
            item['fit'] = meta['fit']
        if 'display' in meta:
            item['display'] = meta['display']
        entries.append((slot_ids.index(meta['slot']), meta.get('order', 0), iid, item))
    entries.sort(key=lambda e: e[:3])
    manifest = {'version': 1, 'slots': slots_doc['slots'], 'items': [e[3] for e in entries]}
    # 清掉已經不在 src/ 的舊產物
    keep = {e[2] for e in entries}
    for f in os.listdir(ITEMS):
        stem = os.path.splitext(f)[0]
        if stem not in keep:
            print('清除舊檔：items/' + f)
            if not check:
                os.remove(os.path.join(ITEMS, f))
    if not check:
        dump(MANIFEST, manifest)
    print('完成：%d 件物件' % len(entries))


if __name__ == '__main__':
    chk = '--check' in sys.argv
    ingest(chk)
    build(chk)
