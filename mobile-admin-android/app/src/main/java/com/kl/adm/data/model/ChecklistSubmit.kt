package com.kl.adm.data.model

/**
 * Payload de uma resposta para POST /api/checklists-operacionais/respostas
 */
data class AnswerPayload(
    val perguntaId: String,
    val tipo: String,
    val valorTexto: String? = null,
    val valorBoolean: Boolean? = null,
    val valorNumero: Double? = null,
    val valorOpcao: String? = null,
    val observacao: String? = null,
    val nota: Double? = null,
    val fotoUrl: String? = null
)
