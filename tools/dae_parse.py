import re, math
import xml.etree.ElementTree as ET
def T(e): return e.tag.split('}')[-1]
def kids(e,t): return [c for c in e if T(c)==t]
def mul(a,b): return [[sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
def ident(): return [[1 if i==j else 0 for j in range(4)] for i in range(4)]
def Tr(x,y,z): m=ident(); m[0][3],m[1][3],m[2][3]=x,y,z; return m
def Sc(x,y,z): m=ident(); m[0][0],m[1][1],m[2][2]=x,y,z; return m
def Ro(x,y,z,deg):
    # axis-angle
    a=math.radians(deg); c,s=math.cos(a),math.sin(a); n=math.sqrt(x*x+y*y+z*z) or 1; x,y,z=x/n,y/n,z/n; t=1-c
    m=ident()
    m[0][:3]=[t*x*x+c,t*x*y-s*z,t*x*z+s*y]; m[1][:3]=[t*x*y+s*z,t*y*y+c,t*y*z-s*x]; m[2][:3]=[t*x*z-s*y,t*y*z+s*x,t*z*z+c]
    return m
def load(path):
    root=ET.parse(path).getroot()
    imgs={i.get('id'):kids(i,'init_from')[0].text for i in root.iter() if T(i)=='image'}
    eff={}
    for e in root.iter():
        if T(e)=='effect':
            tex=None;col=None
            for x in e.iter():
                if T(x)=='init_from' and x.text and x.text.startswith('tex_'): tex=imgs.get(x.text.strip())
                if T(x)=='color' and x.text: col=x.text.split()
            eff[e.get('id')]=(tex,col)
    mats={}
    for m in root.iter():
        if T(m)=='material':
            ie=kids(m,'instance_effect')[0].get('url')[1:]; mats[m.get('id')]=(m.get('name'),)+eff[ie]
    geo={}
    for g in root.iter():
        if T(g)!='geometry': continue
        mesh=kids(g,'mesh')[0]; src={}
        for s in kids(mesh,'source'):
            fa=kids(s,'float_array')[0]; src[s.get('id')]=list(map(float,fa.text.split()))
        el=(kids(mesh,'polylist') or kids(mesh,'triangles'))[0]
        ins={i.get('semantic'):(i.get('source')[1:],int(i.get('offset'))) for i in kids(el,'input')}
        vt=kids(mesh,'vertices')[0]; pos=kids(vt,'input')[0].get('source')[1:]
        p=list(map(int,kids(el,'p')[0].text.split())); vc=kids(el,'vcount')
        vc=list(map(int,vc[0].text.split())) if vc else None
        geo[g.get('id')]=dict(pos=src[pos],uv=src[ins['TEXCOORD'][0]] if 'TEXCOORD' in ins else None,
            col=src[ins['COLOR'][0]] if 'COLOR' in ins else None,ins=ins,p=p,vc=vc,n=max(o for _,o in ins.values())+1)
    inst=[]
    def walk(n,M,path):
        for c in n:
            t=T(c)
            if t=='translate': M=mul(M,Tr(*map(float,c.text.split())))
            elif t=='scale': M=mul(M,Sc(*map(float,c.text.split())))
            elif t=='rotate': M=mul(M,Ro(*map(float,c.text.split())))
            elif t=='matrix':
                v=list(map(float,c.text.split())); M=mul(M,[v[0:4],v[4:8],v[8:12],v[12:16]])
        for c in n:
            if T(c)=='node': walk(c,M,path+[c.get('name')])
            elif T(c)=='instance_geometry':
                mat=None
                for x in c.iter():
                    if T(x)=='instance_material': mat=x.get('target')[1:]
                inst.append(dict(name=n.get('name'),path=path,M=M,geo=c.get('url')[1:],mat=mat))
    vs=[x for x in root.iter() if T(x)=='visual_scene'][0]
    walk(vs,ident(),[])
    return dict(imgs=imgs,mats=mats,geo=geo,inst=inst)
def bake(d,it):
    g=d['geo'][it['geo']]; M=it['M']; P=g['pos']; U=g['uv']; C=g['col']
    pos=[]
    for i in range(len(P)//3):
        x,y,z=P[i*3:i*3+3]
        pos+= [M[r][0]*x+M[r][1]*y+M[r][2]*z+M[r][3] for r in range(3)]
    idx=g['p'][0::g['n']]
    return pos,U,C,idx
