// pages/search-order/search-order.js
Page({
    data: {
      keyword: "",
      orderList: [],
      historyList: [],
      loading: false,
      showResult: false,
      isFocus: false
    },
  
    onLoad() {
      this.loadHistory();
    },
  
    /** 输入框 */
    onInput(e) {
      this.setData({
        keyword: e.detail.value.trim()
      });
    },
  
    /** 聚焦时隐藏历史与结果 */
    onFocus() {
      this.setData({ isFocus: true });
    },
  
    onBlur() {
      this.setData({ isFocus: false });
    },
  
    /** 执行搜索 */
    onSearch() {
      const keyword = this.data.keyword.trim();
      if (!keyword) return;
  
      this.addHistory(keyword);
      this.searchOrders(keyword);
    },
  
    /** 请求订单搜索接口 */
    searchOrders(keyword) {
      this.setData({ loading: true });
  
      const app = getApp();
      const userId = app.globalData.userInfo.id;
  
      wx.request({
        url: `${app.globalData.baseUrl}/order/search`,
        method: "GET",
        data: { keyword, userId },
        success: res => {
          if (res.data.code === 200) {
  
            let list = res.data.data.map(o => ({
              ...o,
              totalAmount: Number(o.totalAmount).toFixed(2),
              totalQuantity: (o.items || []).reduce((sum, i) => sum + i.quantity, 0),
              statusText: this.getStatusText(o.status),
              statusClass: this.getStatusClass(o.status),
              createdTime: this.formatTime(o.createdTime)
            }));
  
            // ⭐ 处理评价状态：可评价 / 已评价 / 已过期
            this.computeReviewStatus(list);
          }
        },
        complete: () => this.setData({ loading: false })
      });
    },
  
    /** ⭐ 计算评价状态 */
    computeReviewStatus(list) {
      // 计算是否过期是否可评价
      list.forEach(item => {
        const isFinished = item.status === 3 || item.status === 4;
  
        const created = new Date(item.createdTime.replace(/-/g, "/"));
        const diffHour = (new Date() - created) / 3600000;
        const expired = diffHour > 24;
  
        item._expired = expired;
        item._canReview = isFinished && !expired;
      });
  
      // 再查已评价订单
      this.fetchReviewedOrders(list);
    },
  
    /** ⭐ 查询已评价订单 */
    fetchReviewedOrders(list) {
      const app = getApp();
      const userId = app.globalData.userInfo.id;
  
      wx.request({
        url: app.globalData.baseUrl + "/review/userReviews",
        method: "GET",
        data: { userId },
        success: res => {
          const reviewed = res.data.data || [];
  
          list.forEach(item => {
            item._hasReview = reviewed.some(r =>
              r.orderId === item.id || r.order_id === item.id
            );
          });
  
          this.setData({
            orderList: list,
            showResult: true
          });
        }
      });
    },
  
    /** 状态文本 */
    getStatusText(status) {
        return {
            1: "待支付",
            2: "待处理",
            3: "制作中",
            4: "已完成",
            5: "已取消",
            6: "退款中",
            7: "已退款"
          }[status] || "未知状态";
    },
  
    /** 状态样式 */
    getStatusClass(status) {
        return {
          1: "pending",       // 待支付
          2: "processing",    // 待处理
          3: "making",        // 制作中
          4: "completed",     // 已完成
          5: "cancelled",     // 已取消
          6: "refunding",     // 退款中
          7: "refunded"       // 已退款
        }[status] || "";
    },
  
    /** 时间格式化 */
    formatTime(t) {
      if (!t) return "";
      t = t.replace("T", " ").replace(/-/g, "/");
      const d = new Date(t);
      const pad = n => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
           + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },
  
    /** 加载历史 */
    loadHistory() {
      this.setData({
        historyList: wx.getStorageSync("order_search_history") || []
      });
    },
  
    /** 保存历史 */
    addHistory(keyword) {
      let list = wx.getStorageSync("order_search_history") || [];
      list = list.filter(i => i !== keyword);
      list.unshift(keyword);
      if (list.length > 10) list = list.slice(0, 10);
  
      wx.setStorageSync("order_search_history", list);
      this.setData({ historyList: list });
    },
  
    /** 点击历史记录 */
    onHistoryTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.setData({ keyword });
      this.onSearch();
    },
  
    /** 删除单条历史 */
    onHistoryLongPress(e) {
      const keyword = e.currentTarget.dataset.keyword;
  
      wx.showModal({
        title: "删除记录",
        content: `是否删除历史记录「${keyword}」？`,
        confirmColor: "#ff6b35",
        success: res => {
          if (res.confirm) {
            let list = wx.getStorageSync("order_search_history") || [];
            list = list.filter(i => i !== keyword);
            wx.setStorageSync("order_search_history", list);
            this.setData({ historyList: list });
          }
        }
      });
    },
  
    /** 清空历史 */
    clearHistory() {
      wx.showModal({
        title: "提示",
        content: "确定要清空搜索历史吗？",
        confirmColor: "#ff6b35",
        success: res => {
          if (res.confirm) {
            wx.removeStorageSync("order_search_history");
            this.setData({ historyList: [] });
          }
        }
      });
    },
  
    /** 跳转订单详情 */
    goDetail(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?orderId=${id}`
      });
    },
  
    onBack() {
      wx.navigateBack();
    }
  });
  