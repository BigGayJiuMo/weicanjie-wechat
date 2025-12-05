// pages/review/review.js
Page({
    data: {
      orderId: null,
      restaurantId: null,
      rating: 0,
      taste: 0,
      pack: 0,
      content: "",
      images: [],
      isAnon: false   // ⭐必须为 Boolean
    },
  
    onLoad(options) {
      this.setData({
        orderId: options.orderId,
        restaurantId: options.restaurantId
      });
    },
  
    /* ⭐评分 */
    onRateOverall(e) {
      this.setData({ rating: e.currentTarget.dataset.index + 1 });
    },
    onRateTaste(e) {
      this.setData({ taste: e.currentTarget.dataset.index + 1 });
    },
    onRatePack(e) {
      this.setData({ pack: e.currentTarget.dataset.index + 1 });
    },
  
    /* 文字内容 */
    onInputContent(e) {
      this.setData({ content: e.detail.value });
    },
  
    /* ⭐ 匿名开关（始终用 Boolean） */
    onAnonChange(e) {
      this.setData({ isAnon: e.detail.value }); // true / false
    },
  
    /* 上传图片 */
    chooseImage() {
        wx.chooseMedia({
          count: 6 - this.data.images.length,
          mediaType: ["image"],
          success: res => {
            res.tempFiles.forEach(file => {
              wx.uploadFile({
                url: getApp().globalData.baseUrl + "/upload/image?type=review",
                filePath: file.tempFilePath,
                name: "file",
                success: uploadRes => {
                  const url = JSON.parse(uploadRes.data).data;
                  this.setData({
                    images: [...this.data.images, url]
                  });
                }
              });
            });
          }
        });
      },
  
    previewImage(e) {
      wx.previewImage({
        current: e.currentTarget.dataset.url,
        urls: this.data.images
      });
    },
  
    removeImage(e) {
      const index = e.currentTarget.dataset.index;
      const arr = this.data.images;
      arr.splice(index, 1);
      this.setData({ images: arr });
    },
  
    /* ⭐ 提交 */
    onSubmit() {
      const app = getApp();
  
      if (this.data.rating === 0) {
        wx.showToast({ title: "请给总体评分", icon: "none" });
        return;
      }
  
      wx.showLoading({ title: "提交中..." });
  
      const uploaded = [...this.data.images];
  
      wx.request({
        url: app.globalData.baseUrl + "/review/add",
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: {
          userId: app.globalData.userInfo.id,
          orderId: this.data.orderId,
          restaurantId: this.data.restaurantId,
          rating: this.data.rating,
          taste: this.data.taste,
          pack: this.data.pack,
          content: this.data.content,
          imageUrls: JSON.stringify(uploaded),
  
          // ⭐ 后端要 Integer，这里转换
          isAnon: this.data.isAnon ? 1 : 0
        },
        success: res => {
          wx.hideLoading();
  
          if (res.data.code === 200) {
            wx.showToast({
              title: "评价成功",
              icon: "success"
            });
  
            setTimeout(() => {
              wx.navigateBack();
            }, 800);
          } else {
            wx.showToast({ title: "提交失败", icon: "none" });
          }
        }
      });
    },
  
    onBack() {
      wx.navigateBack();
    }
  });
  