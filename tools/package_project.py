from pathlib import Path
import zipfile

root=Path(__file__).resolve().parent.parent
target=root.parent/'qiniandian-web-github.zip'
excluded={'node_modules','.git','work','qa','__pycache__'}
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for path in sorted(root.rglob('*')):
        rel=path.relative_to(root)
        if not path.is_file() or any(part in excluded for part in rel.parts):
            continue
        if path.suffix in {'.log','.zip'} or path.name.startswith('.env'):
            continue
        archive.write(path,Path('qiniandian-web')/rel)
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert 'qiniandian-web/.github/workflows/pages.yml' in archive.namelist()
print(f'{target}\n{target.stat().st_size} bytes')
