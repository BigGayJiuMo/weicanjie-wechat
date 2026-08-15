# 微餐捷小程序

微餐捷（weicanjie）餐厅点餐微信小程序，配套后端服务 [weicanjie](https://github.com/BigGayJiuMo/weicanjie)。

## 功能

- 🔍 **餐厅浏览**：首页餐厅列表、分页加载、下拉刷新、关键词搜索
- 📂 **分类菜单**：按分类浏览菜品
- 🛒 **购物车**：加购、改量、结算
- 🧾 **订单**：下单、订单列表、订单详情、历史订单、退款
- ⭐ **评价**：菜品评价、匿名评价、评价举报
- ❤️ **收藏**：收藏餐厅
- 👤 **个人中心**：登录授权（游客模式）、资料编辑、浏览历史
- 📄 **协议**：用户协议、隐私政策

## 页面结构

| 页面 | 路径 | 说明 |
|---|---|---|
| 首页 | `pages/index/index` | 餐厅列表（tabBar） |
| 分类 | `pages/menu/menu` | 菜品分类（tabBar） |
| 购物车 | `pages/cart/cart` | 购物车（tabBar） |
| 我的 | `pages/profile/profile` | 个人中心（tabBar） |
| 登录 | `pages/auth/auth` | 微信授权登录 |
| 餐厅详情 | `pages/restaurant-detail/restaurant-detail` | 餐厅信息与菜单 |
| 菜品详情 | `pages/dish-detail/dish-detail` | 菜品信息 |
| 提交订单 | `pages/submitOrder/submitOrder` | 结算下单 |
| 订单列表 | `pages/orders/orders` | 我的订单 |
| 订单详情 | `pages/order-detail/order-detail` | 订单状态 |
| 评价 | `pages/reviews/reviews` / `pages/review/review` | 评价列表 / 发表评价 |
| 搜索 | `pages/search-restaurant/search-restaurant` | 餐厅搜索 |

## 技术要点

- 原生微信小程序框架（`glass-easel` 组件框架 + Skyline 渲染器）
- 网络层统一封装在 `utils/request.js`（含 baseUrl 配置与错误提示）
- 游客模式：未登录也可浏览，登录后同步数据

## 运行

1. 下载安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目目录 `weicanjie`
3. 在 `utils/request.js` 中将 `baseUrl` 改为后端服务地址（默认 `http://localhost:8080/api`）
4. 编译运行即可

> 注意：`project.private.config.json` 为本地私有配置，已加入 `.gitignore`，不会被提交。

## 相关项目

- 后端服务：[weicanjie](https://github.com/BigGayJiuMo/weicanjie)

## License

内部项目，未经授权请勿用于商业用途。
