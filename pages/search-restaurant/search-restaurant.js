Page({
    data: {
      keyword: "",
      results: [],
      suggestions: [], 
      loading: false,
      historyList: [],
      showResult: false,
      timer: null ,
      isFocus: false
    },
  
    onLoad() {
      this.loadHistory();
    },
  
    /**  输入框 */
    onInput(e) {
        const keyword = e.detail.value.trim();
        this.setData({ keyword });
      
        if (this.data.timer) clearTimeout(this.data.timer);
      
        // 空输入时清空建议
        if (!keyword) {
          this.setData({ suggestions: [] });
          return;
        }
      
        // ⭐ 300ms 防抖
        this.data.timer = setTimeout(() => {
          this.loadSuggestions(keyword);
        }, 300);
      },
        //  实时联想
      loadSuggestions(keyword) {
        const app = getApp();
      
        wx.request({
          url: `${app.globalData.baseUrl}/restaurant/suggest`,
          method: "GET",
          data: { keyword },
          success: res => {
            if (res.data.code === 200) {
              this.setData({
                suggestions: res.data.data   // [{id, name}]
              });
            }
          }
        });
      },

      onFocus() {
        this.setData({
          isFocus: true,
          showResult: false   // 聚焦时，不展示结果区域
        });
      },
      
      onBlur() {
        // 延迟一下，避免刚点击历史记录时被立刻隐藏
        setTimeout(() => {
          this.setData({ isFocus: false });
        }, 150);
      },
      onSuggestTap(e) {
        const name = e.currentTarget.dataset.name;
      
        this.setData({
          keyword: name,
          suggestions: []   // 点击后隐藏联想
        });
      
        this.onSearch();    // 直接执行搜索
      },
    /**  执行搜索 */
    onSearch() {
      const keyword = this.data.keyword.trim();
      if (!keyword) return;
  
      this.addHistory(keyword); // ⭐ 保存历史搜索
      this.searchRestaurant(keyword);
    },
  
    /** 搜索请求 */
    searchRestaurant(keyword) {
      this.setData({ loading: true });
  
      const app = getApp();
      wx.request({
        url: `${app.globalData.baseUrl}/restaurant/search`,
        method: "GET",
        data: { keyword },
        success: res => {
            if (res.data.code === 200) {
              let list = res.data.data;
          
              list.forEach(r => {
                r.avgRating = (r.avgRating == null || r.avgRating === -1) 
                  ? null 
                  : Number(r.avgRating).toFixed(1);
          
                switch (r.businessStatus) {
                  case 1: r.statusText = "营业中"; r.statusClass = "status-open"; break;
                  case 2: r.statusText = "休息中"; r.statusClass = "status-break"; break;
                  default: r.statusText = "已打烊"; r.statusClass = "status-closed";
                }
              });
          
              this.setData({ 
                results: list,
                showResult: true
              });
            }
          },
        complete: () => this.setData({ loading: false })
      });
    },
  
    /** 加载历史记录 */
    loadHistory() {
      const list = wx.getStorageSync("search_history") || [];
      this.setData({ historyList: list });
    },
  
    /** 历史：保存搜索记录 */
    addHistory(keyword) {
      let list = wx.getStorageSync("search_history") || [];
  
      // 删除已有的同名记录（去重）
      list = list.filter(item => item !== keyword);
  
      // 最新的放最前
      list.unshift(keyword);
  
      // 限制最多保存10条
      if (list.length > 10) {
        list = list.slice(0, 10);
      }
  
      wx.setStorageSync("search_history", list);
      this.setData({ historyList: list });
    },
  
    /** 点击历史记录 */
    onHistoryTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.setData({ keyword });
      this.searchRestaurant(keyword);
    },
  
    /**  历史：删除单条 */
    deleteHistory(e) {
      const keyword = e.currentTarget.dataset.keyword;
      let list = wx.getStorageSync("search_history") || [];
  
      list = list.filter(item => item !== keyword);
  
      wx.setStorageSync("search_history", list);
      this.setData({ historyList: list });
    },
  
    /** 历史：清空所有 */
     clearHistory() {
        wx.showModal({
          title: "提示",
          content: "确定要清空历史搜索记录吗？",
          cancelText: "取消",
          confirmText: "清空",
          confirmColor: '#ff6b35',
          success: res => {
            if (res.confirm) {
              wx.removeStorageSync("search_history");
              this.setData({ historyList: [] });
      
              wx.showToast({
                title: "已清空",
                icon: "success"
              });
            }
          }
        });
      },
      onHistoryLongPress(e) {
        const keyword = e.currentTarget.dataset.keyword;
      
        wx.showModal({
          title: "删除记录",
          content: `是否删除历史记录「${keyword}」？`,
          cancelText: "取消",
          confirmText: "删除",
          confirmColor: '#ff6b35',
          success: res => {
            if (res.confirm) {
              let list = wx.getStorageSync("search_history") || [];
      
              // 删除该条记录
              list = list.filter(item => item !== keyword);
      
              wx.setStorageSync("search_history", list);
              this.setData({ historyList: list });
      
              wx.showToast({
                title: "已删除",
                icon: "success"
              });
            }
          }
        });
      },
  
    /** 返回 */
    onBack() {
      wx.navigateBack();
    },
  
    /** 跳转详情 */
    goDetail(e) {
      wx.navigateTo({
        url: `/pages/restaurant-detail/restaurant-detail?id=${e.currentTarget.dataset.id}`
      });
    }
  });
  