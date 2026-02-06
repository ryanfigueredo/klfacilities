package com.kl.adm.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.kl.adm.MainActivity
import com.kl.adm.data.model.PontoNotificationData

class FcmService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Token será registrado após login
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // Verificar se a mensagem contém dados
        remoteMessage.data.isNotEmpty().let {
            val data = remoteMessage.data
            val tipo = data["tipo"] ?: "PONTO_BATIDO"
            
            when (tipo) {
                "PONTO_BATIDO" -> {
                    val registroId = data["registroId"] ?: return
                    val funcionarioId = data["funcionarioId"] ?: return
                    val funcionarioNome = data["funcionarioNome"] ?: return
                    val tipoPonto = data["tipoPonto"] ?: return
                    val timestamp = data["timestamp"] ?: return
                    val unidadeNome = data["unidadeNome"] ?: return
                    val protocolo = data["protocolo"]
                    
                    val pontoData = PontoNotificationData(
                        registroId = registroId,
                        funcionarioId = funcionarioId,
                        funcionarioNome = funcionarioNome,
                        tipo = tipoPonto,
                        timestamp = timestamp,
                        unidadeNome = unidadeNome,
                        protocolo = protocolo
                    )
                    
                    showPontoNotification(remoteMessage.notification?.title ?: "Ponto Batido", 
                                        remoteMessage.notification?.body ?: "$funcionarioNome bateu ponto", 
                                        pontoData)
                }
                else -> {
                    // Notificação genérica
                    remoteMessage.notification?.let { notification ->
                        showGenericNotification(notification.title ?: "Notificação", notification.body ?: "")
                    }
                }
            }
        }

        // Verificar se a mensagem contém notificação
        remoteMessage.notification?.let {
            // Notificação genérica se não tiver dados específicos
            if (remoteMessage.data.isEmpty()) {
                showGenericNotification(it.title ?: "Notificação", it.body ?: "")
            }
        }
    }

    private fun showPontoNotification(title: String, body: String, pontoData: PontoNotificationData) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Criar canal de notificação (necessário para Android 8.0+)
        createNotificationChannel(notificationManager)

        // Intent para abrir a tela de detalhes do ponto
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("notification_type", "PONTO_BATIDO")
            putExtra("registro_id", pontoData.registroId)
            putExtra("funcionario_id", pontoData.funcionarioId)
            putExtra("funcionario_nome", pontoData.funcionarioNome)
            putExtra("tipo", pontoData.tipo)
            putExtra("timestamp", pontoData.timestamp)
            putExtra("unidade_nome", pontoData.unidadeNome)
            putExtra("protocolo", pontoData.protocolo)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            pontoData.registroId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(pontoData.registroId.hashCode(), notification)
    }

    private fun showGenericNotification(title: String, body: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel(notificationManager)

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createNotificationChannel(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_DESCRIPTION
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    companion object {
        private const val CHANNEL_ID = "ponto_notifications"
        private const val CHANNEL_NAME = "Notificações de Ponto"
        private const val CHANNEL_DESCRIPTION = "Notificações quando colaboradores batem ponto"
    }
}
