package com.kl.ponto.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.kl.ponto.R
import com.kl.ponto.data.repository.AuthRepository
import java.util.Calendar

private val REMINDER_HOURS = setOf(7, 12, 13, 17) // manhã, almoço, 13h (teste), tarde

class ReminderWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val authRepo = AuthRepository(applicationContext)
        val cal = Calendar.getInstance()
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        if (hour !in REMINDER_HOURS) return Result.success()
        val slot = "${cal.get(Calendar.YEAR)}-${cal.get(Calendar.MONTH) + 1}-${cal.get(Calendar.DAY_OF_MONTH)}-$hour"
        if (authRepo.getLastReminderSlot() == slot) return Result.success()
        authRepo.setLastReminderSlot(slot)

        ensureChannel(applicationContext)
        val nome = authRepo.getFuncionario()?.nome
        val title = applicationContext.getString(R.string.notification_reminder_title)
        val text = if (!nome.isNullOrBlank()) {
            applicationContext.getString(R.string.notification_reminder_text_named, nome.trim())
        } else {
            applicationContext.getString(R.string.notification_reminder_text_generic)
        }
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(applicationContext).notify(NOTIFICATION_ID, notification)
        } catch (_: SecurityException) { }
        return Result.success()
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = context.getString(R.string.notification_channel_description) }
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "ponto_reminder_channel"
        const val NOTIFICATION_ID = 1001
    }
}
