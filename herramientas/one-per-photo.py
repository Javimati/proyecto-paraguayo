import os,re,sys,json
from PIL import Image
root=sys.argv[1]; prev=os.path.join(root,'preview'); target=int(sys.argv[2])
ad=os.path.join(prev,'x_astro')
groups={}
for f in os.listdir(ad):
    if f.endswith(('.webp','.avif','.jpg','.png')):
        key=f.rsplit('_',1)[0]  # 01.BNeEARrY
        w=Image.open(os.path.join(ad,f)).size[0]
        groups.setdefault(key,[]).append((w,f))
mapping={}
for k,v in groups.items():
    best=min(v,key=lambda x:abs(x[0]-target))
    for w,f in v: mapping[f]=best[1]
for dp,_,fns in os.walk(prev):
    for f in fns:
        if f.endswith(('.html','.css','.js')):
            p=os.path.join(dp,f); s=open(p,encoding='utf-8').read()
            t=re.sub(r'x_astro/([^"\'\s,)]+\.(?:webp|avif|jpg|png))', lambda m:'x_astro/'+mapping.get(m.group(1),m.group(1)), s)
            # collapse srcset that now repeats one file
            t=re.sub(r'srcset="([^"]*)"', lambda m: 'srcset="%s"'%m.group(1).split(',')[0].strip(), t)
            if t!=s: open(p,'w',encoding='utf-8').write(t)
print('groups',len(groups))
