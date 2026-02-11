package com.kl.ponto

import android.app.Application
import com.kl.ponto.data.api.ApiModule

class KLPontoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ApiModule.init()
    }
}
