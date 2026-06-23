# 每日事件记录器 · Daily Activity Log

一个现代极简风格的每日事件记录 App，奶白色背景 + 莫兰迪色系标签。使用 **Expo (React Native) + TypeScript** 开发，可在安卓 / iOS 上运行。

## 功能

- **主页 Timeline**：顶部显示今天日期与一句鼓励语，下方是今日记录的时间线（时间 · 彩色圆点 · 事件 · 分类）。
- **快捷记录**：右下角悬浮「＋记录」按钮，弹出底部卡片输入「做了什么」，并选择分类（工作 / 生活 / 运动 / 娱乐）。
- **统计热力图**：点击任意一条记录，进入该事件的统计页 —— 一个整月的日历，每天显示做了几次，**次数越多颜色越深**，并有本月累计、坚持天数、日均。
- 数据通过 AsyncStorage 本地持久化；首次启动会写入一组示例数据。

## 运行

```bash
npm start          # 启动 Expo 开发服务器（扫码用 Expo Go 预览）
npm run android    # 直接在已连接的安卓设备 / 模拟器上运行
npm run ios        # iOS 模拟器（需 macOS + Xcode）
npm run web        # 在浏览器里预览
```

### 在安卓真机上预览（最简单）

1. 手机安装 **Expo Go**（应用商店搜索）。
2. 电脑运行 `npm start`，手机与电脑连同一 Wi-Fi。
3. 用 Expo Go 扫描终端里的二维码即可。

### 打包成安卓 APK

使用 EAS Build：`npx eas build -p android --profile preview`（需登录 Expo 账号）。

## 目录结构

```
App.tsx                      根组件：导航状态、数据加载/持久化、安卓返回键
src/types.ts                 数据类型
src/theme.ts                 配色、分类定义、热力图颜色
src/dateUtils.ts             日期/星期/鼓励语等工具
src/storage.ts               AsyncStorage 读写 + 示例数据
src/screens/TimelineScreen   主页时间线
src/screens/StatsScreen      统计日历热力图
src/components/QuickRecordSheet  快捷记录底部卡片
```

> 统计页按「事件标题」聚合 —— 同名事件会被统计到同一张热力图（例如反复记录「喝了一大杯温水」）。
