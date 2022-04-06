/* 整个文件主要把绝对路径修改为相对路径 */
import { ItemType } from './get-file'
import fs from 'fs'
import path from 'path'
import createDebugger from 'debug'
const debug = createDebugger('change-path')
debug.enabled = true
/**
 * @desc: 递归循环所有文件
 * @author: majun
 * @param {Array} nodes      整个文件的nodes
 * @param {string} rootPath  根路径
 */
export function changePath(nodes: Array<ItemType>, rootPath: string) {
  function getNode(nodes: Array<ItemType>) {
    for (let index = 0; index < nodes.length; index++) {
      const ele = nodes[index]
        if (ele.children) {
          getNode(ele.children)
        } else {
          // TODO 这里先写死绝对转相对, 后面如果想相对都转绝对, 可以改这里
          witeFile(rootPath, ele, true)
        }
    }
    // nodes.forEach((ele) => {
    //   if (ele.children) {
    //     getNode(ele.children)
    //   } else {
    //     // TODO 这里先写死绝对转相对, 后面如果想相对都转绝对, 可以改这里
    //     witeFile(rootPath, ele, true)
    //   }
    // })
  }
  getNode(nodes)
}

/**
 * @desc:  写文件
 * @author: majun
 * @param {string} rootPath  根地址
 * @param {string} file  目标地址
 */
 function witeFile(rootPath: string, node: ItemType, isRelative?: Boolean) {
  const { fullPath, imports = [] } = node
  let fileStr = fs.readFileSync(fullPath, 'utf-8')
  let writeFlag = false // 如果啥都没改, 不更新文件
  // fileStr = '// 我加注释 \n' + fileStr
  const sarr = fileStr.split(/[\n]/g)
  for (let index = 0; index < sarr.length; index++) {
    const ele = sarr[index]
    // 注释的不转,其他公共也不转
    const ignore = ['//', '@xiwicloud/components', '@xiwicloud/lims', '@handsontable/vue']
    const flag = ignore.some((item) => ele.indexOf(item) > -1)
    const reg = /import.*[\"|\'](.*)[\'|\"]/
    // 这里只收集组件依赖, 插件依赖排除掉
    if (!flag && ele.indexOf('/') > -1) {
      const impStr = ele.match(reg)
      // 没有import的不转
      if (impStr && impStr[1]) {
        // 依赖的具体名字
        let filePath = impStr[1]
        // 准备修改的名字
        let changeName = filePath
        // 如果有@符号的
        if (isRelative) {
          if (filePath.indexOf('@') > -1) {
            // debug(filePath)
            let absolute = filePath.replace('@', rootPath)
            // 下面统一路径格式,否则求位置不灵
            absolute = absolute.replace(/\\/g, '/')
            const fullpathNew = fullPath.replace(/\\/g, '/')
            let relatPath = absoluteTorelative(absolute, fullpathNew)
            debug('路径转换: ', absolute, fullpathNew)
            debug('relatPath: ', relatPath)
            // 把改好的替换回去
            changeName = relatPath
            sarr[index] = ele.replace(filePath, relatPath)
            writeFlag = true
          }
          let absolutetPath = relativeToabsolute(changeName, fullPath)
           debug('absolutetPath: ', absolutetPath)
          changeName = absolutetPath
          const i = absolutetPath.lastIndexOf('.')
          const lastName = absolutetPath.substring(i)
          debug('lastName: ', lastName)
          debug('changeName: ', changeName)
          // 假如没有后缀,补上--后缀名不可能大于10
          // if (lastName.length > 10) {
            debug('待补全的文件: ', changeName)
            // 获取绝对路径
            const suffix = ['.js', '.vue', '/index.js', '/index.vue']
            for (let j = 0; j < suffix.length; j++) {
              const fixStr = suffix[j]
              if (fs.existsSync(absolutetPath + fixStr)) {
                // 把改好的替换回去
                debug('补全的文件: ', absolutetPath + fixStr)
                changeName = absolutetPath + fixStr
                // 写进去
                let relat = ele.match(reg)
                if (relat && relat[1]) {
                  debug('relat[1]: ', relat[1], ele)
                  // 重新把相对路径写进代码去
                  sarr[index] = ele.replace(relat[1], relat[1] + fixStr)
                  debug('sarr[index] 11', sarr[index])
                }
                break
              }
            }
            debug('sarr[index] 333', sarr[index])
            writeFlag = true
          // }
        }
        // debug('sarr[index]222 ', sarr[index])
        debug('收集依赖: ', changeName, fullPath)
        imports.push(changeName)
        // 相对路径改绝对路径没有应用场景, 这里只是做测试
        // else {
        //   if (filePath.indexOf('@') === -1 && (filePath.indexOf('./') > -1 || filePath.indexOf('../') > -1)) {
        //     let absolutetPath = relativeToabsolute(filePath, fullPath)
        //     debug(absolutetPath)
        //     // 把改好的替换回去
        //     sarr[index] = absolutetPath
        //     // writeFlag = true
        //   }
        // }
      }
    }
  }

  if (writeFlag) {
    fileStr = sarr.join('\n')
    // 异步写入数据到文件
    // debug(fileStr)
    fs.writeFile(fullPath, fileStr, { encoding: 'utf8' }, () => {
      console.log('Write successful-------' + fullPath)
    })
  }
}

/**
 * @desc: 绝对路径转相对路径
 * @author: majun
 * @param {*} fileAbsolute 待处理的绝对路径
 * @param {*} absolute
 */
function absoluteTorelative(fileAbsolute: string, absolute: string) {
  var rela = fileAbsolute.split('/')
  rela.shift()
  var abso = absolute.split('/')
  abso.shift()

  var num = 0

  for (var i = 0; i < rela.length; i++) {
    if (rela[i] === abso[i]) {
      num++
    } else {
      break
    }
  }

  rela.splice(0, num)
  abso.splice(0, num)

  var str = ''

  for (var j = 0; j < abso.length - 1; j++) {
    str += '../'
  }

  if (!str) {
    str += './'
  }

  str += rela.join('/')

  return str
}

/**
 * @desc: 相对路径转绝对路径
 * @author: majun
 *     let a = '../c/d/main.js'
    let b = '/a/b/zhangjing/index.js'
 * @param {string} relative
 * @param {string} absolute
 */
export function relativeToabsolute(relative: string, absolute: string) {
  debug('relativeToabsolute:----relative:', relative)
    debug('relativeToabsolute:----absolute:', absolute)
  const reg = /\\|\//g //用 \或者 / 进行分割
  let rela = relative.split(reg)
  let abso = absolute.split(reg)
  // debug(rela, 'rela')
  // debug(abso, 'abso')
  for (let j = 0; j < rela.length - 1; j++) {
    if (rela[j] === '..') {
      abso.pop()
      abso.pop()
      rela.shift()
    } else if (rela[j] === '.') {
      abso.pop()
      rela.shift()
      break
    }
  }
  let str = abso.join('\\') + '\\' + rela.join('\\')
  return str
}

/**
 * @description: Write the result to JS file 把结果写入到js文件
 * @param {data}  要写的数据
 * @return {fileName}  要写入文件地址
 */
export function wirteJsNodes(data: string, filePath: string) {
  const file = path.resolve(__dirname, filePath)
  const pre = 'export default'
  // 异步写入数据到文件
  fs.writeFile(file, pre + data, { encoding: 'utf8' }, (err) => {
    console.error(err)
  })
}
