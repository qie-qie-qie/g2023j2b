from pathlib import Path
import re
root=Path(__file__).parent
parts=[]
for name in ['combat-model.mjs','battle-renderer.mjs','mobile-layout.mjs','academy.mjs']:
 text=(root/name).read_text()
 text=re.sub(r'^import .*?;\n','',text,flags=re.M)
 text=re.sub(r'^export ', '',text,flags=re.M)
 parts.append(text)
(root/'academy.bundle.js').write_text('(()=>{\n"use strict";\n'+ '\n'.join(parts)+'\n})();\n')
print('Standalone bundle generated; no server required.')
