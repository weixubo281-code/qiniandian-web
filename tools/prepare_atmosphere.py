from PIL import Image
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
out=root/'public'/'assets';source=root/'work'/'atmosphere-originals';source.mkdir(parents=True,exist_ok=True)
inputs={'dawn':'exec-0ba10251-94f0-41d1-81e2-903a4700fd50.png','dusk':'exec-ada12b68-c94a-4008-9cdf-2da42e383c3c.png'}
base=Path('C:/Users/MSN/.codex/generated_images/01a0c6d2-dcc1-7380-847b-30b5246b1837')
for key,name in inputs.items():
 shutil.copy2(base/name,source/f'{key}.png')
 image=Image.open(base/name).convert('RGB');image.save(out/f'atmosphere-{key}.webp',quality=90,method=6)
 for_mobile=image.resize((1280,720),Image.Resampling.LANCZOS);for_mobile.save(out/f'atmosphere-{key}-mobile.webp',quality=83,method=6)
for key in ['diffuse','normal']:
 image=Image.open(root/'work'/'courtyard'/f'{key}.png').convert('RGB');image.save(out/f'courtyard-{key}.webp',quality=92,method=6)
print('ATMOSPHERE_ASSETS_READY')
