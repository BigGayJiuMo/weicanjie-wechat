// pages/review-report/review-report.js
Page({
    data: {
      reviewId: null,
      reasonList: [
        { label: "虚假评价", value: "fake" },
        { label: "恶意差评", value: "malicious" },
        { label: "侮辱攻击", value: "insult" },
        { label: "广告/违规内容", value: "ads" },
        { label: "涉及隐私", value: "privacy" }
      ],
      selectedReason: "",
      detail: "",
      images: [],        // 存储本地临时路径
      uploading: false   // 是否正在上传
    },
  
    onLoad(options) {
      this.setData({
        reviewId: Number(options.reviewId)
      });
    },
  
    onBack() {
      wx.navigateBack();
    },
  
    onSelectReason(e) {
      this.setData({ selectedReason: e.detail.value });
    },
  
    onInputDetail(e) {
      this.setData({ detail: e.detail.value });
    },
  
    // 选择图片
    chooseImage() {
      wx.chooseMedia({
        count: 3,
        mediaType: ["image"],
        success: res => {
          const paths = res.tempFiles.map(f => f.tempFilePath);
          this.setData({
            images: [...this.data.images, ...paths]
          });
        }
      });
    },
  
    // 删除选中的图片
    removeImage(e) {
      const index = e.currentTarget.dataset.index;
      const images = this.data.images.filter((_, i) => i !== index);
      this.setData({ images });
    },
  
    // 上传单张图片到服务器
    uploadImage(filePath) {
      const app = getApp();
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: app.globalData.baseUrl + '/upload/image',
          filePath: filePath,
          name: 'file',
          formData: {
            type: 'review'   // 图片类型
            // 不传 restaurantId，后端将存入临时目录
          },
          success: (res) => {
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(res.data);
                if (data.code === 200) {
                  resolve(data.data); // 返回图片URL
                } else {
                  reject(data.msg || '上传失败');
                }
              } catch (e) {
                reject('解析响应失败');
              }
            } else {
              reject('上传失败（状态码：' + res.statusCode + '）');
            }
          },
          fail: reject
        });
      });
    },
  
    // 提交举报
    async submitReport() {
      if (!this.data.selectedReason) {
        wx.showToast({ title: "请选择举报原因", icon: "none" });
        return;
      }
  
      wx.showLoading({ title: "提交中..." });
      this.setData({ uploading: true });
  
      try {
        // 1. 上传所有图片，获取URL列表
        let imageUrls = [];
        if (this.data.images.length > 0) {
          const uploadTasks = this.data.images.map(path => this.uploadImage(path));
          imageUrls = await Promise.all(uploadTasks);
        }
  
        const app = getApp();
        // 2. 提交举报数据
        wx.request({
          url: app.globalData.baseUrl + "/review/report/add",
          method: "POST",
          header: { "content-type": "application/json" },
          data: {
            reviewId: this.data.reviewId,
            reason: this.data.selectedReason,
            detail: this.data.detail,
            images: imageUrls,       // 上传后的URL数组
            reporterId: app.globalData.userInfo.id
          },
          success: res => {
            wx.hideLoading();
            this.setData({ uploading: false });
            if (res.data.code === 200) {
              wx.showToast({ title: "举报成功", icon: "success" });
              setTimeout(() => wx.navigateBack(), 1500);
            } else {
              wx.showToast({ title: res.data.msg || "提交失败", icon: "none" });
            }
          },
          fail: () => {
            wx.hideLoading();
            this.setData({ uploading: false });
            wx.showToast({ title: "网络错误", icon: "none" });
          }
        });
      } catch (error) {
        wx.hideLoading();
        this.setData({ uploading: false });
        wx.showToast({ title: error || "上传失败", icon: "none" });
      }
    }
  });