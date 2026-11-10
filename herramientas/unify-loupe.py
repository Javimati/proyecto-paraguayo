import os,re,sys
prev=sys.argv[1]
n=0
for dp,_,fns in os.walk(prev):
    for f in fns:
        if not f.endswith('.html'): continue
        p=os.path.join(dp,f); s=open(p,encoding='utf-8').read()
        def fix(m):
            global n
            tag=m.group(0)
            lm=re.search(r'data-loupe="([^"]+)"',tag)
            if not lm: return tag
            L=lm.group(1); n+=1
            tag=re.sub(r'data-tex="[^"]+"','data-tex="%s"'%L,tag)
            tag=re.sub(r'\ssrcset="[^"]+"','',tag)
            tag=re.sub(r'\ssrc="[^"]+"',' src="%s"'%L,tag)
            return tag
        t=re.sub(r'<img\b[^>]*>',fix,s)
        if t!=s: open(p,'w',encoding='utf-8').write(t)
print('unified',n)
