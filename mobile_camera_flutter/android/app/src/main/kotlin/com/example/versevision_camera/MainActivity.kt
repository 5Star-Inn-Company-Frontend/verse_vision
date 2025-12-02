package com.example.versevision_camera

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "versevision/device").setMethodCallHandler { call, result ->
            when (call.method) {
                "batteryLevel" -> {
                    val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                    val level = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                    } else {
                        val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
                        val batteryStatus = registerReceiver(null, ifilter)
                        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: 100
                        val now = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: 0
                        if (scale > 0) (now * 100) / scale else now
                    }
                    result.success(level)
                }
                "wifiRssi" -> {
                    val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                    val info = wm.connectionInfo
                    result.success(info.rssi)
                }
                else -> result.notImplemented()
            }
        }
    }
}
