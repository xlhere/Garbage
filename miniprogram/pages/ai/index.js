Page({
  data: {
    SHOW_TOP: true,
    img: [
      '/images/slider-2.jpg',
      '/images/slider-1.jpg',
      '/images/slider-3.jpg'
    ],
    imageWidth: wx.getSystemInfoSync().windowWidth,//图片宽度   
    indicatordots:true,
    // autoplay:true,
    //是否自动切换
    interval: 2000,
    //自动切换时间间隔
    duration: 1000,
    //滑动动画时长
    // color:'#ffffff',
    //当前选中的指示点颜色
    height:''
    //swiper高度
  },
  goheight:function (e) {
    var width = wx.getSystemInfoSync().windowWidth
    //获取可使用窗口宽度
    var imgheight = e.detail.height
    //获取图片实际高度
    var imgwidth = e.detail.width
    //获取图片实际宽度
    var height = (width * imgheight / imgwidth - 60) +"px"
    //计算等比swiper高度
    this.setData({
      height: height
    })
    console.log(height,imgheight)
  },
  onLoad: function(options) {
    var myDate = new Date();
    var isShowed=wx.getStorageSync("tip")
    if(isShowed!=1){
      setTimeout(() => {
        this.setData({
          SHOW_TOP: false
        })
        wx.setStorageSync("tip", 1)
      }, 2 * 1000)
    }else{
      this.setData({
        SHOW_TOP: false
      })
    }
  },

  goSearch: function() {
    wx.navigateTo({
      url: 'search',
    })
  },
  onBindCamera: function() {
    wx.navigateTo({
      url: 'camera/camera',
    })
  },
  getPhoto() {
    let that = this
    wx.chooseImage({
      count: 1, // 默认9
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album'], // 可以指定来源是相册还是相机，默认二者都有
      success: function (res) {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        var tempFilePaths = res.tempFilePaths[0]
        wx.setStorageSync('imagePath', tempFilePaths)
        wx.navigateTo({
          url: 'photo/photo?imagePath='+tempFilePaths,
        })
      }
    })
  },
  onAikefu: function() {
    wx.navigateTo({
      url: '/pages/android/qa',
    })
  },
  onShareAppMessage: function() {
    return {
      title: "智能分类垃圾",
      imageUrl: "https://6c61-laji-bopv4-1259505195.tcb.qcloud.la/laji.png?sign=7c8d38e435eb3104fcf5933ebff667f5&t=1561904613",
      path: "pages/ai/index"
    }
  }
})