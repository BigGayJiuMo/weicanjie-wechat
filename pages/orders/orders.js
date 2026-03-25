Page({
    data: {
      orderList: [],
      allOrders: [],
      activeTab: "all"
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
  
            const list = res.data.data.map(o => {
              const totalAmount = Number(o.totalAmount || 0).toFixed(2);
  
              const items = (o.items || []).map(dish => ({
                ...dish,
                dishPrice: Number(dish.dishPrice || dish.price || 0).toFixed(2),
                imageUrl: dish.dishImageUrl || dish.dishImage || "/images/logo.png" 
              }));
  
              return {
                ...o,
                createdTime: this.formatTime(o.createdTime),
                statusClass: this.getStatusClass(o.status),
                statusText: this.getStatusText(o.status),
                restaurantName: o.restaurantName,
                restaurantLogo: o.restaurantLogo,
                totalAmount,
                items
              };
            });
  
            /** 状态：4 = 已完成; 24h 后不能评价 */
            list.forEach(item => {
                const created = new Date(item.createdTime.replace(/-/g, "/"));
                const diffHour = (new Date() - created) / 3600000;
                const expire = diffHour > 24;
              
                item._expired = expire;
                item._canReview = (item.status === 6) && !expire;
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
  
    /** 状态颜色 */
    getStatusClass(status) {
    switch (status) {
        case 1: return "pending";        // 待支付
        case 2: return "processing";     // 待处理
        case 3: return "making";         // 制作中
        case 4: return "making";         // 待取餐
        case 5: return "cancelled";      // 已取消
        case 6: return "completed";      // 已完成
        case 7: return "refunding";      // 退款中
        case 8: return "refunded";       // 已退款
        default: return "";
      }
    },
  
    /** 状态文本 */
    getStatusText(status) {
      const map = {
        1: "待支付",
        2: "待处理",
        3: "制作中",
        4: "待取餐",
        5: "已取消",
        6: "已完成",
        7: "退款中",
        8: "已退款" 
      };
      return map[status] || "未知状态";
    },
  
    /** 删除订单 */
    onDeleteConfirm(e) {
      const id = e.currentTarget.dataset.id;
  
      wx.showModal({
        title: "是否删除订单？",
        content: "删除后将无法查看评价信息",
        confirmColor: "#ff6b35",
        success: res => {
          if (res.confirm) this.deleteOrder(id);
        }
      });
    },
  
    deleteOrder(orderId) {
      const app = getApp();
  
      wx.request({
        url: app.globalData.baseUrl + "/order/delete/" + orderId,
        method: "POST",
        success: () => {
          wx.showToast({ title: "已删除" });
          this.loadOrders();
        }
      });
    },
  
    /** 时间格式化 */
    formatTime(t) {
      if (!t) return "";
      const date = new Date(t.replace("T", " ").replace(/-/g, "/"));
      const pad = n => n.toString().padStart(2, "0");
  
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} `
           + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },
  
    goToOrderDetail(e) {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?orderId=${e.currentTarget.dataset.id}`
      });
    },
  
    goToRestaurant(e) {
      wx.navigateTo({
        url: `/pages/restaurant-detail/restaurant-detail?id=${e.currentTarget.dataset.id}`
      });
    },
  
    goReview(e) {
      const id = e.currentTarget.dataset.id;
      const item = this.data.orderList.find(o => o.id === id);
  
      wx.navigateTo({
        url: `/pages/review/review?orderId=${id}&restaurantId=${item.restaurantId}`
      });
    },
  
    goSearchPage() {
        wx.navigateTo({
          url: "/pages/search-order/search-order"
        });
      },
    /** 查询是否已评价 */
    checkOrdersReview(list) {
      const app = getApp();
      const userId = app.globalData.userInfo.id;
  
      wx.request({
        url: app.globalData.baseUrl + "/review/userReviews",
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
            allOrders: list
          });
        }
      });
    },
  
    /** 标签切换 */
    onTabChange(e) {
        const type = e.currentTarget.dataset.type;
        this.setData({ activeTab: type });
      
        if (type === "all") {
          this.setData({ orderList: this.data.allOrders });
        } else if (type === "pending") {
          this.setData({ orderList: this.data.allOrders.filter(o => o.status === 1) });
        } else if (type === "review") {
          this.setData({
            orderList: this.data.allOrders.filter(o => o._canReview && !o._hasReview)
          });
        }
      },
    onBack() {
        wx.navigateBack();
      }
  });
  