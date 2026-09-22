# 祈年殿 · 3D 视觉滚动网站

本地地址：http://127.0.0.1:4173/ 。仅本地运行，未部署外部服务器。

## 启动

在本目录打开终端，执行 `npm run dev`，或运行 `start-local.ps1`。安装依赖使用 `npm ci`。首次安装需要网络，日常预览的模型、纹理与网页依赖全部由本地提供。

生产构建：`npm run build`，输出到 `dist`；`npm run preview` 可预览构建结果。开发和生产预览共用 4173 端口，切换前先停止另一服务。

## 已实现

- 六个连续滚动章节，固定导航、高亮定位、章节进度、文字渐显。
- 同一个 GLB 模型持续展示，旋转、镜头推进、整体/分层切换、四种细节视角、放大、黄昏灯光及自由拖动。
- 屋顶、木构、台基保留独立父级；分层使用相对于初始坐标的绝对偏移，反向滚动和“整体”按钮均精确归位。
- 自适应手机版布局、移动版模型、限制像素密度、空闲时暂停重复绘制、后台暂停渲染、减少动态效果偏好支持。
- 模型下载进度；失败时显示明确标注的已有模型静态预览和重试按钮，同时保留网页文字与导航。正常展示始终使用真实 WebGL 模型，没有使用设计稿截图或视频替代交互。

## 项目与资源

- `asset-index.json`：最终资源索引、来源、组件、尺寸与压缩记录。
- `public/assets/qiniandian-desktop.glb`：桌面模型，约 12.8 MB、89.5 万三角面。
- `public/assets/qiniandian-mobile.glb`：移动模型，约 8.2 MB、48.2 万三角面。
- `src/main.js`：模型加载、摄影灯光、连续滚动状态与交互。
- `src/style.css`、`index.html`：真实 HTML 内容、排版及响应式界面。
- `qa/`：实际浏览器截图及测试报告。
- `tools/`：Blender 导出、贴图转换、GLB 优化、浏览器验证脚本。

来源为相邻目录 `祈年殿Blender场景/Qiniandian_Editable.blend` 和 `祈年殿官网视觉稿/SCREEN-01…06.png`；原工程与设计稿未覆盖。设计稿只用于比对，没有打包进网站替代页面。

## 模型导出

使用 Blender 5.0 后台实际打开现有工程，读取第 1 帧完整状态，将程序化材质烘焙为可重复平铺的底色与切线法线贴图，保留金属度和粗糙度参数。材质纹理以 WebP 内嵌 GLB，运行时无外部贴图路径依赖。网页版本取消微小倒角修改器，保留所有独立对象节点与父子关系。

通过 glTF Transform 进行网格缓存优化、重复数据复用、Meshopt 压缩和移动版减面，没有跨运动组件合并几何。保留 113 个命名节点、110 个网格实例、3 个独立运动父级。压缩会重用相同几何并对顶点量化，原始 Blender 局部变换另存于 glTF extras。源模型坐标由 Z-up 转换为 glTF 的 Y-up，单位仍为米，建筑中心位于原点，模型通高约 38.12 米。

重新导出流程：用 Blender 执行 `tools/export_blender.py` → `python tools/prepare_textures.py`（需 Pillow）→ `npm run optimize` → `npm run build`。中间检查数据位于 `work/blender-export.json`。未重新生成建筑模型。

## 验证与限制

氛围更新：参考第 1、6 屏制作清晨与黄昏环境背景，以滚动进度交叉过渡；背景仅含天空、远景和雾气，建筑仍使用原有实时 GLB。庭院使用原 Blender 工程的 `PBR_Courtyard_Paving` 材质实际烘焙底色与法线，搭配暖色侧光、接触阴影和距离雾。环境原图位于 `work/atmosphere-originals/`，网页 WebP 与手机缩小版本位于 `public/assets/`；索引已记入 `asset-index.json`。页脚包含 AIGC David 个人网站链接。

`npm run test:browser` 使用本机 Chrome 与 Playwright，覆盖桌面六屏、手机六屏、正反向滚动、精确拆解归位、导航、材质视角、镜头放大、自由探索、触摸滚动、失败重试、深链接和减少动态效果。截图保存在 `qa/`。移动验证为浏览器触摸与视口模拟，没有声称已在实体手机或 Safari 上实测。

现有模型为简化外观艺术重建；本网站保留其结构与装饰，不补造精确斗栱、彩绘龙纹或内部榫卯，因此模型精细度低于 AI 设计稿。网页材质使用共享平铺烘焙纹理，光照为实时 WebGL，与 Cycles 离线渲染和 AI 设计稿不会逐像素一致。模型首次加载仍需约 8–13 MB，较旧手机可能帧率偏低。现代 WebGL2 浏览器体验最佳。

建筑内容来源：[天坛公园](https://tiantanpark.cn/scenic_spot_list/detail/1254.html)。技术参考：[Three.js](https://threejs.org/docs/) · [glTF Transform](https://gltf-transform.dev/modules/functions/functions/meshopt)。
