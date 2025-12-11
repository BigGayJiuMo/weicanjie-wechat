// pages/edit-profile/edit-profile.js
import request from "../../utils/request";
Page({
    data: {
        userInfo: null,
        avatarUrl: '',
        nickname: '',
        displayPhone: '',
        showToast: false,
        toastMessage: '',
        toastAnimation: {},
        showNicknameModal: false,
        newNickname: '',
        nicknameInputFocus: false,
        isSavingAvatar: false,
        isSavingNickname: false,
        isOverLength: false, // 是否超出长度限制
        
        // 手机号修改相关
        showPhoneModal: false,
        newPhone: '',
        verifyCode: '',
        generatedCode: '', // 生成的验证码
        countdown: 0, // 倒计时秒数
        countdownTimer: null, // 倒计时计时器
        canGetCode: true, // 是否可以获取验证码
        phoneInputFocus: false,
        isSavingPhone: false,
        canConfirmPhone: false // 是否可以确认修改手机号
    },

    onLoad: function (options) {
        this.loadUserInfo();
    },

    // 加载用户信息
    loadUserInfo: function () {
        const app = getApp();
        const userInfo = app.globalData.userInfo;
        
        if (userInfo) {
            const processedInfo = this.processUserInfo(userInfo);
            this.setData({
                userInfo: processedInfo,
                avatarUrl: processedInfo.avatarUrl || '/images/default-avatar.png',
                nickname: processedInfo.nickname || '微信用户',
                displayPhone: processedInfo.displayPhone || '未绑定手机号'
            });
        } else {
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                success: () => {
                    setTimeout(() => {
                        wx.navigateBack();
                    }, 1500);
                }
            });
        }
    },

    // 处理用户信息，包括手机号脱敏
    processUserInfo: function(userInfo) {
        if (!userInfo) return userInfo;
        
        const processedInfo = {...userInfo};
        
        if (processedInfo.phone) {
            processedInfo.displayPhone = this.maskPhoneNumber(processedInfo.phone);
        } else {
            processedInfo.displayPhone = '未绑定手机号';
        }
        
        return processedInfo;
    },

    // 手机号脱敏处理
    maskPhoneNumber: function(phone) {
        if (phone && phone.length === 11) {
            return phone.substring(0, 3) + '****' + phone.substring(7);
        }
        return phone;
    },

    // 返回上一页
    onBack: function() {
        wx.navigateBack();
    },

    // 选择微信头像
    onChooseAvatar(e) {
        const wechatAvatar = e.detail.avatarUrl;
    
        wx.getImageInfo({
            src: wechatAvatar,
            success: img => {
                wx.uploadFile({
                    url: getApp().globalData.baseUrl + "/upload/image",
                    filePath: img.path,
                    name: "file",
                    formData: {
                        type: "avatar",
                        userId: this.data.userInfo.id   //  必传，否则存 unknown/
                    },
                    success: res => {
                        const result = JSON.parse(res.data);
                        const realUrl = result.data;
    
                        this.setData({
                            avatarUrl: realUrl,
                            isSavingAvatar: true
                        });
    
                        this.saveAvatarToDatabase(realUrl);
                    }
                });
            }
        });
    },

    // 保存头像到数据库
    saveAvatarToDatabase: function (avatarUrl) {
        const app = getApp();
        const userInfo = this.data.userInfo;
    
        if (!userInfo || !userInfo.id) {
            this.showToast('用户信息不完整');
            this.setData({ isSavingAvatar: false });
            return;
        }
    
        request(app.globalData.baseUrl + '/user/updateProfile', {
            method: 'POST',
            data: {
                userId: userInfo.id,
                nickname: userInfo.nickname,
                avatarUrl: avatarUrl
            }
        }).then(res => {
            this.setData({ isSavingAvatar: false });
    
            if (res.code === 200) {
                const updatedUserInfo = res.data;
                wx.setStorageSync('userInfo', updatedUserInfo);
                app.globalData.userInfo = updatedUserInfo;
    
                this.showToast('头像更新成功');
                this.setData({
                    userInfo: updatedUserInfo,
                    avatarUrl: updatedUserInfo.avatarUrl
                });
            } else {
                this.showToast('头像更新失败: ' + (res.message || '未知错误'));
            }
        }).catch(err => {
            this.setData({ isSavingAvatar: false });
            this.showToast('网络错误，请重试');
        });
    },

    // 点击昵称
    onNicknameTap: function() {
        this.setData({
            showNicknameModal: true,
            newNickname: this.data.nickname,
            nicknameInputFocus: true,
            isOverLength: false // 重置超出长度状态
        });
    },

    // 昵称弹窗输入
    onNicknameModalInput: function(e) {
        const value = e.detail.value;
        const length = value.length;
        const isOverLength = length > 9;
        
        // 不截断输入，允许输入到15个字符，但超过9个时显示警告
        this.setData({
            newNickname: value,
            isOverLength: isOverLength
        });
    },

    // 确认修改昵称
    confirmNickname: function() {
        // 如果超出长度，直接返回
        if (this.data.isOverLength) {
            return;
        }
        
        const nickname = this.data.newNickname.trim();
        if (!nickname) {
            this.showToast('昵称不能为空');
            return;
        }
        
        // 检查昵称长度是否超过7个字
        if (nickname.length > 9) {
            this.showToast('昵称不能超过9个字');
            return;
        }
        
        this.setData({
            isSavingNickname: true
        });
        
        // 保存昵称到数据库
        this.saveNicknameToDatabase(nickname);
    },

    // 保存昵称到数据库
    saveNicknameToDatabase: function (nickname) {
        const app = getApp();
        const userInfo = this.data.userInfo;
    
        if (!userInfo || !userInfo.id) {
            this.showToast('用户信息不完整');
            this.setData({
                isSavingNickname: false,
                showNicknameModal: false
            });
            return;
        }
    
        request(app.globalData.baseUrl + '/user/updateProfile', {
            method: 'POST',
            data: {
                userId: userInfo.id,
                nickname: nickname,
                avatarUrl: userInfo.avatarUrl
            }
        }).then(res => {
            this.setData({
                isSavingNickname: false,
                showNicknameModal: false
            });
    
            if (res.code === 200) {
                const updatedUserInfo = res.data;
                wx.setStorageSync('userInfo', updatedUserInfo);
                app.globalData.userInfo = updatedUserInfo;
    
                this.setData({
                    nickname: nickname,
                    userInfo: updatedUserInfo
                });
    
                this.showToast('昵称更新成功');
            } else {
                this.showToast('昵称更新失败: ' + (res.message || '未知错误'));
            }
        }).catch(err => {
            this.setData({
                isSavingNickname: false,
                showNicknameModal: false
            });
            this.showToast('网络错误，请重试');
        });
    },

    // 取消修改昵称
    cancelNickname: function() {
        this.setData({
            showNicknameModal: false,
            nicknameInputFocus: false,
            isOverLength: false // 重置超出长度状态
        });
    },

    // 点击手机号
    onPhoneTap: function() {
        this.setData({
            showPhoneModal: true,
            newPhone: '',
            verifyCode: '',
            phoneInputFocus: true,
            canGetCode: true,
            canConfirmPhone: false
        });
    },

    // 手机号输入
    onPhoneInput: function (e) {
        const value = e.detail.value.replace(/\D/g, ''); // 强制只允许数字
    
        this.setData({
            newPhone: value,
            canGetCode: value.length === 11
        });
    },

    // 验证码输入
    onVerifyCodeInput: function (e) {
        const value = e.detail.value.replace(/\D/g, ''); // 强制只允许数字
    
        this.setData({
            verifyCode: value,
            canConfirmPhone: value.length === 4 && this.data.newPhone.length === 11
        });
    },

    // 获取验证码
    getVerifyCode: function() {
        if (!this.data.canGetCode || this.data.countdown > 0) {
            return;
        }

        // 验证手机号格式
        const phone = this.data.newPhone;
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            this.showToast('请输入正确的手机号');
            return;
        }

        // 生成4位随机验证码
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        console.log('生成的验证码:', code); // 在控制台输出验证码，方便测试
        
        this.setData({
            generatedCode: code,
            canGetCode: false,
            countdown: 60
        });

        // 开始倒计时
        this.startCountdown();
        
        // 模拟发送验证码（实际项目中应该调用短信服务）
        this.showToast('验证码已发送: ' + code);
    },

    // 开始倒计时
    startCountdown: function() {
        const timer = setInterval(() => {
            if (this.data.countdown > 1) {
                this.setData({
                    countdown: this.data.countdown - 1
                });
            } else {
                // 倒计时结束
                clearInterval(timer);
                this.setData({
                    countdown: 0,
                    canGetCode: true
                });
            }
        }, 1000);
        
        this.setData({
            countdownTimer: timer
        });
    },

    // 确认修改手机号
    confirmChangePhone: function() {
        if (!this.data.canConfirmPhone || this.data.isSavingPhone) {
            return;
        }

        const phone = this.data.newPhone.trim();
        const verifyCode = this.data.verifyCode.trim();

        // 验证手机号格式
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            this.showToast('请输入正确的手机号');
            return;
        }

        // 验证验证码
        if (verifyCode !== this.data.generatedCode) {
            this.showToast('验证码错误');
            return;
        }

        this.setData({
            isSavingPhone: true
        });

        // 保存手机号到数据库
        this.savePhoneToDatabase(phone);
    },

    // 保存手机号到数据库
    savePhoneToDatabase: function (phone) {
        const app = getApp();
        const userInfo = this.data.userInfo;
    
        if (!userInfo || !userInfo.id) {
            this.showToast('用户信息不完整');
            this.setData({ isSavingPhone: false });
            return;
        }
    
        request(app.globalData.baseUrl + '/user/bindPhone', {
            method: 'POST',
            data: {
                userId: userInfo.id,
                phone: phone
            }
        }).then(res => {
            this.setData({
                isSavingPhone: false,
                showPhoneModal: false
            });
    
            if (res.code === 200) {
                const updatedUserInfo = { ...userInfo, phone: phone };
                wx.setStorageSync('userInfo', updatedUserInfo);
                app.globalData.userInfo = updatedUserInfo;
    
                const processedInfo = this.processUserInfo(updatedUserInfo);
                this.setData({
                    userInfo: processedInfo,
                    displayPhone: processedInfo.displayPhone
                });
    
                this.showToast('手机号更新成功');
    
                if (this.data.countdownTimer) {
                    clearInterval(this.data.countdownTimer);
                }
            } else {
                this.showToast(res.message || '绑定失败');
            }
        }).catch(err => {
            this.setData({ isSavingPhone: false });
            this.showToast('网络错误，请重试');
        });
    },

    // 取消修改手机号
    cancelChangePhone: function() {
        this.setData({
            showPhoneModal: false,
            phoneInputFocus: false
        });
        
        // 清除倒计时
        if (this.data.countdownTimer) {
            clearInterval(this.data.countdownTimer);
            this.setData({
                countdown: 0,
                canGetCode: true
            });
        }
    },

    // 页面卸载时清除计时器
    onUnload: function() {
        if (this.data.countdownTimer) {
            clearInterval(this.data.countdownTimer);
        }
    },

    onBindWeChat() {
        const app = getApp();
        const userInfo = this.data.userInfo;
        if (!userInfo) return;
    
        // 先弹出确认框
        wx.showModal({
            title: "绑定提示",
            content: "是否将微信账号绑定为当前登录账号？",
            cancelText: "取消",
            confirmText: "确认",
            confirmColor: "#ff6b35",
            success: modalRes => {
                if (!modalRes.confirm) {
                    // 用户点了取消
                    return;
                }
    
                // 用户点击确认 → 执行绑定
                wx.login({
                    success: res => {
                
                        const openid = "mock_openid_" + res.code;
                
                        request(app.globalData.baseUrl + "/user/bindWeChat", {
                            method: "POST",
                            data: {
                                userId: userInfo.id,
                                openid: openid
                            }
                        }).then(res2 => {
                            wx.hideLoading();
                
                            if (res2.code === 200) {
                                userInfo.openid = openid;
                                wx.setStorageSync("userInfo", userInfo);
                                app.globalData.userInfo = userInfo;
                
                                this.setData({ userInfo });
                                this.showToast("微信绑定成功");
                            } else {
                                this.showToast(res2.message || "绑定失败");
                            }
                        }).catch(err => {
                            wx.hideLoading();
                            this.showToast("网络异常，请重试");
                        });
                
                    }
                });
            }
        });
    },    
    // 显示提示
    showToast: function(message) {
        const animation = wx.createAnimation({
            duration: 300,
            timingFunction: 'ease'
        });
        
        this.setData({
            showToast: true,
            toastMessage: message,
            toastAnimation: animation.opacity(1).step().export()
        });
        
        setTimeout(() => {
            animation.opacity(0).step();
            this.setData({
                toastAnimation: animation.export()
            });
            
            setTimeout(() => {
                this.setData({
                    showToast: false
                });
            }, 300);
        }, 2000);
    }
});