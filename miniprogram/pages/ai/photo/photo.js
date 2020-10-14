var md5 = require('../../../utils/md5.js')
var http = require('../../../utils/http.js')
var util = require('../../../utils/util.js')
const app = getApp();
Page({
  data: {
    accessToken: "",
    isShow: false,
    results: [],
    imagePath: "",
    btnTxt: "使用",
    cWidth: 0,
    cHeight: 0,
    isCroper:false,
    imgWidth:0,
    imgHeight:0,
    imgTop:0,
    imgLeft:0,
    isCroper:false,
    // 裁剪框 宽高
    cutW: 0,
    cutH: 0,
    cutL: 0,
    cutT: 0,
    tempCanvasWidth:0,
    tempCanvasHeight:0
  },
  onLoad() {
    this.ctx = wx.createCameraContext()
    var time = wx.getStorageSync("time")
    var curTime = new Date().getTime()
    var timeInt = parseInt(time)
    var timeNum = parseInt((curTime - timeInt) / (1000 * 60 * 60 * 24))
    var accessToken = wx.getStorageSync("access_token")
    this.device = app.globalData.myDevice
    this.deviceRatio = this.device.windowWidth / 750
    this.imgViewHeight = this.device.windowHeight - 160 * this.deviceRatio
    this.setData({
      imagePath: wx.getStorageSync('imagePath')
    })
    loadImgOnImage(this)
    if (timeNum > 28 || (accessToken == "" ||
        accessToken == null || accessToken == undefined)) {
      this.accessTokenFunc()
    } else {
      this.setData({
        accessToken: wx.getStorageSync("access_token"),
        // imagePath: option.imagePath
        // imagePath: wx.getStorageSync('imagePath')
      })
    }
  },
  takePhoto() {
    let that = this
    wx.getImageInfo({
      src: that.data.imagePath,
      success: function (res) {
        that.cutImg(res)
      }
    })
  },
  cutImg: function(res) {
    var that = this
    var ratio = 3;
    var canvasWidth = res.width //图片原始长宽
    var canvasHeight = res.height
    while (canvasWidth > 100 || canvasHeight > 100) { // 保证宽高在400以内
      canvasWidth = Math.trunc(res.width / ratio)
      canvasHeight = Math.trunc(res.height / ratio)
      ratio++;
    }
    that.setData({
      cWidth: canvasWidth,
      cHeight: canvasHeight
    })
    //----------绘制图形并取出图片路径--------------
    var ctx = wx.createCanvasContext('canvas')
    ctx.drawImage(res.path, 0, 0, canvasWidth, canvasHeight)
    ctx.draw(false, setTimeout(function() {
      wx.canvasToTempFilePath({
        canvasId: 'canvas',
        fileType:'png',
        destWidth: canvasWidth,
        destHeight: canvasHeight,
        success: function(res) {
          console.log(res.tempFilePath) //最终图片路径

          wx.getFileSystemManager().readFile({
            filePath: res.tempFilePath,
            encoding: "base64",
            success: res => {
              that.onCheckImg( res.data)
            },
            fail: res => {
              wx.hideLoading()
              wx.showToast({
                title: '拍照失败,未获取相机权限或其他原因',
                icon: "none"
              })
            }
          })
        },
        fail: function(res) {
          wx.hideLoading()
          console.log(res.errMsg)
        }
      })
    }, 100))
  },
  // 默认图片不能超过1m
  onCheckImg: function(buffer) {
    var that = this
    wx.cloud.callFunction({
      name: "checkImg",
      data: {
        type: 'image/png',
        buffer: buffer
      },
      success: res => {
        console.log("=onCheckImg=success===" + JSON.stringify(res))
        if (res.result.errCode == 0) {
          that.req(that.data.accessToken, buffer)
        } else if (res.result.errCode == 87014) {
          wx.hideLoading()
          wx.showToast({
            icon: 'none',
            title: '内容含有违法违规内容',
          })
        } else {
          wx.hideLoading()
        }
      },
      fail: err => {
        wx.hideLoading()
        console.log("=onCheckImg=err===" + JSON.stringify(err))
        // return cb(err)
      },
    })
  },
  req: function(token, image) {
    var that = this
    http.req("https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=" + token, {
      "image": image
    }, function(res) {
      wx.hideLoading()
      console.log(JSON.stringify(res))
      var code = res.data.err_code
      if (code == 111 || code == 100 || code == 110) {
        wx.clearStorageSync("access_token")
        wx.clearStorageSync("time")
        that.accessTokenFunc()
        return
      }
      var num = res.result_num
      var results = res.data.result
      if (results != undefined && results != null) {
        that.setData({
          isShow: true,
          results: results
        })
        console.log(results)
      } else {
        wx.clearStorageSync("access_token")
        wx.showToast({
          icon: 'none',
          title: 'AI识别失败,请重新尝试',
        })
      }
    }, "POST")
  },
  accessTokenFunc: function() {
    var that = this
    console.log("accessTokenFunc is start")
    wx.cloud.callFunction({
      name: 'baiduAccessToken',
      success: res => {
        console.log("==baiduAccessToken==" + JSON.stringify(res))
        that.data.accessToken = res.result.data.access_token
        wx.setStorageSync("access_token", res.result.data.access_token)
        wx.setStorageSync("time", new Date().getTime())
      },
      fail: err => {
        wx.clearStorageSync("access_token")
        wx.showToast({
          icon: 'none',
          title: '调用失败,请重新尝试',
        })
        console.error('[云函数] [sum] 调用失败：', err)
      }
    })
  },
  radioChange: function(e) {
    console.log(e)
    console.log(e.detail)
    console.log(e.detail.value)
    wx.navigateTo({
      url: '/pages/result/list?keyword=' + e.detail.value,
    })
  },
  hideModal: function() {
    this.setData({
      isShow: false,
    })
  },
  stopRecord() {
    this.ctx.stopRecord({
      success: (res) => {
        this.setData({
          src: res.tempThumbPath,
          videoSrc: res.tempVideoPath
        })
      }
    })
  },
  error(e) {
    console.log(e.detail)
  },
  openCroper(){
    var minCutL = Math.max(0, this.data.imgLeft)
    var minCutT = Math.max(0, this.data.imgTop)
    this.setData({
      isCroper:true,
      cutW: 150,
      cutH: 100,
      cutL: minCutL,
      cutT: minCutT
    })
  },
  croperStart(e){
    this.croperX = e.touches[0].clientX
    this.croperY = e.touches[0].clientY
  },
  croperMove(e){
    var self = this
    var dragLengthX = (e.touches[0].clientX-self.croperX)
    var dragLengthY = (e.touches[0].clientY-self.croperY)
    var minCutL = Math.max(0,self.data.imgLeft)
    var minCutT = Math.max(0, self.data.imgTop)
    var maxCutL = Math.min(750 * self.deviceRatio - self.data.cutW, self.data.imgLeft + self.data.imgWidth - self.data.cutW)
    var maxCutT = Math.min(self.imgViewHeight - self.data.cutH, self.data.imgTop + self.data.imgHeight - self.data.cutH)
    var newCutL = self.data.cutL + dragLengthX
    var newCutT = self.data.cutT + dragLengthY
    if (newCutL < minCutL) newCutL = minCutL
    if (newCutL > maxCutL) newCutL = maxCutL
    if (newCutT < minCutT) newCutT = minCutT
    if (newCutT > maxCutT) newCutT = maxCutT
    this.setData({
      cutL: newCutL,
      cutT: newCutT,
    })
    self.croperX = e.touches[0].clientX
    self.croperY = e.touches[0].clientY
  },
  dragPointStart(e){
    var self = this
    self.dragStartX = e.touches[0].clientX
    self.dragStartY = e.touches[0].clientY
    self.initDragCutW = self.data.cutW
    self.initDragCutH = self.data.cutH
  },
  dragPointMove(e){
    var self = this
    var maxDragX = Math.min(750 * self.deviceRatio, self.data.imgLeft + self.data.imgWidth)
    var maxDragY = Math.min(self.imgViewHeight, self.data.imgTop + self.data.imgHeight)
    var dragMoveX = Math.min(e.touches[0].clientX , maxDragX),
      dragMoveY = Math.min(e.touches[0].clientY, maxDragY);
    var dragLengthX = dragMoveX - self.dragStartX
    var dragLengthY = dragMoveY - self.dragStartY
    if (dragLengthX + self.initDragCutW >= 0 && dragLengthY + self.initDragCutH>=0){
      self.setData({
        cutW: self.initDragCutW + dragLengthX,
        cutH: self.initDragCutH + dragLengthY
      })
    } else {
      return
    }
  },
  competeCrop(){
    var self=this
    wx.showLoading({
      title: '截取中',
      mask: true,
    })
    //图片截取大小
    var sX = (self.data.cutL - self.data.imgLeft) * self.initRatio / self.oldScale
    var sY = (self.data.cutT - self.data.imgTop) * self.initRatio / self.oldScale
    var sW = self.data.cutW * self.initRatio /self.oldScale
    var sH = self.data.cutH * self.initRatio / self.oldScale
    self.setData({
      isCroper: false,
      tempCanvasWidth: sW,
      tempCanvasHeight: sH
    })
    //真机疑似bug解决方法
    if (sW < self.scaleWidth * self.initRatio/ self.oldScale / 2) {
      sW *= 2
      sH *= 2
    }
    var ctx = wx.createCanvasContext('tempCanvas')
    ctx.drawImage(self.data.imagePath, sX, sY, sW, sH, 0, 0, sW, sH)
    ctx.draw()
    //保存图片到临时路径
    saveImgUseTempCanvas(self, 100, loadImgOnImage)
  },
  cancelCrop(){
    this.setData({
      isCroper: false
    })
  },
})
function loadImgOnImage(self){
  wx.getImageInfo({
    src: self.data.imagePath,
    success: function (res) {
      self.oldScale = 1
      self.initRatio = res.height / self.imgViewHeight  //转换为了px 图片原始大小/显示大小
      if (self.initRatio < res.width / (750 * self.deviceRatio)) {
        self.initRatio = res.width / (750 * self.deviceRatio)
      }
      //图片显示大小
      self.scaleWidth = (res.width / self.initRatio)
      self.scaleHeight = (res.height / self.initRatio)

      self.initScaleWidth = self.scaleWidth
      self.initScaleHeight = self.scaleHeight
      self.startX = 750 * self.deviceRatio / 2 - self.scaleWidth / 2;
      self.startY = self.imgViewHeight / 2 - self.scaleHeight / 2;
      self.setData({
        imgWidth: self.scaleWidth,
        imgHeight: self.scaleHeight,
        imgTop: self.startY,
        imgLeft: self.startX
      })
      wx.hideLoading();
    }
  })
}
function saveImgUseTempCanvas(self, delay, fn){
  setTimeout(function () {
    wx.canvasToTempFilePath({
      x:0,
      y:0,
      width: self.data.tempCanvasWidth,
      height: self.data.tempCanvasHeight,
      destWidth: self.data.tempCanvasWidth,
      destHeight: self.data.tempCanvasHeight,
      fileType: 'png',
      quality: 1,
      canvasId: 'tempCanvas',
      success: function (res) {
        wx.hideLoading();
        self.setData({
          imagePath: res.tempFilePath
        })
        if(fn){
          fn(self) 
        }
      },
      fail:function(res){
        console.log(1,res)
      }
    })
  }, delay)
}