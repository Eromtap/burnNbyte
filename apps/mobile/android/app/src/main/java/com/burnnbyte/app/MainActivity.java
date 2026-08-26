package com.burnnbyte.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private boolean initialPageLoaded = false;
    private static final long SPLASH_SCREEN_MAX_DURATION_MS = 10_000L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Install before activity creation so Android can replace the launch theme with the
        // normal AppCompat theme configured in styles.xml.
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);

        // BridgeActivity creates the WebView during super.onCreate(), so register this first.
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                initialPageLoaded = true;
            }
        });

        super.onCreate(savedInstanceState);

        // Keep the launch artwork up until the hosted app has rendered its first page. The
        // timeout prevents a permanently stuck splash screen if the remote page cannot load.
        splashScreen.setKeepOnScreenCondition(() -> !initialPageLoaded);
        new Handler(Looper.getMainLooper()).postDelayed(
            () -> initialPageLoaded = true,
            SPLASH_SCREEN_MAX_DURATION_MS
        );
    }
}
