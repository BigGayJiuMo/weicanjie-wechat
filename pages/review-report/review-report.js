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
    images: []
  },

  onLoad(options) {
    console.log("收到 reviewId:", options.reviewId);
    this.setData({
      reviewId: Number(options.reviewId)
    });
  },

  onBack() {
    wx.navigateBack();
  },

  onSelectReason(e) {
    this.setData({
      selectedReason: e.detail.value
    });
  },

  onInputDetail(e) {
    this.setData({
      detail: e.detail.value
    });
  },

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

  submitReport() {
    if (!this.data.selectedReason) {
      wx.showToast({ title: "请选择举报原因", icon: "none" });
      return;
    }

    const app = getApp();
    wx.request({
        url: app.globalData.baseUrl + "/review/report/add",
        method: "POST",
        header: {
          "content-type": "application/json"
        },
        data: {
          reviewId: Number(this.data.reviewId),
          reason: this.data.selectedReason,
          detail: this.data.detail,
          images: this.data.images,
          reporterId: app.globalData.userInfo.id
        },
        success: res => {
          if (res.data.code === 200) {
            wx.showToast({ title: "举报成功", icon: "success" });
            setTimeout(() => wx.navigateBack(), 1500);
          } else {
            wx.showToast({ title: res.data.msg || "提交失败", icon: "none" });
          }
        }
      });
  }
});
