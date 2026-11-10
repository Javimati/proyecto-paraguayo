import os, sys, json, re
root = sys.argv[1]  # entregables/<web>
prev = os.path.join(root, 'preview')
# rename any top-level or nested dir/file starting with "_"
renames = {}
for dp, dns, fns in os.walk(prev, topdown=False):
    for n in dns + fns:
        if n.startswith('_'):
            new = 'x' + n  # _astro -> x_astro
            renames[n] = new
            os.rename(os.path.join(dp, n), os.path.join(dp, new))
pat = re.compile(r'(?<![\w-])(' + '|'.join(re.escape(k) for k in renames) + r')(?=/|["\'\s)?#])') if renames else None
for dp, dns, fns in os.walk(prev):
    for f in fns:
        if f.endswith(('.html', '.css', '.js', '.json', '.svg')):
            p = os.path.join(dp, f)
            s = open(p, encoding='utf-8').read()
            t = pat.sub(lambda m: renames[m.group(1)], s) if pat else s
            if t != s: open(p, 'w', encoding='utf-8').write(t)
files = []
for dp, dns, fns in os.walk(prev):
    for f in fns:
        p = os.path.join(dp, f); rel = os.path.relpath(p, prev)
        if rel == 'preview-files.json': continue
        files.append({'as': rel, 'path': p})
files.sort(key=lambda x: x['as'])
json.dump(files, open(os.path.join(root, 'preview-files.json'), 'w'), indent=1)
print('renamed', renames, 'files', len(files))
leftover = []
for x in files:
    if x['as'].endswith(('.html','.js','.css')):
        s=open(x['path'],encoding='utf-8').read()
        if '_astro' in s.replace('x_astro',''): leftover.append(x['as'])
print('leftover refs:', leftover[:10])
