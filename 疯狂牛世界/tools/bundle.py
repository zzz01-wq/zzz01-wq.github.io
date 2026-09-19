"""Create an offline, single-file build using only the Python standard library."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '\n</style>')
for name in ('core', 'render', 'game'):
    html = html.replace(f'<script src="js/{name}.js"></script>', '<script>\n' + (root / f'js/{name}.js').read_text() + '\n</script>')
svg = base64.b64encode((root / 'assets/icon.svg').read_bytes()).decode()
html = html.replace('href="assets/icon.svg"', f'href="data:image/svg+xml;base64,{svg}"')
output = root / '疯狂牛世界.html'
output.write_text(html)
print(f'Generated {output.name}: {output.stat().st_size:,} bytes')
