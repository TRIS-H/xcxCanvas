/* global Component wx */
function _getDomInfo (selector) {
  return new Promise((resolve, reject) => {
    wx.createSelectorQuery().select(selector).boundingClientRect(function(res){
      resolve(res)
    }).exec()
  })
}

function _promise (success) {
  return new Promise((resolve) => resolve(success))
}

Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    painting: {
      type: Object,
      value: {view: []},
      observer (newVal, oldVal) {
        if (!this.data.isPainting) {
          if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
            if (newVal) {
              this.getAllDomInfo()
            }
          } else {
            if (newVal && newVal.mode !== 'same') {
              this.triggerEvent('getImage', {errMsg: 'xcxCanvas:samme params'})
            }
          }
        }
      }
    },
    //是否有保存按钮
    hasSaveButton: {
      type: Boolean,
      value: true,
    },
    //保存按钮的样式
    buttonStyle: {
      type: Object,
      value: {},
    },
    contentStyle: {
      type: Object,
      value: {},
    },
    //提示框标题的样式
    promptStyle: {
      type: Object,
      value: {},
    },
    //提示框确定按钮的样式
    confirmStyle: {
      type: Object,
      value: {},
    },
  },
  data: {
    showCanvas: false,
    width: 100,
    height: 100,

    tempFileList: [],
    isPainting: false
  },
  ctx: null,
  cache: {},
  ready () {
    wx.showLoading({
      title: '生成海报中',
      mask: true
    })
    let that = this;
    wx.getSetting({
      success (res) {
        let obj = res.authSetting;

        that.isRefused = (Object.keys(obj).length > 0 && obj['scope.writePhotosAlbum'] == false) ? true : false;
        that.setData({
          isRefused: that.isRefused
        })
      }
    });

    wx.removeStorageSync('xcxCanvas_pic_cache')
    this.cache = wx.getStorageSync('xcxCanvas_pic_cache') || {}
    this.ctx = wx.createCanvasContext('xcxCanvas', this)
    this.parent = getCurrentPages()[getCurrentPages().length-1];
    this.canDraw = false;
    let system = wx.getSystemInfoSync().system;
    this.isIOS = !!(/ios/i.test(system));

    wx.getSetting({
      success (res) {
        let obj = res.authSetting;
        that.isRefused = (Object.keys(obj).length > 0 && obj['scope.writePhotosAlbum'] == false) ? true : false;
        that.canSave = (Object.keys(obj).length > 0 && obj['scope.writePhotosAlbum'] == true) ? true : false;
        console.log('保存图片的权限是否被禁止 :', that.isRefused);
        console.log('是否开启保存图片权限 :', that.canSave);
        that.setData({
          isRefused: that.isRefused,
          canSave: that.canSave
        })
      }
    })
  },
  methods: {
    tomMatchType (item) {
      switch(item.type) {
        case 'text':
          return _promise(this.getText(item))
        case 'rect':
          return _promise(this.getRect(item))
        case 'image':
          return _promise(this.getImage(item))
        case 'avatar':
          return _promise(this.getAvatar(item))
        case 'lineDashRect':
          return _promise(this.getLineDashRect(item))
        default:
          return undefined
      }
    },

    getAllDomInfo () {
      this.setData({
        showCanvas: true,
        isPainting: true
      })
      let {
        fontSize = null,
        lineHeight = null,
        views,
        getTextHeight = false,
      } = this.data.painting;
      !getTextHeight && (this.canDraw = true);

      this.fontSize = fontSize;
      this.lineHeight = lineHeight;
      console.log('fontSize--- :', fontSize);

      if (!this.canDraw) {
        //注意：有换行文本,需要获取文本高度
        this.textList = views.filter(item => item.type == 'text' && item.getTextHeight);   //需要换行的数组
        views = [ views[0], ...this.textList ];
        this.textCount = this.textList.length;  //需要换行的文本个数
        this.textHeightObj = {};                //已获取的需要换行的文本高度的对象
      }
      if (!getTextHeight) {
        //没有要换行的文本，必须延迟，否则图片信息获取会出错
        this._time = setTimeout(() => {
          this.getInfo(views)
        }, 1000);
      } else {
        this.getInfo(views)
      }
    },

    getInfo (views) {
      let {
        fontSize = 13,
        lineHeight = 23,
        getTextHeight = false,
      } = this.data.painting;
      Promise.all(
        views.map(item => this.tomMatchType(item))
      )
      .then((list) => {
        !this.canDraw && (this.textList = list.slice(1))
        console.log('list :', list);
        this.painting = {
          width: list[0].width,
          height: list[0].height,
          fontSize,
          lineHeight,
          getTextHeight,
          views: list,
        };
        this.readyPigment()
      })
    },

    readyPigment () {
      const { 
        views,
      } = this.painting;
      var { width, height } = views[0];
      this.setData({
        width,
        height
      })

      const inter = setInterval(() => {
        if (this.ctx) {
          clearInterval(inter)
          this.ctx.clearActions()
          this.ctx.save()
          this.canDraw ? this.getImagesInfo(views) : this.startGetHeight()
        }
      }, 100)
    },

    async getImagesInfo (views) {
        const imageList = []
        for (let i = 0; i < views.length; i++) {
          let item = views[i]
          if (item.type === 'image' || item.type === 'avatar') {
            imageList.push(this.getImageInfo(views[i].url))
          }
        }
  
        const loadTask = []
        for (let i = 0; i < Math.ceil(imageList.length / 8); i++) {
          loadTask.push(new Promise((resolve, reject) => {
            Promise.all(imageList.splice(i * 8, 8)).then(res => {
              resolve(res)
            }).catch(res => {
              reject(res)
            })
          }))
        }
        Promise.all(loadTask).then(res => {
          let tempFileList = []
          for (let i = 0; i < res.length; i++) {
            tempFileList = tempFileList.concat(res[i])
          }
          this.setData({
            tempFileList
          }, () => {
            this.startPainting()
          })
        })
    },
    startGetHeight () {
      if (!this.ctx.measureText) {
        wx.showModal({
          title: '提示',
          content: '当前微信版本过低，无法使用 measureText 功能，请升级到最新微信版本后重试。'
        })
        this.triggerEvent('getImage', {errMsg: 'xcxCanvas:version too low'})
        return
      }
      
      for (let i in this.textList) {
        let item = this.textList[i];
        this.drawText({ ...item });
      }
    },


    startPainting () {
      let { tempFileList } = this.data;
      let { views } = this.painting;
      for (let i = 0, imageIndex = 0; i < views.length; i++) {
        if (views[i].type === 'image') {
          this.drawImage({
            ...views[i],
            url: tempFileList[imageIndex]
          })
          imageIndex++
        } else if (views[i].type === 'avatar') {
          this.drawCircleAvatar({
            ...views[i],
            url: tempFileList[imageIndex]
          })
          imageIndex++
        } else if (views[i].type === 'text') {
          if (!this.ctx.measureText) {
            wx.showModal({
              title: '提示',
              content: '当前微信版本过低，无法使用 measureText 功能，请升级到最新微信版本后重试。'
            })
            this.triggerEvent('getImage', {errMsg: 'xcxCanvas:version too low'})
            return
          } else {
            this.drawText({ ...views[i] })
          }
        } else if (views[i].type === 'rect') {
          this.drawRect(views[i])
        } else if (views[i].type === 'lineDashRect') {
          this.drawLineDashRect(views[i])
        }
      }

      if (this.canDraw) {
        this.ctx.draw(false, () => {
          wx.setStorageSync('xcxCanvas_pic_cache', this.cache)
          if (this.isIOS) {
            this.saveImageToLocal()
          } else {
            // 延迟保存图片，解决安卓生成图片错位bug。
            setTimeout(() => {
              this.saveImageToLocal()
            }, 800)
          }
        })
      }
    },
    drawImage (params) {
      this.ctx.save()
      const { url, top = 0, left = 0, width = 0, height = 0, borderRadius = 0, deg = 0 } = params
      if (borderRadius) {
        this.ctx.beginPath()
        this.ctx.arc(left + borderRadius, top + borderRadius, borderRadius, 1 * Math.PI, 1.5 * Math.PI);
        this.ctx.lineTo(left + width - borderRadius, top);
        this.ctx.arc(left + width - borderRadius, top + borderRadius, borderRadius, 1.5 * Math.PI, 2 * Math.PI);
        this.ctx.lineTo(left + width, top + height - borderRadius);
        this.ctx.arc(left + width - borderRadius, top + height - borderRadius, borderRadius, 0 * Math.PI, 0.5 * Math.PI);
        this.ctx.lineTo(left + borderRadius, top + height);
        this.ctx.arc(left + borderRadius, top + height - borderRadius, borderRadius, 0.5 * Math.PI, 1 * Math.PI);
        this.ctx.lineTo(left, top + borderRadius);
        this.ctx.clip()
        this.ctx.drawImage(url, left, top, width, height)
      } else {
      if (deg !== 0) {
        this.ctx.translate(left + width/2, top + height/2)
        this.ctx.rotate(deg * Math.PI / 180)
        this.ctx.drawImage(url, -width/2, -height/2, width, height)
      } else {
        this.ctx.drawImage(url, left, top, width, height)
      }
      }
      this.ctx.restore()
    },

    drawCircleAvatar (params) {
      this.ctx.save()
      const { url, top = 0, left = 0, width = 0, height = 0, borderColor = 'transparent', borderSpacing = 0, borderSpacingColor = 'transparent', } = params
      if (borderColor != 'transparent' || borderSpacingColor != 'transparent') {
        this.ctx.beginPath();
        this.ctx.arc(width / 2 + left, top + width / 2, width / 2 + borderSpacing, 0, 2*Math.PI)
        this.ctx.setFillStyle(borderSpacingColor);
        this.ctx.fill();
        this.ctx.setStrokeStyle(borderColor);
        this.ctx.stroke();
      }
      this.ctx.beginPath()
      this.ctx.arc(width / 2 + left, top + width / 2, width / 2, 0, 2*Math.PI)
      this.ctx.clip()
      if (width > height) {
        this.ctx.drawImage(url, left-(width-height)*width/2/height, top, width*width/height, width) //调整后要展示的图片新尺寸的‘左坐标、上坐标、宽、高’
      } else {
        this.ctx.drawImage(url, left, top-(height-width)/2, width, height)
      }
      this.ctx.restore();
    },

    drawText (params) {
      this.ctx.save()
      var {
        MaxLineNumber = 9999,
        breakWord = false,
        color = 'black',
        content = '',
        fontSize = this.fontSize,
        top = 0,
        left = 0,
        lineHeight = this.lineHeight,
        textAlign = 'left',
        width,
        bolder = false,
        textDecoration = 'none',
        backgroundColor = 'transparent',
        className,
        paddingLeft = 0,
        paddingRight = 0,
        paddingTop = 0,
        paddingBottom = 0,
        height,
      } = params
      if (backgroundColor && backgroundColor !== 'transparent' && this.canDraw) {
        // console.log('画背景色');
        this.ctx.setFillStyle(backgroundColor);
        this.ctx.fillRect(left, top, width, height);
      }
      top += paddingTop;
      left += paddingLeft;
      width = width - paddingLeft - paddingRight;
      lineHeight = lineHeight ? lineHeight : (this.lineHeight || 23);
      fontSize = fontSize ? fontSize : (this.fontSize || 13);
      !this.canDraw && console.log('MaxLineNumber :', MaxLineNumber);

      this.ctx.beginPath()
      this.ctx.setTextBaseline('top')
      if (bolder) {
        this.ctx.font = `normal bold ${fontSize}px sans-serif`;
      } else {
        this.ctx.setFontSize(fontSize);
      }
      this.ctx.setTextAlign(textAlign);
      this.ctx.setFillStyle(color);
      // if (!breakWord) {
      //   this.ctx.fillText(content, left, top);
      //   this.drawTextLine(left, top, textDecoration, color, fontSize, content);
      // } else {
        let fillText = '';
        let fillTop = top + (lineHeight - fontSize)/2;
        let lineNum = 1;

        !this.canDraw && console.log('width :', width);
        let actualWidth = this.isIOS ? width: Math.ceil(375 * width / this.data.width);
        !this.canDraw && console.log('actualWidth :', actualWidth);
        for (let i = 0; i < content.length; i++) {
          let nextText = fillText + [content[i]];
          let nextWidth = this.ctx.measureText(nextText).width;
          let nowWidth = this.ctx.measureText(fillText).width;
          if (nextWidth > (actualWidth) || content.charCodeAt(i) === 10) {
            !this.canDraw && console.log('nextWidth:', nextWidth, 'nowWidth:', nowWidth);
            if (lineNum === MaxLineNumber) {
                let omitText = fillText + '...';
                let omitWidth = this.ctx.measureText(omitText).width;
                let oneOmitText = fillText.substring(0, fillText.length - 1) + '...';
                let oneOmitWidth = this.ctx.measureText(oneOmitText).width;
                let twoOmitText = fillText.substring(0, fillText.length - 2) + '...';
                let twoOmitWidth = this.ctx.measureText(twoOmitText).width;
                let threeOmitText = fillText.substring(0, fillText.length - 3) + '...';
                let threeOmitWidth = this.ctx.measureText(threeOmitText).width;
                let fourOmitText = fillText.substring(0, fillText.length - 4) + '...';
                fillText =
                omitWidth < actualWidth ? omitText : (
                  oneOmitWidth < actualWidth ? oneOmitText : (
                    twoOmitWidth < actualWidth ? twoOmitText : (
                      threeOmitWidth < actualWidth ? threeOmitText : fourOmitText
                    )
                  )
                )
                this.ctx.fillText(fillText, left, fillTop)
                this.drawTextLine(left, fillTop, textDecoration, color, fontSize, fillText)
                fillText = ''
                break
            }
            if (this.canDraw) {
              //正式画图
              this.ctx.fillText(fillText, left, fillTop);
              this.drawTextLine(left, fillTop, textDecoration, color, fontSize, fillText);
            }
            if (nextWidth > (actualWidth) && content.charCodeAt(i) === 10) {
              //ios实测一例，content.charCodeAt(i) === 10时不占宽度，即不存在此情况，安卓未知
              console.log('换行+超出宽度')
            }
            fillText = (content.charCodeAt(i) === 10)? '': content[i];
            if (!(
              (i == content.length - 1) && (fillText == '' || content.charCodeAt(i) === 32)
              )) {
              //如果是最后一个字符且是(换行/空格)字符，则忽略
              fillTop += lineHeight
              lineNum++
            } else {
              console.log(fillText == ''? '最后一个字符是换行字符': '最后一个字符是空格字符');
            }
          } else {
            fillText += [content[i]]
          }
        }
        if (!this.canDraw) {
          //返回文本高度
          let textClass = className[0] == '.' ? (className.slice(1)): className;
          this.textHeightObj[textClass] = lineNum*lineHeight + paddingBottom + paddingTop;
          if (Object.keys(this.textHeightObj).length == this.textCount) {
            // console.log("ok", this.textHeightObj);
            this.returnHeightList()
          }
        } else {
          this.ctx.fillText(fillText, left, fillTop);
          this.drawTextLine(left, fillTop, textDecoration, color, fontSize, fillText)
        }
      // }
      
      this.ctx.restore()

      // if (bolder) {
      //   this.drawText({
      //     ...params,
      //     left: left + 0.3,
      //     top: top + 0.3,
      //     bolder: false,
      //     textDecoration: 'none' 
      //   })
      // }
    },

    returnHeightList () {
      let { width, height } = this.data;
      this.setData({
        showCanvas: false,
        isPainting: false,
        tempFileList: []
      }, () => {
        this.parent.setData({
          textHeightObj: this.textHeightObj,
        }, () => {
          // console.log('this.textHeightObj :', this.textHeightObj);
          this.textHeightObj = {};
          this.textCount = 0;
          this.textList = [];
          this.ctx.clearRect(0, 0, width, height);
          this.canDraw = true;
          this.getAllDomInfo()
        })
      })
    },

    drawTextLine (left, top, textDecoration, color, fontSize, content) {
      if (textDecoration === 'underline') {
        this.drawRect({
          background: color,
          top: top + fontSize * 1.2,
          left: left - 1,
          width: this.ctx.measureText(content).width + 3,
          height: 1
        })
      } else if (textDecoration === 'line-through') {
        this.drawRect({
          background: color,
          top: top + fontSize * 0.6,
          left: left - 1,
          width: this.ctx.measureText(content).width + 3,
          height: 1
        })
      }
    },
    drawRect (params) {
      this.ctx.save()
      const { background, top = 0, left = 0, width = 0, height = 0 } = params
      console.log('background :', background);
      this.ctx.setFillStyle(background)
      this.ctx.fillRect(left, top, width, height)
      this.ctx.restore()
    },
    drawLineDashRect (params) {
      this.ctx.save();
      const { color = '#000', top = 0, left = 0, width = 0, height = 0 } = params;
      const { width: canvasWidth } = this.data;
      this.ctx.strokeStyle = color;
      this.ctx.setLineDash([canvasWidth / 750 * 8, canvasWidth / 750 * 10], canvasWidth / 750 * 4);

      this.ctx.lineWidth = canvasWidth / 750 * 1,
      this.ctx.beginPath();
      this.ctx.moveTo(left, top);
      this.ctx.lineTo(width + left, top);
      this.ctx.lineTo(width + left, height + top);
      this.ctx.lineTo(left, height + top);
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.save();
    },
    getImageInfo (url) {
      return new Promise((resolve, reject) => {
        if (this.cache[url]) {
          resolve(this.cache[url])
        } else {
          const objExp = new RegExp(/^http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/)
          if (objExp.test(url)) {
            wx.getImageInfo({
              src: url,
              complete: res => {
                if (res.errMsg === 'getImageInfo:ok') {
                  this.cache[url] = res.path
                  resolve(res.path)
                } else {
                  this.triggerEvent('getImage', {errMsg: 'xcxCanvas:download fail'})
                  reject(new Error('getImageInfo fail'))
                }
              }
            })
          } else {
            this.cache[url] = url
            resolve(url)
          }
        }
      })
    },

    saveImageToLocal () {
      const { width, height } = this.data
      wx.canvasToTempFilePath({
        x: 0,
        y: 0,
        width,
        height,
        canvasId: 'xcxCanvas',
        complete: res => {
          console.log('ressaveImageToLocal :', res);
          if (res.errMsg === 'canvasToTempFilePath:ok') {
            this.setData({
              showCanvas: false,
              isPainting: false,
              tempFileList: []
            })
            this.canDraw = false;
            this.painting = {};
            this.triggerEvent('getImage', {tempFilePath: res.tempFilePath, errMsg: 'xcxCanvas:ok'})
            this.setData({
              posterImage: res.tempFilePath,
            }, () => {
              console.log('结束');
              wx.hideLoading()
            })
          } else {
            this.triggerEvent('getImage', {errMsg: 'xcxCanvas:fail'})
          }
        }
      }, this)
    },


    async getRect (params) {
      let {
        className,
        background = 'transparent'
      } = params;
      var { width, height, top, left } = await _getDomInfo(className);
      return {
        type: 'rect',
        className,
        background,
        top,
        left,
        width,
        height
      }
    },

    async getLineDashRect (params) {
      let {
        className,
        color = '#000'
      } = params
      var {width, height, top, left} = await _getDomInfo(className);
      return {
        type: 'lineDashRect',
        className,
        color,
        top,
        left,
        width,
        height
      };
    },

    async getImage (params) {
      let {
        className,
        url = '',
        borderRadius = 0,
      } = params;
      var { width, height, top, left } = await _getDomInfo(className);
      return {
        type: 'image',
        className,
        url,
        top,
        left,
        width,
        height,
        borderRadius,
      }
    },

    async getAvatar (params) {
      let {
        className,
        url = '',
        borderColor = 'transparent',
        borderSpacing = 0,
        borderSpacingColor = 'transparent',
      } = params;
      var { width, height, top, left } = await _getDomInfo(className);
      return {
        type: 'avatar',
        className,
        url,
        top,
        left,
        width,
        height,
        borderColor,
        borderSpacing,
        borderSpacingColor,
      }
    },

    async getText (params) {
      let {
        className,
        content,
        color = '#000',
        getTextHeight = false,
        fontSize = null,
        lineHeight = null,
        MaxLineNumber = 9999,
        backgroundColor = 'transparent',
        paddingLeft = 0,
        paddingRight = 0,
        paddingTop = 0,
        bolder = false,
        paddingBottom = 0,
      } = params;
      console.log('bolder :', bolder);
      var { width, height, top, left } = await _getDomInfo(className);
      return {
        type: 'text',
        content,
        fontSize,
        lineHeight,
        textAlign: 'left',
        top,
        left,
        MaxLineNumber,
        getTextHeight,
        className,
        width,
        height,
        backgroundColor,
        paddingLeft,
        bolder,
        paddingRight,
        paddingTop,
        paddingBottom,
        color: color ? color : '#000',
        breakWord: true,
      }
    },

    //
    
    previewImg () {
      wx.previewImage({
        current: this.data.posterImage, // 当前显示图片的http链接
        urls: [this.data.posterImage] // 需要预览的图片http链接列表
      })
    },

    openSetting () {
      let that = this;
      wx.openSetting({
        success (res) {
          console.log("res", res.authSetting)
          that.setData({
            isRefused: !res.authSetting['scope.writePhotosAlbum'],
            canSave: res.authSetting['scope.writePhotosAlbum'],  //拒绝后下次也能保存图片
          })
        },
        complete () {
          that.setData({
            isOpenSetting: false
          })
        }
      })
    },

    cancel () {
      this.setData({
        isOpenSetting: false
      })
    },

    savePoster () {
      if (!this.data.canSave && this.data.isRefused) {
        this.setData({
          isOpenSetting: true
        }, () => {
          console.log('this.data.isOpenSetting :', this.data.isOpenSetting);
        })
        return
      }
      let that = this;
      wx.saveImageToPhotosAlbum({
        filePath: this.data.posterImage,
        success: () => {
          wx.showToast({
            title: '保存成功'
          })
        },
        fail: (e) => {
          console.log('e :', e);
          that.setData({
            isRefused: true,
          })
          // wx.showToast({
          //   title: '取消保存',
          //   icon: 'none'
          // })
        }
      })
    },
    
    isTouchMove () {

    },
  },


})
