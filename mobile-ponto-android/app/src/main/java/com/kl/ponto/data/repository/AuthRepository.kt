package com.kl.ponto.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.kl.ponto.data.model.Funcionario
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "ponto_auth")
private val gson = Gson()

class AuthRepository(private val context: Context) {

    private val funcionarioKey = stringPreferencesKey("funcionario_json")

    suspend fun saveFuncionario(funcionario: Funcionario) {
        context.dataStore.edit { prefs ->
            prefs[funcionarioKey] = gson.toJson(funcionario)
        }
    }

    suspend fun getFuncionario(): Funcionario? {
        val json = context.dataStore.data.map { it[funcionarioKey] }.first() ?: return null
        return try {
            gson.fromJson(json, Funcionario::class.java)
        } catch (_: Exception) {
            null
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
