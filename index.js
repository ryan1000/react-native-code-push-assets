import {
    NativeModules
} from 'react-native';
import AssetSourceResolver from "react-native/Libraries/Image/AssetSourceResolver";
import _ from 'lodash';

let iOSRelateMainBundlePath = '';
let _sourceCodeScriptURL = '';

// ios 平台下获取 jsbundle 默认路径
const defaultMainBundePath = AssetsLoad.DefaultMainBundlePath;

/**
 * 获取 jsbundle 所在目录路径
 */
function getSourceCodeScriptURL() {
    if (_sourceCodeScriptURL) {
        return _sourceCodeScriptURL;
    }
    // 调用Native module获取 JSbundle 路径
    // RN允许开发者在Native端自定义JS的加载路径，在JS端可以调用SourceCode.scriptURL来获取 
    // 如果开发者未指定JSbundle的路径，则在离线环境下返回asset目录
    let sourceCode =
        global.nativeExtensions && global.nativeExtensions.SourceCode;
    if (!sourceCode) {
        sourceCode = NativeModules && NativeModules.SourceCode;
    }
    _sourceCodeScriptURL = sourceCode.scriptURL;
    return _sourceCodeScriptURL;
}
var AssetsLoader = {

    initAssetsLoader() {
        // 创建一个只能调用一次的函数。 重复调用返回第一次调用的结果。 func 调用时，this 绑定到创建的函数，并传入对应参数。
        var initialize = _.once(this.initAssetsLoaderInner);
        initialize();
    },

    initAssetsLoaderInner() {
        // 获取bundle目录下所有drawable 图片资源路径
        let drawablePathInfos = [];
        AssetsLoad.searchDrawableFile(getSourceCodeScriptURL(),
            (retArray) => {
                drawablePathInfos = drawablePathInfos.concat(retArray);
            });
        // hook defaultAsset方法，自定义图片加载方式
        AssetSourceResolver.prototype.defaultAsset = _.wrap(AssetSourceResolver.prototype.defaultAsset, function (func, ...args) {
            if (this.isLoadedFromServer()) {
                return this.assetServerURL();
            }
            if (Platform.OS === 'android') {
                if (this.isLoadedFromFileSystem()) {
                    // 获取图片资源路径
                    let resolvedAssetSource = this.drawableFolderInBundle();
                    let resPath = resolvedAssetSource.uri;
                    // 获取JSBundle文件所在目录下的所有drawable文件路径，并判断当前图片路径是否存在
                    // 如果存在，直接返回
                    if (drawablePathInfos.includes(resPath)) {
                        return resolvedAssetSource;
                    }
                    // 判断图片资源是否存在本地文件目录
                    let isFileExist = AssetsLoad.isFileExist(resPath);
                    // 存在直接返回
                    if (isFileExist) {
                        return resolvedAssetSource;
                    } else {
                        // 不存在，则根据资源 Id 从apk包下的drawable目录加载
                        return this.resourceIdentifierWithoutScale();
                    }
                } else {
                    // 则根据资源 Id 从apk包下的drawable目录加载
                    return this.resourceIdentifierWithoutScale();
                }

            } else {
                let iOSAsset = this.scaledAssetURLNearBundle();
                let isFileExist = AssetsLoad.isFileExist(iOSAsset.uri);
                // isFileExist = false;
                if (isFileExist) {
                    return iOSAsset;
                } else {
                    let oriJsBundleUrl = 'file://' + defaultMainBundePath + '/' + iOSRelateMainBundlePath;
                    iOSAsset.uri = iOSAsset.uri.replace(this.jsbundleUrl, oriJsBundleUrl);
                    return iOSAsset;
                }
            }
        });
    },
    
    setiOSRelateMainBundlePath(relatePath) {
        iOSRelateMainBundlePath = relatePath;
    }
}

export  default AssetsLoader;