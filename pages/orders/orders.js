Page({
    data: {
      orderList: [],
      allOrders: []
    },
  
    onLoad() {
    },
    onShow() {
        this.loadOrders();
      },
    /** 加载订单 **/
    loadOrders() {
      const app = getApp();
      const userId = app.globalData.userInfo.id;
  
      wx.request({
        url: app.globalData.baseUrl + "/order/list/" + userId,
        method: "GET",
        success: (res) => {
          if (res.data.code === 200) {
  
            // 处理订单列表（格式化时间 + 设置餐厅名称）
            const list = res.data.data.map(o => ({
              ...o,
              createdTime: this.formatTime(o.createdTime),
              statusClass: this.getStatusClass(o.status),
              restaurantName: o.restaurantName || "",   // 防止 undefined
              restaurantLogo: o.restaurantLogo || "",
            }));
            
            this.setData({
              orderList: list,
              allOrders: list
            });
          }
        }
      });
    },
  
    /** 搜索 **/
    onSearchInput(e) {
      const keyword = e.detail.value.trim();
  
      if (!keyword) {
        this.setData({ orderList: this.data.allOrders });
        return;
      }
  
      const searchList = this.data.allOrders.filter(o =>
        (o.restaurantName || "").includes(keyword)
      );
  
      this.setData({ orderList: searchList });
    },
    getStatusClass(status) {
        switch (status) {
          case 1: return "pending";
          case 2: return "processing";
          case 3: return "delivering";
          case 4: return "completed";
          case 5: return "cancelled";
          default: return "";
        }
      },
    /** 长按删除订单 **/
    onDeleteConfirm(e) {
      const orderId = e.currentTarget.dataset.id;
  
      wx.showModal({
        title: "是否要删除订单？",
        content: "删除的订单无法申请售后和评价",
        confirmText: "删除",
        confirmColor: "#ff6b35",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.deleteOrder(orderId);
          }
        }
      });
    },
  
    deleteOrder(orderId) {
      const app = getApp();
  
      wx.request({
        url: app.globalData.baseUrl + "/order/delete/" + orderId,
        method: "POST",
        success: (res) => {
          if (res.data.code === 200) {
            wx.showToast({ title: "已删除", icon: "success" });
            this.loadOrders();
          }
        }
      });
    },
  
    /** 格式化时间：2025-12-01 14:24:34 **/
    formatTime(t) {
      if (!t) return "";
  
      try {
        const date = new Date(t.replace("T", " ").replace(/-/g, "/"));
  
        if (isNaN(date.getTime())) {
          console.warn("无法解析的时间格式：", t);
          return t;
        }
  
        const pad = (n) => n.toString().padStart(2, "0");
  
        const Y = date.getFullYear();
        const M = pad(date.getMonth() + 1);
        const D = pad(date.getDate());
        const h = pad(date.getHours());
        const m = pad(date.getMinutes());
        const s = pad(date.getSeconds());
  
        return `${Y}-${M}-${D} ${h}:${m}:${s}`;
      } catch (e) {
        console.error("时间格式化失败：", e);
        return t;
      }
    },
  /** 跳转到餐厅详情 */
    goToRestaurant(e) {
    const restaurantId = e.currentTarget.dataset.id;
  
    wx.navigateTo({
      url: `/pages/restaurant-detail/restaurant-detail?id=${restaurantId}`
    });
  },
  goToOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${id}`
    });
  },
    onBack() {
      wx.navigateBack();
    }
  });
  