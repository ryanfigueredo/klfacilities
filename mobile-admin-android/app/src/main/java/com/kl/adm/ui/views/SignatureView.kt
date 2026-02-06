package com.kl.adm.ui.views

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View

/**
 * View nativa para captura de assinatura. Desenha o rastro do dedo
 * e evita os problemas de coordenadas do Canvas em Compose.
 */
class SignatureView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val path = Path()
    private val paint = Paint().apply {
        isAntiAlias = true
        color = Color.BLACK
        style = Paint.Style.STROKE
        strokeJoin = Paint.Join.ROUND
        strokeCap = Paint.Cap.ROUND
        strokeWidth = 8f
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawPath(path, paint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val x = event.x
        val y = event.y

        when (event.action) {
            MotionEvent.ACTION_DOWN -> path.moveTo(x, y)
            MotionEvent.ACTION_MOVE -> path.lineTo(x, y)
            MotionEvent.ACTION_UP -> { /* opcional: pode finalizar path aqui */ }
            else -> return false
        }
        invalidate()
        return true
    }

    /** Limpa a assinatura. */
    fun clearCanvas() {
        path.reset()
        invalidate()
    }

    /** Retorna true se há traço na tela. */
    fun hasSignature(): Boolean = !path.isEmpty

    /**
     * Converte a assinatura em Bitmap (fundo branco).
     * Use para enviar à API em Base64.
     */
    fun getSignatureBitmap(): android.graphics.Bitmap {
        val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
        val c = Canvas(bitmap)
        c.drawColor(Color.WHITE)
        c.drawPath(path, paint)
        return bitmap
    }
}
