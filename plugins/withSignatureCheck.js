const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULE_KT = `package com.birakgitsin.app

import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.MessageDigest

class SignatureCheckModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "SignatureCheck"

    @ReactMethod
    fun getSignatureSha256(): String {
        return try {
            val pm = reactApplicationContext.packageManager
            val packageName = reactApplicationContext.packageName
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val info = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
                info.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                val info = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
                info.signatures
            }
            val first = signatures?.firstOrNull() ?: return ""
            val digest = MessageDigest.getInstance("SHA-256").digest(first.toByteArray())
            digest.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            ""
        }
    }
}
`;

const PACKAGE_KT = `package com.birakgitsin.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SignatureCheckPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(SignatureCheckModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

/**
 * İmza parmak izini okuyan native modülü prebuild sırasında yazar ve
 * MainApplication.kt içine kaydeder. R8 keep kuralları proguard append
 * dosyasındadır; sınıflar minify sırasında silinmez.
 */
module.exports = function withSignatureCheck(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', 'com', 'birakgitsin', 'app',
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SignatureCheckModule.kt'), MODULE_KT, 'utf8');
      fs.writeFileSync(path.join(dir, 'SignatureCheckPackage.kt'), PACKAGE_KT, 'utf8');
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    const marker = 'add(SignatureCheckPackage())';
    if (cfg.modResults.contents.includes(marker)) return cfg;
    const anchor = '          // add(MyReactNativePackage())';
    if (!cfg.modResults.contents.includes(anchor)) {
      throw new Error('MainApplication.kt: SignatureCheckPackage ekleme anchorı bulunamadı.');
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      anchor,
      `${anchor}\n          ${marker}`,
    );
    return cfg;
  });

  return config;
};
