# xcxCanvas

个人基于**canvasdrawer**修改的小程序canvas组件库。解决原库**不能准确调整多行文本的高度**的问题。简化了传递方式，无需传递top、left、width、height，并新增了圆形头像、虚线方框的绘制选项，以及对文本背景色、设置文本内边距、图片圆角等的支持。

**除此之外，一并封装了获取了海报图片后的展示逻辑、保存海报的按钮及其权限开关的逻辑，免去开发者进行多余的逻辑处理。（可关闭）**

**注意： 开发者工具必须开启增强编译功能。**

## 使用

- `git clone git@github.com:TRIS-H/xcxCanvas.git` 到本地

- 把 `components` 中的 `xcxCanvas` 拷贝到自己项目下。

- 在使用页面注册组件

  ```
  {
    "usingComponents": {
      "xcxCanvas": "/components/xcxCanvas/xcxCanvas"
    }
  }
  ```

- 在页面 `**.wxml` 文件中加入如下代码

  ```
  <xcxCanvas painting="{{painting}}"/>
  ```

  **使用时，先将文本/图片渲染到wxml上，然后可传递一个json对象给painting即可，生成图片的处理已在封装中。**
  生成的画布图片里各元素的布局与wxml中元素的布局一致（多行文本可能会适当调整高度）。

  **注意点：**

  1. 多个不同样式的文本拼凑成一行时，可能需要调整字体以解决间距（目前待优化项）。
  2. **`views`数组的首个元素的`className`必须是`rect`类型的包含所有渲染元素的组件的类名，因为它的宽高将成为画布的宽高。**

- `painting` 简单展示一个例子：

  ```javascript
  {
      fontSize: 13,
      lineHeight: 23,
      getTextHeight: true,
      views: [
          {
              type: 'rect',
              className: '.my-box',
  		},
          {
              type: 'text',
              className: '.my-content',
              content: '这是需要换行的测试文本。这是需要换行的测试文本。这是需要换行的测试文本。这是需要换行的测试文本。这是需要换行的测试文本。',
              getTextHeight: true,
  		},
          {
              type: 'text',
              className: '.my-one-line-content',
              content: '这是不需换行的测试文本。',
  		},
          {
              type: 'image',
              className: '.my-image',
              url: '',
              borderRadius: 5,
  		},
          {
              type: 'rect',
              className: '.my-rect',
              url: '',   //自己选一张
              borderRadius: 5,
  		},
      ]
  }
  ```

  

## 属性

**hasSaveButton**: 是否有保存海报的按钮及其相关逻辑，默认true.

**buttonStyle**: 保存海报的按钮样式.

**promptStyle**: 提示框的标题样式.

**contentStyle**: 提示框的内容样式.

**confirmStyle**: 提示框的确定按钮样式.



## API

<details style="box-sizing: border-box; display: block; margin-top: 0px; margin-bottom: 16px;"><summary style="box-sizing: border-box; display: list-item; cursor: pointer;">对象结构一览</summary></details>

数据对象的第一层需要三个参数: `lineHeight`、`fontSize`、`getTextHeight`、`views`。配置中所有的数字都是没有单位的。

`lineHeight`、`fontSize`作用于全部字体，`getTextHeight`为true代表需要文本换行或需要n行省略，`views`是包含对象的数组。

当前可以绘制3种类型的配置: 文本`text`、图片`image`、矩形`rect`、虚线矩形框`lineDashRect`、圆形头像`avatar`。配置的属性使用的都是 `css` 的驼峰名称。

### image（图片）

| 属性            | 含义                                                 | 默认值 | 可选值 |
| --------------- | ---------------------------------------------------- | ------ | ------ |
| type(必传)      | 类型                                                 | image  |        |
| className(必传) | wxml中该image组件的独有类名                          |        |        |
| url(必传)       | 绘制的图片地址，可以是本地图片，如：`/images/1.jpeg` |        |        |
| borderRadius    | 图片圆角                                             | 0      |        |

### text（文本）

| 属性            | 含义                                                         | 默认值         | 可选值                                      |
| --------------- | ------------------------------------------------------------ | -------------- | ------------------------------------------- |
| type(必传)      | 类型                                                         | text           |                                             |
| className(必传) | wxml中该text组件的独有类名                                   |                |                                             |
| content(必传)   | 绘制文本                                                     | ''（空字符串） |                                             |
| bolder          | 字体加粗                                                     | false          |                                             |
| color           | 颜色                                                         | black          |                                             |
| backgroundColor | 背景色                                                       | transparent    |                                             |
| getTextHeight   | 是否需要换行（换行要调整文本行高）                           | true           | false                                       |
| MaxLineNumber   | 最大行数，只有设置 `breakWord: true` ，当前属性才有效，超出行数内容的显示为... | 9999           |                                             |
| fontSize        | 字体                                                         | 13             |                                             |
| lineHeight      | 行高                                                         | 23             |                                             |
| textDecoration  | 显示中划线、下划线效果                                       | none           | underline（下划线）、line-through（中划线） |
| paddingTop      | 上内边距                                                     | 0              |                                             |
| paddingRight    | 右内边距                                                     | 0              |                                             |
| paddingBottom   | 下内边距                                                     | 0              |                                             |
| paddingLeft     | 左内边距                                                     | 0              |                                             |

### rect (矩形，线条)

| 属性            | 含义                        | 默认值 | 可选值 |
| --------------- | --------------------------- | ------ | ------ |
| type(必传)      | 类型                        | rect   |        |
| className(必传) | wxml中该image组件的独有类名 |        |        |
| background      | 背景颜色                    | black  |        |

### lineDashRect (矩形虚线条)

| 属性            | 含义                       | 默认值       | 可选值 |
| --------------- | -------------------------- | ------------ | ------ |
| type(必传)      | 类型                       | lineDashRect |        |
| className(必传) | wxml中该view组件的独有类名 |              |        |
| background      | 背景颜色                   | black        |        |

### avatar (圆形头像)

**注意：对应的wxml中的image组件，mode属性必须设为 `mode="widthFix"`, 且宽度必须设为圆形头像的直径，高度不能设置。**

| 属性               | 含义                                                 | 默认值      | 可选值 |
| ------------------ | ---------------------------------------------------- | ----------- | ------ |
| type(必传)         | 类型                                                 | avatar      |        |
| className(必传)    | wxml中该image组件的独有类名                          |             |        |
| url(必传)          | 绘制的图片地址，可以是本地图片，如：`/images/1.jpeg` |             |        |
| borderSpacing      | 头像到边框的距离                                     | 0           |        |
| borderSpacingColor | 头像到边框的距离部分的颜色                           | transparent |        |
| borderColor        | 头像边框的颜色                                       | transparent |        |

# 参考

原库链接：[mp_canvas_drawer](https://github.com/kuckboy1994/mp_canvas_drawer#%E4%BD%BF%E7%94%A8)
