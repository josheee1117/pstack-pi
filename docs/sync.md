# 跟上游同步，以及自己演进

## 当前分工

- `upstream` 是转换后的上游快照分支。`upstream.json` 决定来源、复制范围、排除项、注册名；`upstream.lock` 记录实际读过的上游提交。
- 产品分支保留中文描述、Pi 适配、行为边界和脚本补丁。每次同步在临时集成分支上做，例如 `integrate/pstack-<版本>`；验收并获准后再合入 `main`。
- `adapter/`、`extensions/`、本包文档和测试由我们维护。它们通常不会与上游机械合并冲突，但上游行为变了仍需检查语义。
- `skills/` 保留上游目录结构及大部分正文。中文描述是一行本地补丁；worktree 审计入口是本地替换，真正实现位于 `adapter/worktree-audit.mjs`。

同步器只导入快照、提交到本地 `upstream`。**不会合并产品分支、不会推送、不会发布，也不会安装依赖。**维护工具在源码仓库中，不随 Pi 安装包交付。

## 先固定目标，再决定是否需要更新

上游是 monorepo。不能只看插件版本号，也不能因为整个仓库 HEAD 变了就升级。

```bash
# 在已有 cursor/plugins 克隆里获取候选版本；网络读取由操作者发起
git -C /path/to/cursor-plugins fetch origin
# 记录输出的完整 SHA 为 TARGET
 git -C /path/to/cursor-plugins rev-parse origin/main
# BASE 是本包 upstream.lock 的 commit；两者都替换为真实 SHA
git -C /path/to/cursor-plugins diff --stat BASE TARGET -- pstack
git -C /path/to/cursor-plugins diff --quiet BASE TARGET -- pstack
```

最后一条退出码 0 表示 pstack 目录没变：**不导入、不合并，不为 monorepo 的其他改动制造升级提交**。非零先分清是真有差异，还是提交未获取等命令错误。以上是人工检查步骤，不是脚本内部的自动更新检测器。

## 有更新时

先保证产品工作区干净，在已经包含旧上游快照的产品分支上创建集成分支：

```bash
git status --short
git switch -c integrate/pstack-update
node tools/sync-upstream.mjs --source /path/to/cursor-plugins --ref TARGET
# 查看上游这次改动，三方差异不是最终合并结果
git diff HEAD...upstream --stat
git merge --no-commit --no-ff upstream
# 解决冲突，检查暂存区及未暂存改动，再运行
npm test
```

没有本地克隆时，可省略 `--source`，脚本克隆 `upstream.json` 指定仓库。省略 `--ref` 时：有 `--source` 就读取它的 **HEAD 提交**，否则读取配置的默认 ref。无论哪种，都只导出指定提交的文件，不夹带源目录的未提交改动。

只预览：

```bash
node tools/sync-upstream.mjs --source /path/to/cursor-plugins --ref TARGET --dry-run /path/to/new-empty-directory
```

目标目录必须不存在或为空，避免覆盖文件、夹带旧快照。预览不改变本包的分支；脚本在源仓库建临时 detached worktree，结束后移除。

本地缺 `upstream`、远端有它时，脚本会跟踪 `origin/upstream`。新克隆也可以先 `git fetch origin upstream`。若两者都没有但产品已有 `upstream.lock`，脚本拒绝凭空重建无关历史：从 `git log --graph --all --oneline` 找到原快照提交，用 `git branch upstream <快照提交>` 恢复。不要把产品 HEAD 当成快照。已有同名分支若没有快照标记或来源不一致，也会拒绝覆盖。

## 冲突和验收

| 位置 | 应保留的意思 |
|---|---|
| `description:` | 理解上游新描述后更新中文翻译，不机械取一边 |
| worktree 审计入口 | 保留 Pi 会话识别、跨平台实现和人工删除门槛；评估上游改动是否也应移植到 helper |
| 技能正文 | 检查新增授权、工具要求、独立性要求是否与本包政策冲突 |
| 新增/删除/改名的技能 | 更新 `upstream.json`、测试清单、覆盖表和中文描述；检查相对链接及注册名 |

脚本只提示新增行里命中的**已知**平台词，不会发现所有新 API 或规则冲突。没有提示不等于兼容，也不是唯一的人工审查点。更新 `NOTICE.md` 与锁定提交一致，再运行测试、打包安装检查和受影响路径的最小 smoke。原版 Pi 的已知目录名警告与真正的技能重名错误分开处理，见 `install.md`。

失败就留在集成分支修复，或在未开始本地修改前用 `git merge --abort` 取消合并。不要默认重置工作区。测试通过后也仍需人工批准提交、合并产品分支和发布；分支推送不是同步器的一部分。

## 选择性吸收，不必整包跟随

1. 通用偏好放 `adapter/overrides.md`；平台做法放 `adapter/platform.md` 或对应 note。
2. 只属于一个技能的改进可以直接改正文，用小提交说明理由。以后上游碰同一段，按含义合并。
3. 只想要一个修复时，先导入目标快照，然后按两个快照之间的 diff 手工移植或挑选文件，附上来源 SHA。**不要把一次选择性移植写成已全量升级，也不要单独把产品的 `upstream.lock` 改到新版本。**记录选择及遗漏，待全量升级时复核。
4. 整次合并后拒绝某项改动，用明确的回退提交说明原因；将来上游再次修改该区域仍可能重新出现冲突，不保证永远无需处理。
5. 本包独有技能可以直接新增，同时更新测试清单和覆盖表。彻底排除上游某路径时再更新 `drop`。不为这些选择另造调度器或注册表。
