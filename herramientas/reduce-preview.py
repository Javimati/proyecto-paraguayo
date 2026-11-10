import os, re, sys, json
root=sys.argv[1]; prev=os.path.join(root,'preview'); target=int(sys.argv[2]) if len(sys.argv)>2 else 800
def pick(srcset):
    cands=[]
    for part in srcset.split(','):
        bits=part.strip().split()
        if not bits: continue
        w=int(bits[1][:-1]) if len(bits)>1 and bits[1].endswith('w') else 0
        cands.append((w,bits[0], part.strip()))
    if len(cands)<=1: return srcset
    best=min(cands,key=lambda c: abs(c[0]-target) if c[0] else 9999)
    return best[2]
texts={}
for dp,_,fns in os.walk(prev):
    for f in fns:
        if f.endswith(('.html','.css','.js')):
            p=os.path.join(dp,f); s=open(p,encoding='utf-8').read()
            if f.endswith('.html'):
                s=re.sub(r'srcset="([^"]*)"', lambda m: 'srcset="%s"'%pick(m.group(1)), s)
                open(p,'w',encoding='utf-8').write(s)
            texts[p]=s
alltext='\n'.join(texts.values())
removed=0
for dp,_,fns in os.walk(prev):
    for f in fns:
        if f.endswith(('.webp','.avif','.jpg','.jpeg','.png')) and f not in alltext:
            os.remove(os.path.join(dp,f)); removed+=1
files=[]
for dp,_,fns in os.walk(prev):
    for f in fns:
        p=os.path.join(dp,f); files.append({'as':os.path.relpath(p,prev),'path':p})
files.sort(key=lambda x:x['as'])
json.dump(files,open(os.path.join(root,'preview-files.json'),'w'),indent=1)
print('removed',removed,'files',len(files), 'MiB', round(sum(os.path.getsize(x['path']) for x in files)/2**20,1))
