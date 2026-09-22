from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parent.parent
for variant,size in [('desktop',512),('mobile',256)]:
    out=root/'work'/'textures'/variant;out.mkdir(parents=True,exist_ok=True)
    for source in (root/'work'/'baked').glob('*.png'):
        image=Image.open(source).convert('RGB');image.thumbnail((size,size),Image.Resampling.LANCZOS)
        image.save(out/(source.stem+'.webp'),quality=88,method=6)
out=root/'public'/'assets';out.mkdir(parents=True,exist_ok=True)
image=Image.open(root.parent/'祈年殿Blender场景'/'renders'/'01_Hero.png').convert('RGB');image.thumbnail((1200,675));image.save(out/'model-poster.webp',quality=80)
print('TEXTURES_READY')
