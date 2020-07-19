import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';

const isFunction = (func: any) => {
  return Object.prototype.toString.call(func).toLowerCase() === '[object function]';
}

type IRect = Taro.getMenuButtonBoundingClientRect.Rect;

interface ISystemInfo extends Taro.getSystemInfoSync.Result {
  navBarExtendHeight: number;
  navBarHeight: number;
  capsuleInfo: IRect;
  isIos: boolean;
}

let cacheSystemInfo: ISystemInfo;

export const getSystemInfo = () => {
  if (cacheSystemInfo && !cacheSystemInfo?.isIos) {
    return cacheSystemInfo;
  } else {
    // h5环境下忽略navbar
    if (!isFunction(Taro.getSystemInfoSync)) {
      return null;
    }
    const systemInfo: ISystemInfo = {
      ...Taro.getSystemInfoSync(),
      navBarExtendHeight: 0,
      navBarHeight: 0,
      capsuleInfo: {} as IRect,
      isIos: false,
    };
    const isIos = !!(systemInfo.system.toLowerCase().search('ios') + 1);

    // 获取胶囊信息
    let rect: IRect | null = null;
    try {
      rect = Taro.getMenuButtonBoundingClientRect() || null;

      if (rect === null) {
        throw new Error('getMenuButtonBoundingClientRect error');
      }

      // 取值为0的情况  有可能width不为0 top为0的情况
      if (!rect.width || !rect.top || !rect.left || !rect.height) {
        throw 'getMenuButtonBoundingClientRect error';
      }
    } catch (error) {
      // 获取不到胶囊信息 则自定义重置一个
      let gap = 0; // 胶囊按钮上下间距 使导航内容居中
      let width = 96; // 胶囊的宽度
      if (systemInfo.platform === 'android') {
        gap = 8;
        width = 96;
      } else if (systemInfo.platform === 'devtools') {
        if (isIos) {
          gap = 5.5; //开发工具中ios手机
        } else {
          gap = 7.5; //开发工具中android和其他手机
        }
      } else {
        gap = 4;
        width = 88;
      }
      if (!systemInfo.statusBarHeight) {
        //开启wifi的情况下修复statusBarHeight值获取不到
        systemInfo.statusBarHeight = systemInfo.screenHeight - systemInfo.windowHeight - 20;
      }
      rect = {
        bottom: systemInfo.statusBarHeight + gap + 32,
        height: 32,
        left: systemInfo.windowWidth - width - 10,
        right: systemInfo.windowWidth - 10,
        top: systemInfo.statusBarHeight + gap,
        width: width,
      };
    }

    let navBarHeight = 0;
    let gap = rect.top - systemInfo.statusBarHeight;

    if (!systemInfo.statusBarHeight) {
      // 开启wifi和打电话下
      systemInfo.statusBarHeight = systemInfo.screenHeight - systemInfo.windowHeight - 20;
      navBarHeight = 2 * gap + rect.height;

      systemInfo.statusBarHeight = 0;
      systemInfo.navBarExtendHeight = 0; // 下方扩展4像素高度 防止下方边距太小
    } else {
      navBarHeight = systemInfo.statusBarHeight + 2 * gap + rect.height;

      if (isIos) {
        systemInfo.navBarExtendHeight = 4; // 下方扩展4像素高度 防止下方边距太小
      } else {
        systemInfo.navBarExtendHeight = 0;
      }
    }
    // 导航栏高度不包括statusBarHeight
    systemInfo.navBarHeight = navBarHeight;
    // 右上角胶囊按钮信息bottom: 58 height: 32 left: 317 right: 404 top: 26 width: 87 目前发现在大多机型都是固定值 为防止不一样所以会使用动态值来计算nav元素大小
    systemInfo.capsuleInfo = rect;
    systemInfo.isIos = isIos;
    cacheSystemInfo = systemInfo;

    return systemInfo;
  }
};

const getNavStyle = (systemInfo: ISystemInfo | null) => {
  if (!systemInfo) return null;
  const {
    statusBarHeight,
    navBarHeight,
    capsuleInfo,
    navBarExtendHeight,
    windowWidth,
    isIos,
  } = systemInfo;

  let menuRightDistance = windowWidth - capsuleInfo.right; // 胶囊按钮右侧到屏幕右侧的边距
  let menulefttDistance = windowWidth - capsuleInfo.left; // 胶囊按钮左侧到屏幕右侧的边距

  return {
    /**
     * 导航栏高度
     */
    navBarHeight: navBarHeight + navBarExtendHeight,
    /**
     * 导航栏高度下内边距
     */
    navBarExtendHeight,
    /**
     * 状态栏高度
     */
    statusBarHeight,
    /**
     * 胶囊按钮右侧到屏幕右侧的边距
     */
    menuRightDistance,
    /**
     * 胶囊按钮左侧到屏幕右侧的边距
     */
    menulefttDistance,
    /**
     * 胶囊位置大小信息
     */
    capsuleInfo,
    /**
     * 是否是 ios
     */
    isIos,
  };
};

let systemInfo = getSystemInfo();

export default function useNavBarStyle() {
  const [navStyle, setNavStyle] = useState(getNavStyle(systemInfo));

  useDidShow(() => {
    if (systemInfo?.isIos) {
      systemInfo = getSystemInfo();
      setNavStyle(getNavStyle(systemInfo));
    }
  });

  return navStyle;
};

