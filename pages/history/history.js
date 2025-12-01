Page({
    data: {
      historyList: []
    },
  
    onLoad() {
      this.loadHistory();
    },
  
    loadHistory() {
      const app = getApp();
      const userId = app.globalData.userInfo.id;
  
      wx.request({
        url: app.globalData.baseUrl + '/history/list',
        method: 'GET',
        data: { userId },
        success: (res) => {
          if (res.data.code === 200) {
            const list = res.data.data || [];

            // 格式化浏览时间
            list.forEach(item => {
            item.viewedTime = formatRelativeTime(item.viewedTime);
            });

            this.setData({
            historyList: list
            });
          }
        }
      });
    },
  
    goDetail(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    },
    
    onBack() {
        wx.navigateBack();
      }

  });

  function formatRelativeTime(timeString) {
    if (!timeString) return '';
  
    // 兼容所有形式：2025-12-01 00:06:48、2025-12-01T00:06:48 等
    let safe = timeString
        .replace('T', ' ')  // T 转空格
        .replace(/-/g, '/'); // - 改成 /
  
    const time = new Date(safe);
  
    // 解析失败保护
    if (isNaN(time.getTime())) {
      console.warn("时间解析失败：", timeString);
      return timeString; // 返回原始字符串，避免报错
    }
  
    const now = new Date();
    const diff = (now - time) / 1000;
  
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const beforeYesterday = new Date(today);
    beforeYesterday.setDate(today.getDate() - 2);
  
    const ymd = (d) => {
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
  
    const timeYmd = ymd(time);
  
    if (timeYmd === ymd(yesterday)) return '昨天';
    if (timeYmd === ymd(beforeYesterday)) return '前天';
  
    // 同一年 → 显示 MM-DD
    if (time.getFullYear() === now.getFullYear()) {
      return timeYmd.substring(5);
    }
  
    // 不同年份 → YYYY-MM-DD
    return timeYmd;
  }
  