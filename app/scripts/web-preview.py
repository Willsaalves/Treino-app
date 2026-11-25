"""Gera um preview web em UM arquivo HTML (dist-demo/preview.html) a partir do `npm run build:demo`.
Inline do bundle JS e das imagens, e força a rota "/" (para abrir em qualquer caminho/hospedagem)."""
import base64, glob, os, re, sys

d = sys.argv[1] if len(sys.argv) > 1 else "dist-demo"
js = open(glob.glob(f"{d}/_expo/static/js/web/entry-*.js")[0], encoding="utf-8").read()

def inline(m):
    f = d + m.group(1)
    return f'uri:"data:image/png;base64,{base64.b64encode(open(f, "rb").read()).decode()}"' if os.path.exists(f) else m.group(0)

js = re.sub(r'uri:"(/assets/[^"]+\.png)"', inline, js).replace("</script", "<\\/script")
html = open(f"{d}/index.html", encoding="utf-8").read()
html = re.sub(r'<script src="[^"]+" defer></script>', "", html)
html = html.replace('<link rel="icon" href="/favicon.ico"/>', "").replace('<html lang="en">', '<html lang="pt-BR">')
html = html.replace('<style id="expo-reset">', '<style id="expo-reset">\n      html,body{background:#0B0B0F}')
boot = '<script>try{if(location.pathname!=="/")history.replaceState(null,"","/"+location.hash)}catch(e){}</script>'
html = html.replace("</body>", boot + "<script>" + js + "</script>\n</body>")
out = f"{d}/preview.html"
open(out, "w", encoding="utf-8").write(html)
print(f"{out} ({len(html) // 1024} KB)")
