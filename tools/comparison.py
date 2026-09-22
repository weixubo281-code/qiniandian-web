from pathlib import Path
root=Path(__file__).resolve().parent.parent
titles=['首页','建筑介绍','结构解析','细节之美','文化价值','收尾探索']
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>祈年殿 · 设计与实测对照</title><style>body{background:#0b0d12;color:#eee;font:16px Arial,"Microsoft YaHei";margin:40px}h1{font-weight:400;color:#c9a45c}p{color:#aaa}section{margin:40px 0 65px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{width:100%;border:1px solid #c9a45c44}figcaption{padding:10px 0;color:#aaa}a{color:#c9a45c}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><h1>祈年殿 · 设计与实测对照</h1><p>左：已确认设计稿。右：真实网页截图。网站主体使用现有 GLB 模型。</p>'''
for i,title in enumerate(titles,1):
    html+=f'<section><h2>0{i} · {title}</h2><div class="pair"><figure><img src="../../祈年殿官网视觉稿/SCREEN-0{i}.png"><figcaption>确认设计稿</figcaption></figure><figure><img src="desktop-0{i}.png"><figcaption>桌面网页实测 · <a href="mobile-0{i}.png">查看手机截图</a></figcaption></figure></div></section>'
html+='</html>'
(root/'qa'/'设计与实测对照.html').write_text(html,encoding='utf-8')
print('COMPARISON_READY')
