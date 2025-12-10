Page({
    data: {
      keyword: "",
      results: [],
      suggestions: [], 
      loading: false,
      historyList: [],
      showResult: false,
      timer: null,
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
  
      this.addHistory(keyword); // 保存历史搜索
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
                    
                    //  前端过滤：过滤掉 status=0 的餐厅
                    list = list.filter(item => item.status != null && item.status !== 0);
                
                    list.forEach(r => {
                        // 评分格式化
                        r.avgRating = (r.avgRating == null || r.avgRating === -1) 
                        ? null 
                        : Number(r.avgRating).toFixed(1);
                        
                        // 打包费格式化
                        if (r.packingFee !== undefined && r.packingFee !== null) {
                            r.packingFee = Number(r.packingFee).toFixed(2);
                        }
                
                        //  营业状态处理 - 添加手动状态逻辑
                        if (r.status === 0) {
                            // 已停业（最高优先级）
                            r.statusText = "已停业";
                            r.statusClass = "status-closed";
                            r.businessStatus = 0;
                        } else if (r.manualBusinessStatus != null && r.manualBusinessStatus !== 0) {
                            // 手动设置状态（第二优先级）
                            if (r.manualBusinessStatus === 1) {
                                r.statusText = "营业中）";
                                r.statusClass = "status-open";
                                r.businessStatus = 1;
                            } else if (r.manualBusinessStatus === 2) {
                                r.statusText = "休息中";
                                r.statusClass = "status-break";
                                r.businessStatus = 3; // 注意：手动未营业对应的是 3
                            }
                        } else if (r.businessStatusText && r.businessStatusClass) {
                            // 后台已计算好的自动状态
                            r.statusText = r.businessStatusText;
                            r.statusClass = r.businessStatusClass;
                        } else {
                            // 后台没有返回文本，则按 businessStatus 数字推断
                            switch (r.businessStatus) {
                                case 1: 
                                    r.statusText = "营业中"; 
                                    r.statusClass = "status-open"; 
                                    break;
                                case 2: 
                                    r.statusText = "休息中"; 
                                    r.statusClass = "status-break"; 
                                    break;
                                case 3:
                                    r.statusText = "已打烊";
                                    r.statusClass = "status-closed";
                                    break;
                                default: 
                                    r.statusText = "未知状态"; 
                                    r.statusClass = "status-closed";
                            }
                        }
                    });
                    
                    // 排序：营业中的在前，按营业状态排序
                    list.sort((a, b) => {
                        const order = { 1: 1, 2: 2, 3: 3, 0: 4 };
                        return (order[a.businessStatus] || 4) - (order[b.businessStatus] || 4);
                    });
                    
                    this.setData({ 
                        results: list,
                        showResult: true
                    });
                } else {
                    this.setData({ 
                        results: [],
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