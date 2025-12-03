Page({
    data: {
      orderList: [],
      allOrders: []
    },
  
    onShow() {
        this.loadOrders();
    },

    loadOrders() {
      const app = getApp();
      const userId = app.globalData.userInfo.id;
      wx.request({
        url: app.globalData.baseUrl + "/order/list/" + userId,
        method: "GET",
        success: (res) => {
          if (res.data.code === 200) {
            const list = res.data.data.map(o => ({
              ...o,
              createdTime: this.formatTime(o.createdTime),
              statusClass: this.getStatusClass(o.status),
              restaurantName: o.restaurantName || "",
              restaurantLogo: o.restaurantLogo || "",
            }));
            list.forEach(item => {
                // 是否完成
                const isFinished = item.status === 3 || item.status === 4;
              
                // 时间判断
                const created = new Date(item.createdTime.replace(/-/g, "/"));
                const diffHour = (new Date() - created) / 3600000;
                const expire = diffHour > 24;
              
                item._expired = expire;
                item._canReview = isFinished && !expire;
              });
            this.setData({
              orderList: list,
              allOrders: list
            });
              this.checkOrdersReview(list);
          }
        }
      });
    },

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
        case 3: return "completed";
        case 4: return "cancelled";
        default: return "";
      }
    },

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

    formatTime(t) {
      if (!t) return "";
      try {
        const date = new Date(t.replace("T", " ").replace(/-/g, "/"));
        if (isNaN(date.getTime())) return t;
        const pad = (n) => n.toString().padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} `
             + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      } catch {
        return t;
      }
    },

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
    checkOrdersReview(list) {
        const app = getApp();
        const userId = app.globalData.userInfo.id;
    
        wx.request({
            url: app.globalData.baseUrl + "/review/userReviews",
            method: "GET",
            data: { userId },
            success: res => {
                const reviewed = res.data.data || [];
    
                list.forEach(item => {
                    item._hasReview = reviewed.some(r => r.orderId === item.id);
                });
    
                this.setData({
                    orderList: list,
                    allOrders: list
                });
            }
        });
    }
    ,
    goReview(e) {
        const orderId = e.currentTarget.dataset.id;
        const order = this.data.orderList.find(o => o.id === orderId);
    
        wx.navigateTo({
            url: `/pages/review/review?orderId=${orderId}&restaurantId=${order.restaurantId}`
        });
    },    
    onBack() {
      wx.navigateBack();
    }
});
