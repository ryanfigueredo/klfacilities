package com.kl.adm.data.repository

import android.graphics.BitmapFactory
import android.graphics.Bitmap
import com.google.gson.Gson
import com.kl.adm.data.api.ApiConfig
import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.model.AnswerPayload
import com.kl.adm.data.model.ChecklistEscopoDetalhesResponse
import com.kl.adm.data.model.ChecklistOptionsResponse
import com.kl.adm.data.model.ChecklistRascunhoResponse
import com.kl.adm.data.model.ChecklistUnidadesResponse
import com.kl.adm.data.model.ChecklistsEmAbertoResponse
import com.kl.adm.data.model.ChecklistsPendentesResponse
import com.kl.adm.data.model.ChecklistsRespondidosResponse
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream

class ChecklistRepository {

    private val api = ApiModule.api()
    private val httpClient = ApiModule.httpClient()
    private val gson = Gson()

    suspend fun options(): Result<ChecklistOptionsResponse> = runCatching {
        api.checklistsOptions().let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar opções")
        }
    }

    suspend fun pendentes(): Result<ChecklistsPendentesResponse> = runCatching {
        api.checklistsPendentes().let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar pendentes")
        }
    }

    suspend fun emAberto(): Result<ChecklistsEmAbertoResponse> = runCatching {
        api.checklistsEmAberto().let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar em aberto")
        }
    }

    suspend fun respondidos(): Result<ChecklistsRespondidosResponse> = runCatching {
        api.checklistsRespondidos().let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar respondidos")
        }
    }

    suspend fun escopo(escopoId: String): Result<ChecklistEscopoDetalhesResponse> = runCatching {
        api.checklistEscopo(escopoId).let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar escopo")
        }
    }

    suspend fun rascunho(escopoId: String): Result<ChecklistRascunhoResponse> = runCatching {
        api.checklistRascunho(escopoId).let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar rascunho")
        }
    }

    suspend fun deleteRascunho(respostaId: String): Result<Unit> = runCatching {
        api.deleteChecklistResposta(respostaId).let { r ->
            if (!r.isSuccessful) {
                val msg = r.errorBody()?.string() ?: r.message() ?: "Erro ao excluir rascunho"
                throw Exception(msg)
            }
        }
    }

    suspend fun unidadesBanheiros(): Result<ChecklistUnidadesResponse> = runCatching {
        api.checklistUnidades().let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar unidades")
        }
    }

    /**
     * Envia checklist operacional (rascunho ou finalizado) via multipart.
     * @param escopoId obrigatório
     * @param answers lista de respostas (JSON)
     * @param observacoes opcional
     * @param isDraft true = rascunho
     * @param respostaId se atualizando rascunho
     * @param lat lng accuracy opcional
     * @param assinaturaGerenteDataUrl base64 data URL (data:image/...)
     * @param selfieFile arquivo da selfie do supervisor (JPEG)
     * @param optionalPhotoFiles mapa perguntaId -> lista de arquivos (foto_anexada_ perguntaId _ index)
     */
    suspend fun submitResposta(
        escopoId: String,
        answers: List<AnswerPayload>,
        observacoes: String? = null,
        isDraft: Boolean = false,
        respostaId: String? = null,
        lat: Double? = null,
        lng: Double? = null,
        accuracy: Double? = null,
        assinaturaGerenteDataUrl: String? = null,
        selfieFile: File? = null,
        optionalPhotoFiles: Map<String, List<File>> = emptyMap()
    ): Result<Unit> = runCatching {
        val builder = MultipartBody.Builder().setType(MultipartBody.FORM)
        builder.addFormDataPart("escopoId", escopoId)
        builder.addFormDataPart("answers", gson.toJson(answers))
        builder.addFormDataPart("observacoes", observacoes ?: "")
        builder.addFormDataPart("isDraft", if (isDraft) "true" else "false")
        respostaId?.let { builder.addFormDataPart("respostaId", it) }
        lat?.let { builder.addFormDataPart("lat", it.toString()) }
        lng?.let { builder.addFormDataPart("lng", it.toString()) }
        accuracy?.let { builder.addFormDataPart("accuracy", it.toString()) }
        assinaturaGerenteDataUrl?.let { builder.addFormDataPart("assinaturaGerenteDataUrl", it) }
        selfieFile?.let { file ->
            val body = compressImageForUpload(file) ?: file
            builder.addFormDataPart(
                "assinaturaFoto",
                body.name,
                body.asRequestBody("image/jpeg".toMediaType())
            )
        }
        optionalPhotoFiles.forEach { (perguntaId, files) ->
            files.forEachIndexed { index, file ->
                val body = compressImageForUpload(file) ?: file
                builder.addFormDataPart(
                    "foto_anexada_${perguntaId}_$index",
                    body.name,
                    body.asRequestBody("image/jpeg".toMediaType())
                )
            }
        }
        val body = builder.build()
        val request = Request.Builder()
            .url("${ApiConfig.BASE_URL}/api/checklists-operacionais/respostas")
            .post(body)
            .build()
        val response = httpClient.newCall(request).execute()
        if (!response.isSuccessful) {
            val errBody = response.body?.string() ?: response.message
            throw Exception(errBody)
        }
    }

    /**
     * Comprime imagem para upload (evita 413 Request Entity Too Large).
     * Redimensiona para no máximo 1200px no lado maior e JPEG qualidade 72%.
     */
    private fun compressImageForUpload(source: File): File? {
        return try {
            val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(source.absolutePath, opts)
            val w = opts.outWidth
            val h = opts.outHeight
            if (w <= 0 || h <= 0) return source
            val maxSide = 1200
            val sampleSize = when {
                w <= maxSide && h <= maxSide -> 1
                w >= h -> (w / maxSide).coerceAtLeast(1)
                else -> (h / maxSide).coerceAtLeast(1)
            }
            val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bitmap = BitmapFactory.decodeFile(source.absolutePath, decodeOpts) ?: return source
            val out = File.createTempFile("upload_", ".jpg")
            FileOutputStream(out).use { fos ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 72, fos)
            }
            if (!bitmap.isRecycled) bitmap.recycle()
            out
        } catch (_: Exception) {
            source
        }
    }

    /**
     * Envia checklist digital (Banheiros): unidadeId, tipo, data (JSON), foto opcional.
     */
    suspend fun submitChecklistBanheiros(
        unidadeId: String,
        tipo: String,
        dataJson: String,
        fotoFile: File? = null
    ): Result<Unit> = runCatching {
        val builder = MultipartBody.Builder().setType(MultipartBody.FORM)
        builder.addFormDataPart("unidadeId", unidadeId)
        builder.addFormDataPart("tipo", tipo)
        builder.addFormDataPart("data", dataJson)
        fotoFile?.let { file ->
            builder.addFormDataPart(
                "foto",
                file.name,
                file.asRequestBody("image/jpeg".toMediaType())
            )
        }
        val body = builder.build()
        val request = Request.Builder()
            .url("${ApiConfig.BASE_URL}/api/checklist/submit")
            .post(body)
            .build()
        val response = httpClient.newCall(request).execute()
        if (!response.isSuccessful) {
            val errBody = response.body?.string() ?: response.message
            throw Exception(errBody)
        }
    }
}
