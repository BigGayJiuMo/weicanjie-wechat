Page({
    data: {
      reviews: []
    },
  
    onLoad() {
      this.loadMyReviews();
    },
  
    /** 加载当前用户的所有评价 */
    loadMyReviews() {
        const app = getApp();
        const userId = app.globalData.userInfo.id;
      
        wx.request({
          url: `${app.globalData.baseUrl}/review/userReviews?userId=${userId}`,
          method: "GET",
          success: (res) => {
            if (res.data.code !== 200) {
              wx.showToast({ title: "加载失败", icon: "none" });
              return;
            }
      
            let list = res.data.data || [];
      
            list.forEach(item => {
              // 图片 JSON 解析
              try {
                item.images = item.image_urls ? JSON.parse(item.image_urls) : [];
              } catch {
                item.images = [];
              }
      
              // 字段映射给前端使用
              item.restaurantLogo = item.restaurant_logo;
              item.restaurantName = item.restaurant_name;
              item.restaurantId = item.restaurant_id;
              item.created_time = this.formatTime(item.created_time);
            });
      
            this.setData({
              reviews: list
            });
          }
        });
      },
  
    /** 图片预览 */
    previewImage(e) {
      const current = e.currentTarget.dataset.url;
      const urls = e.currentTarget.dataset.urls;
  
      wx.previewImage({
        current,
        urls
      });
    },
  /** 删除评价 */
onDeleteReview(e) {
    const reviewId = e.currentTarget.dataset.id;
    const app = getApp();
  
    wx.showModal({
      title: "确认删除评价？",
      content: "删除后不可恢复",
      confirmColor: "#ff4d4f",
      success: res => {
        if (res.confirm) {
          wx.request({
            url: `${app.globalData.baseUrl}/review/delete/${reviewId}`,
            method: "POST",
            success: (res) => {
              if (res.data.code === 200) {
                wx.showToast({ title: "已删除", icon: "success" });
                this.loadMyReviews(); // ⭐刷新列表
              } else {
                wx.showToast({ title: "删除失败", icon: "none" });
              }
            }
          })
        }
      }
    })
  },
  goRestaurant(e) {
    const restaurantId = e.currentTarget.dataset.id;
  
    if (!restaurantId) {
      wx.showToast({
        title: "找不到餐厅ID",
        icon: "none"
      });
      return;
    }
  
    wx.navigateTo({
      url: `/pages/restaurant-detail/restaurant-detail?id=${restaurantId}`
    });
  },
    onBack() {
      wx.navigateBack();
    },
    formatTime(t) {
        if (!t) return "";
      
        // 将 2025-12-04T20:13:58 替换成标准格式
        t = t.replace("T", " ").replace(/-/g, "/");
      
        const date = new Date(t);
        if (isNaN(date)) return t;
      
        const pad = n => n.toString().padStart(2, "0");
      
        const y = date.getFullYear();
        const m = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        const h = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const s = pad(date.getSeconds());
      
        return `${y}-${m}-${d} ${h}:${mm}:${s}`;
      }
  });
  